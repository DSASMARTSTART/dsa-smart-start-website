import React from 'react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const f = vi.hoisted(() => ({
  user: { id: 'student' },
  courses: [] as unknown[],
  assets: [] as unknown[],
  bookings: [] as unknown[],
  status: vi.fn(),
  list: vi.fn(),
  upload: vi.fn(),
  open: vi.fn(),
  remove: vi.fn(),
  t: (key: string, options?: { count?: number }) =>
    options?.count === undefined ? key : `${key}:${options.count}`,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: f.t }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: f.user }) }));
vi.mock('./LiveLearningContext', () => ({
  useLiveLearning: () => ({ bookings: f.bookings, teachers: [], updateBooking: vi.fn() }),
}));
vi.mock('./libraryApi', async (original) => {
  const actual = await original<typeof import('./libraryApi')>();
  return {
    ...actual,
    libraryApi: {
      vimeoStatus: f.status,
      list: f.list,
      upload: f.upload,
      open: f.open,
      remove: f.remove,
    },
  };
});
import LiveMaterials from './LiveMaterials';
import LessonList from './LessonList';
import LiveAssetUpload from './LiveAssetUpload';
import { validateLiveFile } from './libraryApi';
const material = {
  id: 'material',
  kind: 'material',
  provider: 'storage',
  state: 'ready',
  course_id: 'hybrid',
  title: 'Hybrid workbook',
  filename: 'workbook.pdf',
  mime_type: 'application/pdf',
  byte_size: 100,
  bucket: 'live-materials',
  path: 'private/file.pdf',
};
const booking = {
  id: 'booking-1',
  userId: 'student',
  teacherId: 'teacher',
  courseId: 'hybrid',
  groupId: 'group',
  title: 'Conversation practice',
  studentName: 'Student',
  startsAt: '2025-01-01T10:00:00Z',
  endsAt: '2025-01-01T11:00:00Z',
  kind: 'group',
  status: 'completed',
  canCancel: false,
};
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  f.courses = [
    { id: 'hybrid', title: 'Hybrid Pack', materialsIncluded: true, canReadMaterials: true },
    { id: 'starter', title: 'Starter Path', materialsIncluded: false, canReadMaterials: false },
  ];
  f.assets = [];
  f.bookings = [];
  f.list.mockImplementation(async () => ({ courses: f.courses, assets: f.assets }));
  f.status.mockResolvedValue({ configured: true });
  f.upload.mockResolvedValue(material);
  f.open.mockResolvedValue('https://player.vimeo.com/video/123456?dnt=1');
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
});
describe('live package library', () => {
  it('blocks recording uploads with a clear message until Vimeo is configured', async () => {
    f.status.mockResolvedValue({ configured: false });
    render(<LiveAssetUpload target={{ kind: 'recording', bookingId: 'booking' }} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'live.uploadRecording' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('live.vimeoNotConfigured');
    expect(screen.getByRole('button', { name: 'live.publishFile' })).toBeDisabled();
    expect(f.upload).not.toHaveBeenCalled();
  });
  it('shows processing without offering a video before it is ready', async () => {
    f.bookings = [booking];
    f.assets = [{ ...material, id: 'processing', kind: 'recording', provider: 'vimeo', state: 'processing', booking_id: booking.id, title: 'Processing replay' }];
    render(<LessonList initialHistory />);
    expect(await screen.findByRole('button', { name: 'Processing replay' })).toBeDisabled();
    expect(screen.getByText('live.vimeoProcessing')).toBeTruthy();
    expect(f.open).not.toHaveBeenCalled();
  });
  it('lets an admin upload materials only into configured existing packages', async () => {
    render(<LiveMaterials manager />);
    expect(await screen.findByRole('button', { name: 'live.uploadMaterial' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'starter' } });
    expect(screen.queryByRole('button', { name: 'live.uploadMaterial' })).toBeNull();
    expect(screen.getByText('live.materialsNotIncluded')).toBeTruthy();
  });
  it('students can open their materials but cannot upload them', async () => {
    f.assets = [material];
    render(<LiveMaterials courseId="hybrid" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Hybrid workbook' }));
    await waitFor(() => expect(f.open).toHaveBeenCalledWith(material));
    expect(await screen.findByRole('link', { name: 'live.downloadFile' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'live.uploadMaterial' })).toBeNull();
  });
  it('publishes a real selected file against its package and refreshes after success', async () => {
    const done = vi.fn();
    render(<LiveAssetUpload target={{ kind: 'material', courseId: 'hybrid' }} onDone={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'live.uploadMaterial' }));
    const file = new File(['PDF file'], 'workbook.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('live.chooseFile'), { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'live.publishFile' })).not.toBeDisabled()
    );
    fireEvent.submit(screen.getByRole('button', { name: 'live.publishFile' }).closest('form')!);
    await waitFor(() =>
      expect(f.upload).toHaveBeenCalledWith(
        { kind: 'material', courseId: 'hybrid' },
        'workbook',
        file,
        expect.any(Function),
        expect.any(AbortSignal)
      )
    );
    expect(await screen.findByRole('status')).toHaveTextContent('live.filesUploaded');
    expect(done).toHaveBeenCalledOnce();
  });
  it('never reports a failed upload as published', async () => {
    f.upload.mockRejectedValue(new Error('Upload interrupted'));
    render(
      <LiveAssetUpload target={{ kind: 'recording', bookingId: 'booking-1' }} onDone={vi.fn()} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'live.uploadRecording' }));
    fireEvent.change(screen.getByLabelText('live.chooseFile'), {
      target: { files: [new File(['video'], 'class.mp4', { type: 'video/mp4' })] },
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'live.publishFile' })).not.toBeDisabled()
    );
    fireEvent.submit(screen.getByRole('button', { name: 'live.publishFile' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Upload interrupted');
    expect(screen.queryByText('live.filesUploaded')).toBeNull();
  });
  it('shows a group replay uploaded through another participant’s booking in the student history', async () => {
    f.bookings = [booking];
    f.assets = [
      {
        ...material,
        id: 'recording',
        kind: 'recording',
        booking_id: 'other-booking',
        teacher_id: 'teacher',
        group_id: 'group',
        title: 'Group replay',
        mime_type: 'video/mp4',
        provider: 'vimeo',
        state: 'ready',
      },
    ];
    render(<LessonList />);
    fireEvent.click(screen.getByRole('button', { name: 'live.pastLessons' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Group replay' }));
    await waitFor(() =>
      expect(document.querySelector('iframe')?.getAttribute('src')).toBe(
        'https://player.vimeo.com/video/123456?dnt=1'
      )
    );
    expect(screen.queryByRole('button', { name: 'live.uploadRecording' })).toBeNull();
  });
  it('shows teachers the past lessons that still need a recording', async () => {
    f.bookings = [booking];
    render(<LessonList manager teacherId="teacher" initialHistory />);
    fireEvent.click(await screen.findByRole('button', { name: 'live.recordingsMissing:1' }));
    expect(screen.getByRole('button', { name: 'live.uploadRecording' })).toBeTruthy();
    expect(screen.getByText('live.groupRecordingHelp')).toBeTruthy();
  });
  it('validates supported video and document formats before creating uploads', () => {
    expect(validateLiveFile(new File(['x'], 'class.mp4'), 'recording')).toBe('video/mp4');
    expect(() => validateLiveFile(new File(['x'], 'page.html'), 'material')).toThrow(
      'Choose a PDF'
    );
    expect(() => validateLiveFile(new File(['x'], 'class.avi'), 'recording')).toThrow(
      'MP4, MOV or WebM'
    );
    expect(() => validateLiveFile(new File([], 'empty.pdf'), 'material')).toThrow('50 MB');
  });
});
