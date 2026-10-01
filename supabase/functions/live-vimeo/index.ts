import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';
import {
  VimeoClient,
  approvedDomains,
  safeVimeoEmbedUrl,
  safeVimeoUploadUrl,
  videoState,
  recordingDownload,
} from './vimeo.ts';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authorization = request.headers.get('authorization') || '';
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: identity, error: authError } = await user.auth.getUser();
    if (authError || !identity.user) return json({ error: 'Sign in required.' }, 401);
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const { data: actor } = await service
      .from('users')
      .select('status,role,name')
      .eq('id', identity.user.id)
      .single();
    if (actor?.status !== 'active') return json({ error: 'An active account is required.' }, 403);
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid request.' }, 400);
    }
    const token = Deno.env.get('VIMEO_ACCESS_TOKEN');
    const domainSetting =
      Deno.env.get('VIMEO_ALLOWED_DOMAINS') || 'eduway.academy,www.eduway.academy';
    if (body.action === 'status') {
      const { data: teacher } = await service
        .from('live_teachers')
        .select('id')
        .eq('user_id', identity.user.id)
        .maybeSingle();
      if (!['admin', 'secretary', 'editor'].includes(actor.role) && !teacher)
        return json({ error: 'Teacher or admin access required.' }, 403);
      if (!token) return json({ configured: false, provider: 'vimeo', downloadsSupported: false });
      const account = await new VimeoClient(token).api('/me?fields=account,upload_quota.space');
      return json({
        configured: true,
        provider: 'vimeo',
        accountPlan: account.account,
        storage: {
          used: Number(account.upload_quota?.space?.used) || 0,
          free: Number(account.upload_quota?.space?.free) || 0,
          max: Number(account.upload_quota?.space?.max) || 0,
        },
        downloadsSupported: [
          'standard',
          'advanced',
          'pro',
          'business',
          'premium',
          'enterprise',
        ].includes(account.account),
      });
    }
    const auditDeletion = async (id: string) => {
      const { error } = await service
        .from('audit_logs')
        .insert({
          action: 'asset_deletion_requested',
          entity_type: 'asset',
          entity_id: id,
          admin_id: identity.user.id,
          admin_name: actor.name || 'Staff',
          description: 'Permanent Vimeo deletion requested',
        });
      if (error) throw new Error('Could not record the deletion request. Please retry.');
    };
    const assetInfo = async (id: string, manage = false) => {
      const { data, error } = await user.rpc('live_asset_info', { p_id: id, p_manage: manage });
      if (error || !data || data.provider !== 'vimeo')
        throw new Error('This recording is not available to this account.');
      return data;
    };
    // Removal is always possible inside Eduway even while the Vimeo token is missing.
    if (body.action === 'remove') {
      if (!uuid(body.assetId)) return json({ error: 'Recording ID required.' }, 400);
      await assetInfo(body.assetId, true);
      const { error } = await user.rpc('remove_live_asset', { p_id: body.assetId });
      if (error) throw new Error(error.message);
      // Keep the original on Vimeo as an archive. This avoids deleting a video used
      // elsewhere and requires no destructive account permission in the UI.
      return json({ removed: true });
    }
    if (!token)
      return json(
        {
          error:
            'Vimeo upload is not configured. An administrator must add VIMEO_ACCESS_TOKEN to the server secrets.',
          code: 'VIMEO_NOT_CONFIGURED',
        },
        503
      );
    const vimeo = new VimeoClient(token);
    if (body.action === 'cleanup') {
      if (
        !['admin', 'secretary'].includes(actor.role) ||
        !Array.isArray(body.assetIds) ||
        body.assetIds.length > 10 ||
        !body.assetIds.every(uuid)
      )
        return json({ error: 'Choose up to ten eligible recordings.' }, 403);
      const results = [];
      for (const id of body.assetIds) {
        const { data: uri, error } = await service.rpc('claim_live_recording_cleanup', {
          p_asset: id,
        });
        if (error) {
          results.push({ id, error: error.message });
          continue;
        }
        if (!uri) {
          results.push({ id, deleted: true });
          continue;
        }
        try {
          await auditDeletion(id);
          await vimeo.api(uri, 'DELETE');
          const { error: hidden } = await service
            .from('live_assets')
            .update({ state: 'removed' })
            .eq('id', id);
          if (hidden)
            throw new Error('Vimeo deletion completed; retry to finish updating the library.');
          const { error: saved } = await service
            .from('live_vimeo_uploads')
            .update({
              deleted_at: new Date().toISOString(),
              delete_pending: false,
              upload_url: null,
              embed_url: null,
            })
            .eq('asset_id', id);
          if (saved) throw new Error('Deletion completed; retry to update the cleanup record.');
          results.push({ id, deleted: true });
        } catch (e) {
          results.push({ id, error: (e as Error).message });
        }
      }
      return json({ results });
    }
    if (typeof body.action === 'string' && body.action.startsWith('media_')) {
      if (body.action === 'media_create') {
        const { data: asset, error } = await user.rpc('prepare_managed_video', {
          p_kind: body.kind,
          p_teacher: body.teacherId || null,
          p_course: body.courseId || null,
          p_lesson: body.lessonId || null,
          p_title: body.title,
          p_filename: body.filename,
          p_bytes: body.bytes,
          p_mime: body.mime,
        });
        if (error) throw new Error(error.message);
        let videoUri: string | undefined;
        try {
          const video = await vimeo.create(
            asset.title,
            asset.byte_size,
            approvedDomains(domainSetting)
          );
          videoUri = video.uri;
          const { error: saved } = await service
            .from('managed_videos')
            .update({ video_uri: video.uri })
            .eq('id', asset.id);
          if (saved) throw new Error('Could not save upload.');
          return json({ asset, uploadUrl: safeVimeoUploadUrl(video.upload?.upload_link) });
        } catch (e) {
          if (videoUri) await vimeo.api(videoUri, 'DELETE').catch(() => undefined);
          await service.from('managed_videos').update({ state: 'error' }).eq('id', asset.id);
          throw e;
        }
      }
      if (!uuid(body.assetId)) return json({ error: 'Video ID required.' }, 400);
      const manage = body.action !== 'media_play';
      const check = async () => {
        const { data, error } = await user.rpc('managed_video_info', {
          p_id: body.assetId,
          p_manage: manage,
        });
        if (error || !data) throw new Error('Video unavailable to this account.');
        return data;
      };
      const asset = await check();
      const { data: row } = await service
        .from('managed_videos')
        .select('video_uri,embed_url,state')
        .eq('id', body.assetId)
        .single();
      if (body.action === 'media_remove') {
        await auditDeletion(body.assetId);
        const { error: claimed } = await service
          .from('managed_videos')
          .update({ state: 'removed', delete_pending: !!row?.video_uri })
          .eq('id', body.assetId);
        if (claimed) throw new Error('Could not queue video deletion.');
        if (row?.video_uri) await vimeo.api(row.video_uri, 'DELETE');
        const { error: removed } = await service
          .from('managed_videos')
          .update({ video_uri: null, embed_url: null, delete_pending: false })
          .eq('id', body.assetId);
        if (removed) throw new Error('Vimeo video deleted; retry to finish cleanup.');
        return json({ removed: true });
      }
      if (asset.state === 'removed' || !row?.video_uri) throw new Error('Video unavailable.');
      const video = await vimeo.get(row.video_uri);
      let state = videoState(video);
      if (video.upload?.size != null && Number(video.upload.size) !== Number(asset.byte_size))
        state = 'error';
      const embed =
        state === 'ready' ? safeVimeoEmbedUrl(video.player_embed_url, row.video_uri) : null;
      const { error: saved } = await service
        .from('managed_videos')
        .update({ state, embed_url: embed })
        .eq('id', body.assetId)
        .neq('state', 'removed');
      if (saved) throw new Error('Could not update processing status.');
      await check();
      if (body.action === 'media_play' && state !== 'ready')
        throw new Error('Video is still processing.');
      return json({ state, ...(state === 'ready' ? { url: embed } : {}) });
    }
    if (body.action === 'download') {
      if (!uuid(body.assetId)) return json({ error: 'Recording ID required.' }, 400);
      const access = async () => {
        const { data, error } = await user.rpc('live_recording_download_info', {
          p_id: body.assetId,
        });
        if (error || !data || data.provider !== 'vimeo')
          throw new Error(
            'Recording download access has expired or is not available to this account.'
          );
        return data;
      };
      await access();
      const { data: row } = await service
        .from('live_vimeo_uploads')
        .select('video_uri')
        .eq('asset_id', body.assetId)
        .single();
      if (!row) return json({ error: 'Recording is not ready.' }, 409);
      let video = await vimeo.api(`${row.video_uri}?fields=uri,privacy,download`);
      if (video.privacy?.download === false) {
        await vimeo.api(row.video_uri, 'PATCH', { privacy: { download: true } });
        video = await vimeo.api(`${row.video_uri}?fields=uri,download`);
      }
      const result = recordingDownload(video);
      await access();
      // Only the authorized, expiring download capability is returned, never account credentials.
      return json(result);
    }
    if (body.action === 'create') {
      if (!uuid(body.bookingId)) return json({ error: 'Choose a past lesson.' }, 400);
      const domains = approvedDomains(domainSetting);
      const { data: asset, error } = await user.rpc('prepare_live_asset', {
        p_kind: 'recording',
        p_course: null,
        p_booking: body.bookingId,
        p_title: body.title,
        p_filename: body.filename,
        p_mime: body.mime,
        p_bytes: body.bytes,
      });
      if (error) return json({ error: error.message }, 403);
      let videoUri: string | undefined;
      try {
        const video = await vimeo.create(asset.title, asset.byte_size, domains);
        videoUri = video.uri;
        const uploadUrl = safeVimeoUploadUrl(video.upload?.upload_link);
        const { error: saved } = await service
          .from('live_vimeo_uploads')
          .insert({ asset_id: asset.id, video_uri: video.uri, upload_url: uploadUrl });
        if (saved) throw new Error('Could not save the Vimeo upload. Please retry.');
        return json({ asset, uploadUrl });
      } catch (err) {
        if (videoUri) await vimeo.api(videoUri, 'DELETE').catch(() => undefined);
        await service.from('live_assets').update({ state: 'error' }).eq('id', asset.id);
        throw err;
      }
    }
    if (body.action === 'sync' || body.action === 'play') {
      const ids = body.action === 'play' ? [body.assetId] : body.assetIds;
      if (!Array.isArray(ids) || !ids.length || ids.length > 5 || !ids.every(uuid))
        return json({ error: 'Provide up to five recording IDs.' }, 400);
      const results = [];
      for (const id of ids) {
        const asset = await assetInfo(id);
        if (asset.state === 'removed') throw new Error('This recording has been removed.');
        const { data: row } = await service
          .from('live_vimeo_uploads')
          .select('video_uri,last_checked_at,embed_url')
          .eq('asset_id', id)
          .maybeSingle();
        if (!row) {
          results.push({ id, state: asset.state });
          continue;
        }
        let state = asset.state,
          embedUrl = row.embed_url;
        const stale = !row.last_checked_at || Date.parse(row.last_checked_at) < Date.now() - 30000;
        if (stale) {
          // Claim a short refresh window so several group members do not all poll Vimeo.
          let claim = service
            .from('live_vimeo_uploads')
            .update({ last_checked_at: new Date().toISOString() })
            .eq('asset_id', id);
          claim = row.last_checked_at
            ? claim.eq('last_checked_at', row.last_checked_at)
            : claim.is('last_checked_at', null);
          const { data: claimed } = await claim.select('asset_id');
          if (claimed?.length) {
            try {
              const video = await vimeo.get(row.video_uri);
              state = videoState(video);
              if (
                video.upload?.size != null &&
                Number(video.upload.size) !== Number(asset.byte_size)
              )
                state = 'error';
              embedUrl =
                state === 'ready' ? safeVimeoEmbedUrl(video.player_embed_url, row.video_uri) : null;
              const { error: metadataError } = await service
                .from('live_vimeo_uploads')
                .update({
                  embed_url: embedUrl,
                  error: state === 'error' ? 'Vimeo processing or privacy check failed.' : null,
                })
                .eq('asset_id', id);
              if (metadataError) throw new Error('Could not save Vimeo processing status.');
              const { error: assetError } = await service
                .from('live_assets')
                .update({
                  state,
                  ...(state === 'ready'
                    ? { published_at: asset.published_at || new Date().toISOString() }
                    : {}),
                })
                .eq('id', id)
                .neq('state', 'removed');
              if (assetError) throw new Error('Could not save recording status.');
            } catch (err) {
              await service
                .from('live_vimeo_uploads')
                .update({ last_checked_at: null })
                .eq('asset_id', id);
              throw err;
            }
          }
        }
        if (body.action === 'play') {
          // Recheck membership after any network calls (enrollment may have been revoked).
          const current = await assetInfo(id);
          if (current.state !== 'ready' || state !== 'ready' || !embedUrl)
            return json(
              {
                error:
                  'Vimeo is still processing this recording, or processing failed. Please try again later.',
              },
              409
            );
          return json({ url: safeVimeoEmbedUrl(embedUrl, row.video_uri) });
        }
        results.push({ id, state });
      }
      return json({ recordings: results });
    }
    return json({ error: 'Unknown Vimeo action.' }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Could not complete the Vimeo request.' },
      400
    );
  }
});
