import { Resolver } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { isIP } from 'node:net';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const hosts = ['eduway.academy', 'www.eduway.academy'];
const redirects = new Set([301, 302, 307, 308]);

export function assessResponse(result, now = Date.now()) {
  if (result.error) return [`${result.error.code}: ${result.error.message}`];
  const issues = [];
  const url = new URL(result.url);
  const expectedRedirect =
    url.protocol === 'http:'
      ? `https://${url.hostname}/`
      : url.hostname === hosts[0]
        ? `https://${hosts[1]}/`
        : null;
  if (expectedRedirect) {
    if (!redirects.has(result.status) || result.headers.location !== expectedRedirect) {
      issues.push(`Unexpected redirect: ${result.status} ${result.headers.location || '(none)'}`);
    }
  } else {
    if (result.status !== 200) issues.push(`Homepage returned ${result.status}`);
    if (!result.headers['content-type']?.includes('text/html')) issues.push('Homepage is not HTML');
    if (!result.homepageRecognized) issues.push('Eduway title or application root is missing');
  }
  if (url.protocol === 'https:') {
    const cert = result.certificate;
    if (!cert?.authorized) issues.push('TLS validation did not succeed');
    const expires = Date.parse(cert?.validTo);
    const starts = Date.parse(cert?.validFrom);
    if (!Number.isFinite(expires) || !Number.isFinite(starts))
      issues.push('Certificate dates unavailable');
    else {
      if (starts > now) issues.push('Certificate is not yet valid');
      if (expires <= now) issues.push('Certificate expired');
      else if (expires - now < 14 * 86400000) issues.push('Certificate expires within 14 days');
    }
    if (!/max-age=[1-9]\d*/i.test(result.headers['strict-transport-security'] || '')) {
      issues.push('HSTS is missing or disabled');
    }
  }
  return issues;
}

export function probe(url, address) {
  return new Promise((resolveResult) => {
    const started = Date.now();
    const target = new URL(url);
    const result = { url, address: address || 'system', headers: {} };
    // Keep the hostname for SNI and certificate verification while testing each IP.
    const lookup = address
      ? (_host, options, callback) => {
          const record = { address, family: isIP(address) };
          if (options.all) callback(null, [record]);
          else callback(null, record.address, record.family);
        }
      : undefined;
    const client = target.protocol === 'https:' ? https : http;
    const request = client.get(
      target,
      {
        agent: false,
        lookup,
        rejectUnauthorized: true,
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'Eduway-Security-Diagnostic/1.0', Accept: 'text/html' },
      },
      (response) => {
        result.status = response.statusCode;
        result.remoteAddress = response.socket.remoteAddress;
        // Store only diagnostic response headers, never cookies or page contents.
        for (const key of [
          'location',
          'content-type',
          'strict-transport-security',
          'x-vercel-id',
          'x-vercel-cache',
          'server',
          'etag',
          'date',
        ]) {
          if (response.headers[key]) result.headers[key] = response.headers[key];
        }
        if (target.protocol === 'https:') {
          const cert = response.socket.getPeerCertificate();
          result.certificate = {
            authorized: response.socket.authorized,
            issuer: cert.issuer?.CN,
            subject: cert.subject?.CN,
            subjectAltName: cert.subjectaltname,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            fingerprint256: cert.fingerprint256,
            protocol: response.socket.getProtocol(),
          };
        }
        const chunks = [];
        let length = 0;
        response.on('data', (chunk) => {
          length += chunk.length;
          if (length > 256 * 1024) {
            request.destroy(new Error('Homepage response exceeds diagnostic size limit'));
          } else chunks.push(chunk);
        });
        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          result.homepageRecognized = /<title>Eduway\b/i.test(body) && /id=["']root["']/.test(body);
          result.elapsedMs = Date.now() - started;
          resolveResult(result);
        });
        response.on('error', (error) => request.destroy(error));
      }
    );
    request.on('error', (error) => {
      result.error = { code: error.code || 'REQUEST_FAILED', message: error.message };
      result.elapsedMs = Date.now() - started;
      resolveResult(result);
    });
  });
}

async function resolveAddresses(host, server) {
  const resolver = new Resolver({ timeout: 2500, tries: 1 });
  if (server !== 'system') resolver.setServers([server]);
  const records = [];
  for (const family of [4, 6]) {
    try {
      const addresses = await resolver[family === 4 ? 'resolve4' : 'resolve6'](host);
      records.push({ host, server, family, addresses });
    } catch (error) {
      // No AAAA record is valid; resolver failures and NXDOMAIN are kept distinct.
      records.push({ host, server, family, addresses: [], error: error.code });
    }
  }
  return records;
}

export async function runChecks() {
  const startedAt = new Date().toISOString();
  const dns = [];
  for (const host of hosts) {
    const results = await Promise.allSettled(
      ['system', '1.1.1.1', '8.8.8.8'].map((server) => resolveAddresses(host, server))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') dns.push(...result.value);
      else throw result.reason;
    }
  }
  const probes = [];
  for (const host of hosts) {
    probes.push([`http://${host}/`], [`https://${host}/`]);
    const addresses = new Set(
      dns.filter((entry) => entry.host === host).flatMap((entry) => entry.addresses)
    );
    for (const address of addresses) probes.push([`https://${host}/`, address]);
  }
  const results = await Promise.allSettled(probes.map((args) => probe(...args)));
  const checks = results.map((result, index) => {
    const check =
      result.status === 'fulfilled'
        ? result.value
        : {
            url: probes[index][0],
            address: probes[index][1] || 'system',
            error: { code: 'PROBE_FAILED', message: String(result.reason) },
          };
    return { ...check, issues: assessResponse(check) };
  });
  const dnsIssues = dns
    .filter((entry) => entry.error && entry.error !== 'ENODATA')
    .map((entry) => `${entry.host} ${entry.server} IPv${entry.family}: ${entry.error}`);
  for (const host of hosts) {
    if (!dns.some((entry) => entry.host === host && entry.addresses.length)) {
      dnsIssues.push(`${host}: no addresses resolved`);
    }
  }
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: !dnsIssues.length && checks.every((check) => !check.issues.length),
    reputation:
      'Not assessed. HTTPS success does not rule out Safe Browsing or SmartScreen warnings.',
    dns,
    dnsIssues,
    checks,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await runChecks();
  const directory = fileURLToPath(new URL('../output/security/', import.meta.url));
  await mkdir(directory, { recursive: true });
  const filename = `${report.startedAt.replace(/[:.]/g, '-')}.json`;
  const json = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(resolve(directory, filename), json);
  await writeFile(resolve(directory, 'latest.json'), json);
  console.log(
    `${report.ok ? 'PASS' : 'FAIL'}: ${report.checks.length} HTTP/TLS checks. ${report.reputation}`
  );
  for (const issue of report.dnsIssues) console.error(`DNS: ${issue}`);
  for (const check of report.checks) {
    for (const issue of check.issues) console.error(`${check.url} [${check.address}]: ${issue}`);
  }
  console.log(`Evidence: ${resolve(directory, filename)}`);
  process.exitCode = report.ok ? 0 : 1;
}
