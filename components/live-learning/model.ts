export const programs = [
  {
    id: 'language-lab',
    name: 'Language Lab',
    group: 8,
    private: 0,
    minutes: '50 min',
    price: '€160',
  },
  {
    id: 'language-lab-pro',
    name: 'Language Lab Pro',
    group: 30,
    private: 0,
    minutes: '50 min',
    price: '€599',
  },
  {
    id: 'starter-path',
    name: 'Starter Path',
    group: 0,
    private: 5,
    minutes: '30 min',
    price: '€200',
  },
  {
    id: 'hybrid-pack',
    name: 'Hybrid Pack',
    group: 25,
    private: 5,
    minutes: '50 / 30 min',
    price: '€599',
  },
] as const;

export const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export type WeeklyWindow = { id: string; day: number; start: string; end: string };
export type Booking = {
  userId: string;
  courseId: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  studentName: string;
  status: 'booked' | 'completed' | 'cancelled' | 'no_show';
  creditUsed: boolean;
  canCancel: boolean;
  id: string;
  teacherId: string;
  program: string;
  date: string;
  start: string;
  kind: 'group' | 'private';
  groupId?: string;
  title: string;
  zoom?: string;
  recording?: string;
};
export type GroupSession = {
  zoom?: string;
  recording?: string;
  id: string;
  date: string;
  start: string;
  program: string;
  capacity: number;
  title: string;
};
export type Teacher = {
  revision?: number;
  userId?: string;
  invitedAt?: string;
  id: string;
  name: string;
  email: string;
  bio: string;
  photo: string;
  video: string;
  timezone: string;
  languages: string;
  programs: string[];
  status: 'draft' | 'active' | 'inactive';
  weekly: WeeklyWindow[];
  daysOff: string[];
  groups: GroupSession[];
};

export const blankTeacher = (): Teacher => ({
  id: crypto.randomUUID(),
  name: '',
  email: '',
  bio: '',
  photo: '',
  video: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Rome',
  languages: '',
  programs: [],
  status: 'draft',
  weekly: [],
  daysOff: [],
  groups: [],
});

export function minutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function timeLabel(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weekDates(offset: number, timezone?: string) {
  const monday = timezone ? new Date(`${teacherNow(timezone).date}T12:00:00`) : new Date();
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
  return days.map((_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return date;
  });
}

export function weeklyError(windows: WeeklyWindow[]) {
  for (const w of windows) {
    if (!w.start || !w.end || minutes(w.end) - minutes(w.start) < 30)
      return 'Each availability window must be at least 30 minutes long and end after it starts.';
    if (
      windows.some(
        (other) =>
          other.id !== w.id &&
          other.day === w.day &&
          minutes(w.start) < minutes(other.end) &&
          minutes(w.end) > minutes(other.start)
      )
    )
      return `The availability windows on ${days[w.day]} overlap. Adjust the times to continue.`;
  }
  return '';
}

// A group session occupies the teacher's time even before students reserve seats.
// Split private availability around group sessions rather than offering both.
export function privateWindows(teacher: Teacher, date: Date, bookings: Booking[] = []) {
  const key = dateKey(date);
  if (teacher.daysOff.includes(key)) return [];
  const day = (date.getDay() + 6) % 7;
  let windows = teacher.weekly
    .filter((w) => w.day === day)
    .map((w) => [minutes(w.start), minutes(w.end)]);
  for (const group of teacher.groups.filter((g) => g.date === key)) {
    const start = minutes(group.start),
      end = start + 50;
    windows = windows.flatMap(([a, b]) =>
      end <= a || start >= b
        ? [[a, b]]
        : [
            [a, Math.min(b, start)],
            [Math.max(a, end), b],
          ].filter(([x, y]) => y - x >= 30)
    );
  }
  for (const booking of bookings.filter(
    (b) => b.teacherId === teacher.id && b.date === key && b.kind === 'private'
  )) {
    const start = minutes(booking.start),
      end = start + 30;
    windows = windows.flatMap(([a, b]) =>
      end <= a || start >= b
        ? [[a, b]]
        : [
            [a, Math.min(b, start)],
            [Math.max(a, end), b],
          ].filter(([x, y]) => y - x >= 30)
    );
  }
  return windows;
}

// Compare wall-clock dates in the teacher’s zone; never offer a lesson in the past.
export function teacherNow(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}
