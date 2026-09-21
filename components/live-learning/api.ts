import { supabaseAny as db } from '../../lib/supabase';
import type { Teacher, Booking, GroupSession } from './model';
export type ProgramSettings = {
  program: string;
  group_capacity: number;
  notice_minutes: number;
  buffer_minutes: number;
  cancellation_hours: number | null;
  recording_days: number;
};
export type Workspace = {
  teachers: Teacher[];
  bookings: Booking[];
  selections: Record<string, string>;
  settings: Record<string, ProgramSettings>;
  ownTeacherId: string | null;
};
export type Availability = { times: string[]; groups: (GroupSession & { seats: number })[] };
async function rpc<T>(name: string, args = {}): Promise<T> {
  if (!db) throw new Error('The database connection is not configured.');
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
export const liveApi = {
  workspace: () => rpc<Workspace>('live_workspace'),
  saveTeacher: (teacher: Teacher) => rpc<string>('save_live_teacher', { p_teacher: teacher }),
  selectTeacher: (courseId: string, teacherId: string) =>
    rpc<void>('select_live_teacher', { p_course: courseId, p_teacher: teacherId }),
  availability: (courseId: string, teacherId: string, date: string) =>
    rpc<Availability>('live_availability', {
      p_course: courseId,
      p_teacher: teacherId,
      p_date: date,
    }),
  book: (
    courseId: string,
    teacherId: string,
    date: string,
    time: string | null,
    groupId: string | null
  ) =>
    rpc<string>('book_live_lesson', {
      p_course: courseId,
      p_teacher: teacherId,
      p_date: date,
      p_time: time,
      p_group: groupId,
    }),
  updateBooking: (
    id: string,
    action: 'cancel' | 'media' | 'completed' | 'no_show',
    zoom = '',
    recording = ''
  ) =>
    rpc<void>('update_live_booking', {
      p_id: id,
      p_action: action,
      p_zoom: zoom,
      p_recording: recording,
    }),
  saveSettings: (program: string, settings: ProgramSettings) =>
    rpc<void>('save_live_settings', { p_program: program, p_settings: settings }),
  async inviteTeacher(teacherId: string) {
    const { data, error } = await db.functions.invoke('invite-live-teacher', {
      body: { teacherId },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data as { message: string };
  },
  async uploadPhoto(teacherId: string, file: File) {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    )
      throw new Error('Choose a JPG, PNG or WebP image smaller than 5 MB.');
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    const path = `${teacherId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await db.storage
      .from('teacher-photos')
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    return db.storage.from('teacher-photos').getPublicUrl(path).data.publicUrl;
  },
};
