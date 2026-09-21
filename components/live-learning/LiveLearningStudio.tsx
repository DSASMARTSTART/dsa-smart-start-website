import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Info,
  Mail,
  Plus,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Video,
  X,
} from 'lucide-react';
import {
  blankTeacher,
  dateKey,
  days,
  minutes,
  privateWindows,
  programs,
  Teacher,
  timeLabel,
  teacherNow,
  weekDates,
  weeklyError,
  WeeklyWindow,
  GroupSession,
  Booking,
} from './model';
import './live-learning.css';
import './live-learning-dark.css';
import { useLiveLearning } from './LiveLearningContext';
import { liveApi } from './api';
import ProgramRules from './ProgramRules';
import LessonList from './LessonList';
import LiveMaterials from './LiveMaterials';

type Tab = 'teachers' | 'calendar' | 'programs' | 'materials' | 'recordings';
type Panel = 'teacher' | 'weekly' | 'group' | 'time-off' | null;
type Props = { mode?: 'admin' | 'teacher' };

function Drawer({
  title,
  eyebrow,
  children,
  onClose,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = (): HTMLElement[] =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
        ) || []
      ) as HTMLElement[];
    focusables()[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key === 'Tab') {
        const all = focusables();
        const first = all[0],
          last = all[all.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, []);
  return (
    <div className="ll-overlay">
      <div className="ll-backdrop" onClick={onClose} />
      <div
        ref={ref}
        className="ll-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ll-drawer-title"
      >
        <header>
          <div>
            <span className="ll-eyebrow">{eyebrow}</span>
            <h2 id="ll-drawer-title">{title}</h2>
          </div>
          <button className="ll-icon-button" onClick={onClose} aria-label="Close panel">
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function Avatar({ teacher, large = false }: { teacher: Teacher; large?: boolean }) {
  return (
    <span className={`ll-avatar ${large ? 'll-avatar-large' : ''}`}>
      {teacher.photo ? (
        <img src={teacher.photo} alt="" />
      ) : (
        teacher.name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((s) => s[0])
          .join('')
          .toUpperCase() || <UserRound size={24} />
      )}
    </span>
  );
}

function CalendarArt() {
  return (
    <div className="ll-calendar-art" aria-hidden="true">
      <div className="ll-art-orbit" />
      <div className="ll-art-card">
        <div className="ll-art-head">
          <span />
          <span />
        </div>
        <div className="ll-art-lines">
          {Array.from({ length: 21 }, (_, i) => (
            <i key={i} className={[9, 10, 16].includes(i) ? 'marked' : ''} />
          ))}
        </div>
        <div className="ll-art-event">
          <span />
          <div>
            <i />
            <i />
          </div>
          <Check size={14} />
        </div>
      </div>
      <span className="ll-art-bubble">
        <GraduationCap size={24} />
      </span>
      <span className="ll-art-check">
        <Check size={16} />
      </span>
    </div>
  );
}

export default function LiveLearningStudio({ mode = 'admin' }: Props) {
  const {
    teachers: allTeachers,
    bookings: allBookings,
    capacities,
    settings,
    saveSettings,
    saveTeacher: persistTeacher,
    updateBooking,
    ownTeacherId,
    loading,
    error: loadError,
    refresh,
  } = useLiveLearning();
  const teachers =
    mode === 'teacher' ? allTeachers.filter((t) => t.id === ownTeacherId) : allTeachers;
  const bookings = allBookings.filter((b) => b.status !== 'cancelled');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [lesson, setLesson] = useState<Booking | null>(null);
  const [tab, setTab] = useState<Tab>('teachers');
  const [role] = useState<'admin' | 'teacher' | 'student'>(mode);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState<Teacher>(blankTeacher);
  const [step, setStep] = useState(0);
  const [windows, setWindows] = useState<WeeklyWindow[]>([]);
  const [group, setGroup] = useState<GroupSession>({
    id: '',
    date: dateKey(new Date()),
    start: '10:00',
    program: '',
    capacity: 4,
    title: '',
  });
  const [offDate, setOffDate] = useState(dateKey(new Date()));
  const [week, setWeek] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [teacherTab, setTeacherTab] = useState<'calendar' | 'profile' | 'recordings'>('calendar');
  const [pendingStatus, setPendingStatus] = useState<Teacher | null>(null);
  useEffect(() => {
    if (mode === 'teacher' && ownTeacherId) setSelectedId(ownTeacherId);
  }, [mode, ownTeacherId]);
  const selected = teachers.find((t) => t.id === selectedId);
  const dates = weekDates(week, selected?.timezone);
  const isCalendar =
    role === 'teacher' ? teacherTab === 'calendar' : role === 'admin' && tab === 'calendar';

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function closePanel() {
    setPanel(null);
    setError('');
  }
  function openTeacher(teacher?: Teacher) {
    setPhotoFile(null);
    setDraft(teacher ? { ...teacher } : blankTeacher());
    setStep(0);
    setError('');
    setPanel('teacher');
  }
  async function updateTeacher(next: Teacher) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      if (photoFile && next.photo.startsWith('data:'))
        next = { ...next, photo: await liveApi.uploadPhoto(next.id, photoFile) };
      await persistTeacher(next);
      setPhotoFile(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function openCalendar(teacher: Teacher) {
    setSelectedId(teacher.id);
    setTab('calendar');
    setTeacherTab('calendar');
  }
  function openWeekly() {
    if (!selected) return;
    setWindows(selected.weekly.map((w) => ({ ...w })));
    setError('');
    setPanel('weekly');
  }
  function openGroup(existing?: GroupSession) {
    if (!selected) return;
    const program = selected.programs.find((id) => programs.find((p) => p.id === id)?.group);
    setGroup(
      existing || {
        id: crypto.randomUUID(),
        date: dateKey(new Date()),
        start: '10:00',
        program: program || '',
        capacity: capacities[program || ''] || 4,
        title: '',
      }
    );
    setError('');
    setPanel('group');
  }
  async function saveTeacher(event: React.FormEvent) {
    event.preventDefault();
    if (step === 0 && !draft.name.trim()) {
      setError('Enter the teacher’s name to continue.');
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (!draft.programs.length) {
      setError('Choose at least one program for this teacher.');
      return;
    }
    if (
      teachers.some(
        (t) => t.id !== draft.id && t.email.toLowerCase() === draft.email.trim().toLowerCase()
      )
    ) {
      setStep(0);
      setError('A teacher with this email already exists.');
      return;
    }
    const teacher = { ...draft, name: draft.name.trim(), email: draft.email.trim() };
    if (!(await updateTeacher(teacher))) return;
    setSelectedId(teacher.id);
    closePanel();
    setNotice('Teacher profile saved.');
  }
  async function saveWeekly(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const issue = weeklyError(windows);
    if (issue) {
      setError(issue);
      return;
    }
    if (!(await updateTeacher({ ...selected, weekly: windows }))) return;
    closePanel();
    setNotice('Weekly availability updated.');
  }
  async function saveGroup(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (!group.program || !capacities[group.program]) {
      setError('An admin needs to set the program’s group capacity in Programs first.');
      return;
    }
    if (selected.daysOff.includes(group.date)) {
      setError(
        'This date is marked as time off. Choose another date or remove the time off first.'
      );
      return;
    }
    if (minutes(group.start) + 50 > 1440) {
      setError('The session must finish before midnight.');
      return;
    }
    if (
      selected.groups.some(
        (g) =>
          g.id !== group.id &&
          g.date === group.date &&
          minutes(g.start) < minutes(group.start) + 50 &&
          minutes(g.start) + 50 > minutes(group.start)
      )
    ) {
      setError('This overlaps another group session. Choose a different time.');
      return;
    }
    if (
      bookings.some(
        (b) =>
          b.teacherId === selected.id &&
          b.kind === 'private' &&
          b.date === group.date &&
          minutes(b.start) < minutes(group.start) + 50 &&
          minutes(b.start) + 30 > minutes(group.start)
      )
    ) {
      setError('This overlaps a booked private lesson. Choose a different time.');
      return;
    }
    const original = selected.groups.find((g) => g.id === group.id);
    const timeChanged = !original || original.date !== group.date || original.start !== group.start;
    const now = teacherNow(selected.timezone);
    if (
      timeChanged &&
      (group.date < now.date || (group.date === now.date && group.start <= now.time))
    ) {
      setError('Choose a future start time in the teacher’s time zone.');
      return;
    }
    if (
      original &&
      bookings.some((b) => b.groupId === group.id) &&
      (original.date !== group.date ||
        original.start !== group.start ||
        original.program !== group.program)
    ) {
      setError(
        'This session has a reservation. Its time and program need a dedicated rescheduling flow; media links can still be edited.'
      );
      return;
    }
    const next = { ...group, capacity: original?.capacity || capacities[group.program] };
    if (
      !(await updateTeacher({
        ...selected,
        groups: [...selected.groups.filter((g) => g.id !== next.id), next],
      }))
    )
      return;
    closePanel();
    setNotice('Group session saved.');
  }
  async function saveOff(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (
      selected.groups.some((g) => g.date === offDate) ||
      bookings.some((b) => b.teacherId === selected.id && b.date === offDate)
    ) {
      setError('There is a scheduled lesson on this date. Review it before adding time off.');
      return;
    }
    if (
      !(await updateTeacher({
        ...selected,
        daysOff: Array.from(new Set([...selected.daysOff, offDate])).sort(),
      }))
    )
      return;
    closePanel();
    setNotice('Time off added. Private availability is hidden on this date.');
  }
  const results = teachers.filter(
    (t) =>
      (filter === 'all' || t.status === filter) &&
      `${t.name} ${t.email} ${t.languages}`.toLowerCase().includes(query.toLowerCase())
  );
  const stats = [
    {
      label: 'Teachers',
      value: teachers.length.toString().padStart(2, '0'),
      text: 'Your teaching team',
      icon: GraduationCap,
      color: 'purple',
    },
    {
      label: 'Ready for students',
      value: teachers
        .filter((t) => t.status === 'active')
        .length.toString()
        .padStart(2, '0'),
      text: 'Active teacher profiles',
      icon: CheckCircle2,
      color: 'green',
    },
    {
      label: 'Group sessions',
      value: teachers
        .reduce((n, t) => n + t.groups.length, 0)
        .toString()
        .padStart(2, '0'),
      text: 'Scheduled sessions',
      icon: Users,
      color: 'pink',
    },
    {
      label: 'Live programs',
      value: '04',
      text: 'Two ways to learn',
      icon: BookOpen,
      color: 'amber',
    },
  ];

  return (
    <div className="ll-studio ll-dark">
      <div className="ll-workarea">
        <main className="ll-content" aria-busy={busy}>
          {(error || loadError) && (
            <p role="alert" className="ll-error">
              {error || loadError}{' '}
              <button
                onClick={() => {
                  setError('');
                  void refresh();
                }}
              >
                Refresh
              </button>
            </p>
          )}
          {loading && <p role="status">Loading live learning…</p>}
          {role !== 'student' && (
            <div className="ll-page-heading">
              <div>
                <div className="ll-eyebrow">
                  <span /> THE PEOPLE BEHIND THE PROGRESS
                </div>
                <h1>
                  {role === 'teacher' ? 'Your teaching space' : 'Live learning'}
                  <span>.</span>
                </h1>
                <p>
                  {role === 'teacher'
                    ? 'Make room for great lessons. Your profile, your time, your students.'
                    : 'Bring your teachers, schedules, and live programs together.'}
                </p>
              </div>
              {role === 'admin' && (
                <button className="ll-button primary" onClick={() => openTeacher()}>
                  <Plus size={18} />
                  Add teacher
                </button>
              )}
            </div>
          )}
          {role === 'admin' && (
            <div className="ll-stats">
              {stats.map((stat) => (
                <div className="ll-stat" key={stat.label}>
                  <div>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                    <small>{stat.text}</small>
                  </div>
                  <span className={`ll-stat-icon ${stat.color}`}>
                    <stat.icon size={21} />
                  </span>
                </div>
              ))}
            </div>
          )}
          {role !== 'student' && (
            <div className="ll-tabs-row">
              <nav className="ll-tabs" aria-label="Live learning sections">
                {role === 'admin' ? (
                  <>
                    {(
                      [
                        { id: 'teachers', label: 'Teachers', icon: Users },
                        { id: 'calendar', label: 'Calendar', icon: CalendarDays },
                        { id: 'programs', label: 'Programs & rules', icon: Settings2 },
                        { id: 'materials', label: 'Package materials', icon: BookOpen },
                        { id: 'recordings', label: 'Lessons & recordings', icon: Play },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        className={tab === item.id ? 'active' : ''}
                        onClick={() => setTab(item.id)}
                        aria-current={tab === item.id ? 'page' : undefined}
                      >
                        <item.icon size={17} />
                        {item.label}
                        {item.id === 'teachers' && <span>{teachers.length}</span>}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      className={teacherTab === 'calendar' ? 'active' : ''}
                      onClick={() => setTeacherTab('calendar')}
                    >
                      <CalendarDays size={17} />
                      My calendar
                    </button>
                    <button
                      className={teacherTab === 'profile' ? 'active' : ''}
                      onClick={() => setTeacherTab('profile')}
                    >
                      <UserRound size={17} />
                      My profile
                    </button>
                    <button
                      className={teacherTab === 'recordings' ? 'active' : ''}
                      onClick={() => setTeacherTab('recordings')}
                    >
                      <Play size={17} />
                      Lessons & recordings
                    </button>
                  </>
                )}
              </nav>
              <span className="ll-tabs-note">
                <ShieldCheck size={14} />
                {role === 'admin' ? 'Admin workspace' : 'Teacher workspace'}
              </span>
            </div>
          )}

          {role === 'admin' && tab === 'materials' && <LiveMaterials manager />}
          {((role === 'admin' && tab === 'recordings') ||
            (role === 'teacher' && teacherTab === 'recordings')) && (
            <LessonList
              manager
              initialHistory
              teacherId={mode === 'teacher' ? ownTeacherId || undefined : undefined}
            />
          )}

          {role === 'admin' && tab === 'teachers' && (
            <div className="ll-two-column">
              <section className="ll-panel ll-roster">
                <div className="ll-section-heading">
                  <div>
                    <h2>
                      Your teaching team <span className="ll-count">{teachers.length}</span>
                    </h2>
                    <p>A great learning experience starts with the right people.</p>
                  </div>
                </div>
                <div className="ll-toolbar">
                  <label className="ll-search">
                    <Search size={17} />
                    <input
                      aria-label="Search teachers"
                      placeholder="Search by name, email, or language"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter teachers by status"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {!results.length ? (
                  <div className="ll-empty-team">
                    <CalendarArt />
                    <span className="ll-eyebrow">
                      {teachers.length ? 'NO MATCHES YET' : 'A FRESH START'}
                    </span>
                    <h3>
                      {teachers.length
                        ? 'No teachers match your search'
                        : 'Meet your next great teacher.'}
                    </h3>
                    <p>
                      {teachers.length
                        ? 'Try a different name or reset your filters.'
                        : 'Add your first teacher, give them a home for their profile, and make space for learning.'}
                    </p>
                    <button
                      className="ll-button primary"
                      onClick={() =>
                        teachers.length ? (setQuery(''), setFilter('all')) : openTeacher()
                      }
                    >
                      {teachers.length ? <Search size={17} /> : <Plus size={17} />}
                      {teachers.length ? 'Reset filters' : 'Add your first teacher'}
                    </button>
                    <small>
                      {teachers.length
                        ? 'Search your team by name, email, or language.'
                        : 'Profile first. Availability next. All in one place.'}
                    </small>
                  </div>
                ) : (
                  <div className="ll-teacher-list">
                    {results.map((teacher) => (
                      <article key={teacher.id} className="ll-teacher-card">
                        <div className="ll-teacher-top">
                          <Avatar teacher={teacher} large />
                          <div>
                            <h3>{teacher.name}</h3>
                            <p>{teacher.languages || 'Teaching languages not added'}</p>
                          </div>
                          <span className={`ll-status ${teacher.status}`}>{teacher.status}</span>
                        </div>
                        <p className="ll-bio">
                          {teacher.bio ||
                            'Add a short introduction to help students get to know this teacher.'}
                        </p>
                        <div className="ll-tags">
                          {teacher.programs.map((id) => (
                            <span key={id}>{programs.find((p) => p.id === id)?.name}</span>
                          ))}
                        </div>
                        <div className="ll-teacher-meta">
                          <Clock3 size={14} />
                          <span>{teacher.timezone.replaceAll('_', ' ')}</span>
                          <span>·</span>
                          <span>
                            {teacher.weekly.length
                              ? `${teacher.weekly.length} availability windows`
                              : 'Availability not set'}
                          </span>
                        </div>
                        <footer>
                          <button
                            className="ll-button secondary small"
                            onClick={() => openTeacher(teacher)}
                          >
                            Edit profile
                          </button>
                          <button className="ll-text-button" onClick={() => openCalendar(teacher)}>
                            View calendar <ArrowRight size={15} />
                          </button>
                          <button
                            className="ll-text-button"
                            disabled={busy}
                            onClick={async () => {
                              setBusy(true);
                              try {
                                const result = await liveApi.inviteTeacher(teacher.id);
                                setNotice(result.message);
                                await refresh();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Invitation failed.');
                              } finally {
                                setBusy(false);
                              }
                            }}
                          >
                            <Mail size={15} />{' '}
                            {teacher.userId ? 'Send login invitation' : 'Invite to workspace'}
                          </button>
                        </footer>
                      </article>
                    ))}
                  </div>
                )}
                <div className="ll-roster-footer">
                  <ShieldCheck size={15} />
                  Teacher profiles start as drafts. You decide when they’re ready.
                </div>
              </section>
              <aside className="ll-guide-column">
                <section className="ll-getting-started">
                  <span className="ll-kicker">BUILD YOUR TEACHING TEAM</span>
                  <h2>
                    From hello
                    <br />
                    to the first lesson.
                  </h2>
                  <p>Three small steps to get a teacher ready for students.</p>
                  <ol>
                    {[
                      {
                        title: 'Create their profile',
                        text: 'A name, a friendly introduction, and the programs they teach.',
                        done: teachers.length > 0,
                      },
                      {
                        title: 'Make time for learning',
                        text: 'Set weekly private availability and publish group sessions.',
                        done: teachers.some((t) => t.weekly.length || t.groups.length),
                      },
                      {
                        title: 'Review & activate',
                        text: 'Check the student-facing profile before making it available.',
                        done: teachers.some((t) => t.status === 'active'),
                      },
                    ].map((s, i) => (
                      <li key={s.title}>
                        <span className={s.done ? 'done' : ''}>
                          {s.done ? <Check size={15} /> : `0${i + 1}`}
                        </span>
                        <div>
                          <strong>{s.title}</strong>
                          <p>{s.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="ll-guide-bottom">
                    <span className="ll-mini-stars">✳</span>
                    <span>
                      Good teaching starts
                      <br />
                      with a little support.
                    </span>
                  </div>
                </section>
                <section className="ll-small-note">
                  <Video size={19} />
                  <div>
                    <strong>A familiar face makes a difference.</strong>
                    <p>
                      A short introduction video helps students choose a teacher they feel
                      comfortable with.
                    </p>
                  </div>
                </section>
              </aside>
            </div>
          )}

          {isCalendar && (
            <>
              <div className="ll-calendar-toolbar">
                <div>
                  <label className="ll-field-caption" htmlFor="ll-teacher-select">
                    {role === 'teacher' ? 'TEACHER' : 'TEACHER CALENDAR'}
                  </label>
                  <select
                    id="ll-teacher-select"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                  >
                    <option value="">Choose a teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.status === 'inactive' ? ' · Inactive' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selected && (
                  <div className="ll-calendar-actions">
                    <button
                      className="ll-button secondary"
                      onClick={() => {
                        setError('');
                        setOffDate(dateKey(new Date()));
                        setPanel('time-off');
                      }}
                    >
                      <Plus size={16} />
                      Time off
                    </button>
                    <button className="ll-button secondary" onClick={openWeekly}>
                      <Clock3 size={16} />
                      Weekly availability
                    </button>
                    <button
                      className="ll-button primary"
                      disabled={
                        !selected.programs.some((id) => programs.find((p) => p.id === id)?.group)
                      }
                      onClick={() => openGroup()}
                    >
                      <Plus size={17} />
                      Group session
                    </button>
                  </div>
                )}
              </div>
              {!selected ? (
                <section className="ll-panel ll-calendar-empty">
                  <CalendarArt />
                  <h2>
                    {teachers.length
                      ? 'Whose week are we planning?'
                      : 'A calendar for every teacher.'}
                  </h2>
                  <p>
                    {teachers.length
                      ? 'Choose a teacher above to review their availability and group sessions.'
                      : 'Create a teacher profile first. Then build their weekly rhythm right here.'}
                  </p>
                  {role === 'admin' && !teachers.length && (
                    <button className="ll-button primary" onClick={() => openTeacher()}>
                      <Plus size={17} />
                      Add a teacher
                    </button>
                  )}
                  {role === 'teacher' && !teachers.length && (
                    <button
                      className="ll-button secondary"
                      onClick={() => {
                        window.location.hash = '#admin-teachers';
                        setTab('teachers');
                      }}
                    >
                      Go to admin view <ArrowRight size={16} />
                    </button>
                  )}
                </section>
              ) : (
                <>
                  <section className="ll-panel ll-calendar-panel">
                    <div className="ll-calendar-header">
                      <div className="ll-calendar-identity">
                        <Avatar teacher={selected} />
                        <div>
                          <h2>{role === 'teacher' ? 'My calendar' : selected.name}</h2>
                          <p>
                            {selected.timezone.replaceAll('_', ' ')} · All times in this teacher’s
                            time zone
                          </p>
                        </div>
                      </div>
                      <div className="ll-week-navigation">
                        <button className="ll-button secondary small" onClick={() => setWeek(0)}>
                          This week
                        </button>
                        <button
                          className="ll-icon-button"
                          onClick={() => setWeek(week - 1)}
                          aria-label="Previous week"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <span>
                          {dates[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}{' '}
                          –{' '}
                          {dates[6].toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          className="ll-icon-button"
                          onClick={() => setWeek(week + 1)}
                          aria-label="Next week"
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="ll-calendar-legend">
                      <span>
                        <i className="private" />
                        Private availability · 30 min lessons
                      </span>
                      <span>
                        <i className="group" />
                        Group session · 50 min
                      </span>
                      <span>
                        <i className="off" />
                        Time off
                      </span>
                    </div>
                    <div className="ll-week-scroll">
                      <div className="ll-week-grid">
                        {dates.map((date, i) => {
                          const key = dateKey(date);
                          const isOff = selected.daysOff.includes(key);
                          const groups = selected.groups
                            .filter((g) => g.date === key)
                            .sort((a, b) => a.start.localeCompare(b.start));
                          const available = privateWindows(selected, date, bookings);
                          const privateBookings = bookings.filter(
                            (b) =>
                              b.teacherId === selected.id && b.date === key && b.kind === 'private'
                          );
                          return (
                            <div
                              key={key}
                              className={`ll-day ${dateKey(new Date()) === key ? 'today' : ''}`}
                            >
                              <div className="ll-day-heading">
                                <span>{days[i].slice(0, 3)}</span>
                                <strong>{date.getDate()}</strong>
                                {dateKey(new Date()) === key && <small>Today</small>}
                              </div>
                              <div className="ll-day-body">
                                {isOff ? (
                                  <div className="ll-time-off-event">
                                    <span>Time off</span>
                                    <small>Not available</small>
                                  </div>
                                ) : (
                                  [
                                    ...privateBookings.map((b) => ({
                                      time: minutes(b.start),
                                      key: b.id,
                                      content: (
                                        <button
                                          className="ll-event booked"
                                          onClick={() => setLesson({ ...b })}
                                        >
                                          <span>
                                            {b.start} – {timeLabel(minutes(b.start) + 30)}
                                          </span>
                                          <strong>Private lesson</strong>
                                          <small>
                                            <CheckCircle2 size={12} />
                                            Booked lesson
                                          </small>
                                        </button>
                                      ),
                                    })),
                                    ...groups.map((g) => ({
                                      time: minutes(g.start),
                                      key: g.id,
                                      content: (
                                        <button
                                          className="ll-event group"
                                          onClick={() => openGroup(g)}
                                        >
                                          <span>
                                            {g.start} – {timeLabel(minutes(g.start) + 50)}
                                          </span>
                                          <strong>
                                            {g.title ||
                                              programs.find((p) => p.id === g.program)?.name}
                                          </strong>
                                          <small>
                                            <Users size={12} />
                                            {bookings.filter((b) => b.groupId === g.id).length}/
                                            {g.capacity} seats · 50 min
                                          </small>
                                        </button>
                                      ),
                                    })),
                                    ...available.map(([start, end]) => ({
                                      time: start,
                                      key: `private-${start}`,
                                      content: (
                                        <button className="ll-event private" onClick={openWeekly}>
                                          <span>
                                            {timeLabel(start)} – {timeLabel(end)}
                                          </span>
                                          <strong>Private lessons</strong>
                                          <small>
                                            <Clock3 size={12} />
                                            30 min each
                                          </small>
                                        </button>
                                      ),
                                    })),
                                  ]
                                    .sort((a, b) => a.time - b.time)
                                    .map((entry) => (
                                      <React.Fragment key={entry.key}>
                                        {entry.content}
                                      </React.Fragment>
                                    ))
                                )}
                                {!isOff &&
                                  !groups.length &&
                                  !available.length &&
                                  !privateBookings.length && (
                                    <span className="ll-no-hours">No availability</span>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="ll-calendar-footer">
                      <Info size={15} />
                      Group sessions reserve the teacher’s time. Private availability adjusts around
                      them.
                    </div>
                  </section>
                  <div className="ll-calendar-below">
                    <section className="ll-panel ll-summary-card">
                      <span className="ll-stat-icon green">
                        <Clock3 size={20} />
                      </span>
                      <div>
                        <h3>Your weekly rhythm</h3>
                        <p>
                          {selected.weekly.length
                            ? `${selected.weekly.length} recurring availability windows. Changes apply to future availability.`
                            : 'Set repeating hours once, then fine-tune with time off.'}
                        </p>
                      </div>
                      <button className="ll-text-button" onClick={openWeekly}>
                        {selected.weekly.length ? 'Edit hours' : 'Set hours'}
                        <ArrowRight size={15} />
                      </button>
                    </section>
                    <section className="ll-panel ll-summary-card">
                      <span className="ll-stat-icon pink">
                        <Users size={20} />
                      </span>
                      <div>
                        <h3>Small groups. Real progress.</h3>
                        <p>
                          Group lessons run even with one student. Each session belongs to one
                          program.
                        </p>
                      </div>
                    </section>
                  </div>
                  {selected.daysOff.length > 0 && (
                    <section className="ll-panel ll-time-off-list">
                      <h3>Planned time off</h3>
                      {selected.daysOff.map((date) => (
                        <div key={date}>
                          <span>
                            {new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            className="ll-text-button"
                            onClick={async () => {
                              if (
                                !(await updateTeacher({
                                  ...selected,
                                  daysOff: selected.daysOff.filter((d) => d !== date),
                                }))
                              )
                                return;
                              setNotice('Time off removed.');
                            }}
                          >
                            Remove
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </>
              )}
            </>
          )}

          {role === 'teacher' && teacherTab === 'profile' && (
            <section className="ll-panel ll-profile-preview">
              <label className="ll-field-caption" htmlFor="ll-profile-select">
                TEACHER
              </label>
              <select
                id="ll-profile-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Choose a teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selected ? (
                <>
                  <Avatar teacher={selected} large />
                  <h2>{selected.name}</h2>
                  <p>{selected.bio || 'Your introduction will appear here.'}</p>
                  <div className="ll-tags">
                    {selected.programs.map((id) => (
                      <span key={id}>{programs.find((p) => p.id === id)?.name}</span>
                    ))}
                  </div>
                  <p>
                    <Mail size={15} /> {selected.email}
                  </p>
                  <p>
                    <Clock3 size={15} /> {selected.timezone}
                  </p>
                  {selected.video && (
                    <a
                      className="ll-button secondary"
                      href={selected.video}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Video size={16} />
                      Watch introduction
                    </a>
                  )}
                  <button className="ll-button primary" onClick={() => openTeacher(selected)}>
                    Edit my profile
                  </button>
                </>
              ) : (
                <>
                  <UserRound size={40} />
                  <h2>Your profile lives here.</h2>
                  <p>
                    Add a teacher in Admin view, then choose their profile to review this
                    experience.
                  </p>
                </>
              )}
            </section>
          )}

          {role === 'admin' && tab === 'programs' && (
            <>
              <div className="ll-section-heading ll-program-heading">
                <div>
                  <h2>Four programs. Two booking experiences.</h2>
                  <p>
                    Session balances stay separate. Hybrid students use the same teacher for both
                    formats.
                  </p>
                </div>
              </div>
              <div className="ll-program-grid">
                {programs.map((program, i) => (
                  <article className={`ll-panel ll-program-card program-${i}`} key={program.id}>
                    <span className={`ll-stat-icon ${['purple', 'green', 'amber', 'pink'][i]}`}>
                      <BookOpen size={22} />
                    </span>
                    <span className="ll-kicker">
                      {program.group && program.private
                        ? 'GROUP + PRIVATE'
                        : program.group
                          ? 'GROUP LEARNING'
                          : 'ONE TO ONE'}
                    </span>
                    <h3>{program.name}</h3>
                    <span className="ll-program-price">
                      {program.price}
                      <small> / package</small>
                    </span>
                    <div className="ll-program-credits">
                      {program.group > 0 && (
                        <div>
                          <Users size={16} />
                          <strong>{program.group}</strong> group sessions
                        </div>
                      )}
                      {program.private > 0 && (
                        <div>
                          <UserRound size={16} />
                          <strong>{program.private}</strong> private lessons
                        </div>
                      )}
                      <div>
                        <Clock3 size={16} />
                        {program.minutes} per lesson
                      </div>
                    </div>
                    {program.group > 0 ? (
                      <label className="ll-field">
                        <span>Seats per group session</span>
                        <select
                          value={capacities[program.id] || ''}
                          onChange={async (e) => {
                            try {
                              await saveSettings(program.id, {
                                ...settings[program.id],
                                group_capacity: Number(e.target.value),
                              });
                              setNotice('Capacity updated for new group sessions.');
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : 'Could not save capacity.'
                              );
                            }
                          }}
                        >
                          <option value="" disabled>
                            Choose capacity
                          </option>
                          {[3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n} students
                            </option>
                          ))}
                        </select>
                        <small>Applies to newly created sessions.</small>
                      </label>
                    ) : (
                      <div className="ll-program-private">
                        <ShieldCheck size={17} />
                        One student. One teacher.
                      </div>
                    )}
                  </article>
                ))}
              </div>
              <ProgramRules />
              <div className="ll-info-note">
                <Info size={17} />
                <p>
                  Self-paced interactive courses keep their existing course dashboard. They don’t
                  use teacher calendars or live session credits.
                </p>
              </div>
            </>
          )}
          <footer className="ll-page-footer">
            <span>
              EDUWAY <span> / </span> LIVE LEARNING
            </span>
            <span>Thoughtfully made for teachers and learners.</span>
          </footer>
        </main>
      </div>

      {panel === 'teacher' && (
        <Drawer
          title={
            teachers.some((t) => t.id === draft.id)
              ? 'Edit teacher profile'
              : 'A new face at Eduway'
          }
          eyebrow="TEACHER PROFILE"
          onClose={closePanel}
        >
          <form className="ll-drawer-form" onSubmit={saveTeacher}>
            <div className="ll-form-body">
              <div className="ll-stepper">
                {['The essentials', 'Introduction', 'Programs'].map((label, i) => (
                  <span key={label} className={i <= step ? 'active' : ''}>
                    <i>{i < step ? <Check size={12} /> : i + 1}</i>
                    {label}
                  </span>
                ))}
              </div>
              {step === 0 && (
                <>
                  <h3>Let’s start with the essentials.</h3>
                  <p className="ll-form-intro">
                    Use the name students will see when choosing their teacher.
                  </p>
                  <label className="ll-field">
                    <span>
                      Full name <b>*</b>
                    </span>
                    <input
                      required
                      value={draft.name}
                      maxLength={80}
                      placeholder="Teacher’s full name"
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </label>
                  <label className="ll-field">
                    <span>
                      Email address <b>*</b>
                    </span>
                    <input
                      required
                      type="email"
                      readOnly={role === 'teacher' || !!draft.userId}
                      value={draft.email}
                      placeholder="name@example.com"
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    />
                    <small>
                      An invitation will let this teacher create a password and access their own
                      workspace. Save their profile, then use “Invite to workspace”.
                    </small>
                  </label>
                  <label className="ll-field">
                    <span>Calendar time zone</span>
                    <select
                      value={draft.timezone}
                      onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
                    >
                      {Array.from(
                        new Set([
                          draft.timezone,
                          'Europe/Rome',
                          'Europe/Belgrade',
                          'Europe/London',
                          'Europe/Madrid',
                          'America/New_York',
                          'America/Los_Angeles',
                          'Asia/Dubai',
                          'Asia/Kolkata',
                          'Asia/Tokyo',
                          'Australia/Sydney',
                          'UTC',
                        ])
                      ).map((zone) => (
                        <option key={zone}>{zone}</option>
                      ))}
                    </select>
                    <small>Weekly hours and group times use this time zone.</small>
                  </label>
                  <label className="ll-field">
                    <span>Teaching languages</span>
                    <input
                      value={draft.languages}
                      placeholder="e.g. English, Italian"
                      onChange={(e) => setDraft({ ...draft, languages: e.target.value })}
                    />
                  </label>
                </>
              )}
              {step === 1 && (
                <>
                  <h3>Help students feel at home.</h3>
                  <p className="ll-form-intro">
                    A warm introduction makes choosing a teacher easier.
                  </p>
                  <div className="ll-photo-field">
                    <Avatar teacher={draft} large />
                    <label className="ll-button secondary small">
                      Choose photo
                      <input
                        className="ll-sr-only"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (
                            !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
                            file.size > 5 * 1024 * 1024
                          ) {
                            setError('Choose a JPG, PNG, or WebP image under 5 MB.');
                            return;
                          }
                          setPhotoFile(file);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setDraft((d) => ({ ...d, photo: String(reader.result) }));
                            setError('');
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {draft.photo && (
                      <button
                        type="button"
                        className="ll-text-button"
                        onClick={() => setDraft({ ...draft, photo: '' })}
                      >
                        Remove
                      </button>
                    )}
                    <small>JPG, PNG, WebP · up to 5 MB</small>
                  </div>
                  <label className="ll-field">
                    <span>Short introduction</span>
                    <textarea
                      rows={5}
                      maxLength={600}
                      value={draft.bio}
                      placeholder="Tell students about your teaching approach and what they can look forward to."
                      onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                    />
                    <small>{draft.bio.length}/600 characters</small>
                  </label>
                  <label className="ll-field">
                    <span>Introduction video link</span>
                    <input
                      type="url"
                      pattern="https://.*"
                      value={draft.video}
                      placeholder="https://…"
                      onChange={(e) => setDraft({ ...draft, video: e.target.value })}
                    />
                    <small>Use an HTTPS link to the teacher’s short introduction.</small>
                  </label>
                  <div className="ll-info-note">
                    <Video size={18} />
                    <p>
                      Keep it friendly and simple: who you are, how you teach, and a warm hello.
                    </p>
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  <h3>The right programs for this teacher.</h3>
                  <p className="ll-form-intro">
                    Select the programs they can teach. Availability is set separately in their
                    calendar.
                  </p>
                  <div className="ll-program-choices">
                    {programs.map((p) => (
                      <label key={p.id} className={draft.programs.includes(p.id) ? 'checked' : ''}>
                        <input
                          type="checkbox"
                          checked={draft.programs.includes(p.id)}
                          disabled={role === 'teacher'}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              programs: e.target.checked
                                ? [...draft.programs, p.id]
                                : draft.programs.filter((id) => id !== p.id),
                            })
                          }
                        />
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {p.group && p.private
                              ? 'Group + private lessons'
                              : p.group
                                ? '50-minute group sessions'
                                : '30-minute private lessons'}
                          </small>
                        </span>
                        <BookOpen size={18} />
                      </label>
                    ))}
                  </div>
                  {role === 'teacher' && (
                    <p className="ll-form-intro">
                      Your program assignments are managed by an admin.
                    </p>
                  )}
                  <div className="ll-info-note">
                    <ShieldCheck size={18} />
                    <p>
                      {draft.status === 'draft'
                        ? 'This profile starts as a draft. Set the calendar and review the profile before activating it.'
                        : 'Changes are saved to the platform. Active profiles are available to enrolled students.'}
                    </p>
                  </div>
                  {role === 'admin' && teachers.some((t) => t.id === draft.id) && (
                    <button
                      type="button"
                      className="ll-button secondary"
                      onClick={() => {
                        setPendingStatus(draft);
                        closePanel();
                      }}
                    >
                      {draft.status === 'active'
                        ? 'Deactivate teacher'
                        : 'Review & activate teacher'}
                    </button>
                  )}
                </>
              )}
              {error && (
                <p role="alert" className="ll-error">
                  {error}
                </p>
              )}
            </div>
            <footer className="ll-drawer-footer">
              <button
                type="button"
                className="ll-button secondary"
                onClick={() => (step ? (setStep(step - 1), setError('')) : closePanel())}
              >
                {step ? <ArrowLeft size={16} /> : null}
                {step ? 'Back' : 'Cancel'}
              </button>
              <button type="submit" disabled={busy} className="ll-button primary">
                {step === 2 ? 'Save profile' : 'Continue'}
                {step === 2 ? <Check size={16} /> : <ArrowRight size={16} />}
              </button>
            </footer>
          </form>
        </Drawer>
      )}

      {panel === 'weekly' && selected && (
        <Drawer
          title="Make room for learning"
          eyebrow="WEEKLY PRIVATE AVAILABILITY"
          onClose={closePanel}
        >
          <form className="ll-drawer-form" onSubmit={saveWeekly}>
            <div className="ll-form-body">
              <p className="ll-form-intro">
                Set the hours you’re available for 30-minute private lessons. Add another window for
                breaks or split days.
              </p>
              <div className="ll-timezone-note">
                <Clock3 size={17} />
                <strong>{selected.timezone.replaceAll('_', ' ')}</strong>
                <span>Repeats weekly · updates immediately</span>
              </div>
              {!selected.programs.some((id) => programs.find((p) => p.id === id)?.private) && (
                <div className="ll-info-note">
                  <Info size={17} />
                  <p>
                    This teacher has no private-lesson program assigned. Assign Starter Path or
                    Hybrid Pack before setting private availability.
                  </p>
                </div>
              )}
              <div className="ll-weekly-editor">
                {days.map((day, i) => (
                  <div key={day} className="ll-weekly-row">
                    <div>
                      <strong>{day}</strong>
                      <button
                        type="button"
                        className="ll-icon-button"
                        aria-label={`Add ${day} availability`}
                        onClick={() =>
                          setWindows([
                            ...windows,
                            { id: crypto.randomUUID(), day: i, start: '09:00', end: '12:00' },
                          ])
                        }
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {windows.filter((w) => w.day === i).length ? (
                      windows
                        .filter((w) => w.day === i)
                        .map((w) => (
                          <div className="ll-time-range" key={w.id}>
                            <input
                              aria-label={`${day} start time`}
                              type="time"
                              required
                              step="900"
                              value={w.start}
                              onChange={(e) =>
                                setWindows(
                                  windows.map((window) =>
                                    window.id === w.id
                                      ? { ...window, start: e.target.value }
                                      : window
                                  )
                                )
                              }
                            />
                            <span>to</span>
                            <input
                              aria-label={`${day} end time`}
                              type="time"
                              required
                              step="900"
                              value={w.end}
                              onChange={(e) =>
                                setWindows(
                                  windows.map((window) =>
                                    window.id === w.id ? { ...window, end: e.target.value } : window
                                  )
                                )
                              }
                            />
                            <button
                              type="button"
                              className="ll-icon-button"
                              aria-label={`Remove ${day} ${w.start} window`}
                              onClick={() =>
                                setWindows(windows.filter((window) => window.id !== w.id))
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))
                    ) : (
                      <span className="ll-unavailable">Unavailable</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="ll-info-note">
                <ShieldCheck size={18} />
                <p>
                  Changes affect available hours. Existing booked lessons will need a separate
                  cancellation and a new reservation when a time must change.
                </p>
              </div>
              {error && (
                <p className="ll-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="ll-drawer-footer">
              <button type="button" className="ll-button secondary" onClick={closePanel}>
                Cancel
              </button>
              <button
                className="ll-button primary"
                disabled={
                  !selected.programs.some((id) => programs.find((p) => p.id === id)?.private)
                }
                type="submit"
              >
                Save availability <Check size={16} />
              </button>
            </footer>
          </form>
        </Drawer>
      )}

      {panel === 'group' && selected && (
        <Drawer
          title={
            selected.groups.some((g) => g.id === group.id)
              ? 'Edit group session'
              : 'Bring a small group together'
          }
          eyebrow="50-MINUTE GROUP SESSION"
          onClose={closePanel}
        >
          <form className="ll-drawer-form" onSubmit={saveGroup}>
            <div className="ll-form-body">
              <p className="ll-form-intro">
                Create a session for one program. Students assigned to this teacher will be eligible
                to reserve a seat.
              </p>
              <label className="ll-field">
                <span>
                  Program <b>*</b>
                </span>
                <select
                  required
                  value={group.program}
                  onChange={(e) => setGroup({ ...group, program: e.target.value })}
                >
                  <option value="">Choose a program</option>
                  {programs
                    .filter((p) => p.group && selected.programs.includes(p.id))
                    .map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="ll-field">
                <span>
                  Lesson title <span className="ll-optional">Optional</span>
                </span>
                <input
                  maxLength={80}
                  placeholder="e.g. Everyday conversations"
                  value={group.title}
                  onChange={(e) => setGroup({ ...group, title: e.target.value })}
                />
              </label>
              <div className="ll-form-columns">
                <label className="ll-field">
                  <span>
                    Date <b>*</b>
                  </span>
                  <input
                    type="date"
                    min={
                      selected.groups.some((g) => g.id === group.id)
                        ? undefined
                        : dateKey(new Date())
                    }
                    required
                    value={group.date}
                    onChange={(e) => setGroup({ ...group, date: e.target.value })}
                  />
                </label>
                <label className="ll-field">
                  <span>
                    Start time <b>*</b>
                  </span>
                  <input
                    required
                    type="time"
                    max="23:10"
                    value={group.start}
                    onChange={(e) => setGroup({ ...group, start: e.target.value })}
                  />
                </label>
              </div>
              <div className="ll-session-summary">
                <div>
                  <Clock3 size={17} />
                  <span>
                    {group.start} – {timeLabel(minutes(group.start) + 50)}
                    <small>{selected.timezone} · 50 minutes</small>
                  </span>
                </div>
                <div>
                  <Users size={17} />
                  <span>
                    {capacities[group.program]
                      ? `${capacities[group.program]} seats available`
                      : 'Capacity not set'}
                    <small>
                      {capacities[group.program]
                        ? 'Managed by admin in Programs & rules'
                        : 'Ask an admin to choose 3–5 seats in Programs & rules.'}
                    </small>
                  </span>
                </div>
              </div>
              <div className="ll-info-note">
                <CheckCircle2 size={18} />
                <p>
                  One student is enough. The session goes ahead at the scheduled time, even if only
                  one seat is booked.
                </p>
              </div>
              {role === 'admin' && (
                <div className="ll-media-fields">
                  <h3>Lesson links</h3>
                  <p className="ll-form-intro">
                    Meeting and recording references for this session.
                  </p>
                  <label className="ll-field">
                    <span>Zoom meeting link</span>
                    <input
                      type="url"
                      pattern="https://.*"
                      placeholder="https://…"
                      value={group.zoom || ''}
                      onChange={(e) => setGroup({ ...group, zoom: e.target.value })}
                    />
                  </label>
                  <label className="ll-field">
                    <span>Private Vimeo recording link</span>
                    <input
                      type="url"
                      pattern="https://.*"
                      placeholder="https://vimeo.com/…"
                      value={group.recording || ''}
                      onChange={(e) => setGroup({ ...group, recording: e.target.value })}
                    />
                    <small>Only students assigned to this session should be able to view it.</small>
                  </label>
                </div>
              )}
              {error && (
                <p role="alert" className="ll-error">
                  {error}
                </p>
              )}
              {selected.groups.some((g) => g.id === group.id) &&
                !bookings.some((b) => b.groupId === group.id) && (
                  <button
                    type="button"
                    className="ll-text-button danger"
                    onClick={async () => {
                      if (
                        !(await updateTeacher({
                          ...selected,
                          groups: selected.groups.filter((g) => g.id !== group.id),
                        }))
                      )
                        return;
                      closePanel();
                      setNotice('Session removed.');
                    }}
                  >
                    <Trash2 size={15} />
                    Remove session
                  </button>
                )}
            </div>
            <footer className="ll-drawer-footer">
              <button type="button" className="ll-button secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="ll-button primary">
                Save session <Check size={16} />
              </button>
            </footer>
          </form>
        </Drawer>
      )}

      {panel === 'time-off' && selected && (
        <Drawer title="A little breathing room" eyebrow="TIME OFF" onClose={closePanel}>
          <form className="ll-drawer-form" onSubmit={saveOff}>
            <div className="ll-form-body">
              <p className="ll-form-intro">
                Block a whole day without changing your regular weekly schedule.
              </p>
              <label className="ll-field">
                <span>
                  Date <b>*</b>
                </span>
                <input
                  type="date"
                  required
                  min={dateKey(new Date())}
                  value={offDate}
                  onChange={(e) => setOffDate(e.target.value)}
                />
              </label>
              <div className="ll-timezone-note">
                <Clock3 size={17} />
                {selected.timezone}
              </div>
              <div className="ll-info-note">
                <Info size={18} />
                <p>
                  Private availability is hidden for this date. If a group session exists, review it
                  first. Time off won’t silently cancel lessons.
                </p>
              </div>
              {error && (
                <p role="alert" className="ll-error">
                  {error}
                </p>
              )}
            </div>
            <footer className="ll-drawer-footer">
              <button type="button" className="ll-button secondary" onClick={closePanel}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="ll-button primary">
                Add time off <Check size={16} />
              </button>
            </footer>
          </form>
        </Drawer>
      )}

      {pendingStatus && (
        <Drawer
          title={
            pendingStatus.status === 'active'
              ? 'Pause new bookings'
              : 'Ready to meet your students?'
          }
          eyebrow="REVIEW TEACHER STATUS"
          onClose={() => setPendingStatus(null)}
        >
          <div className="ll-form-body">
            <div className="ll-teacher-top">
              <Avatar teacher={pendingStatus} large />
              <div>
                <h3>{pendingStatus.name}</h3>
                <p>{pendingStatus.email}</p>
              </div>
            </div>
            <p className="ll-form-intro">
              {pendingStatus.status === 'active'
                ? 'Deactivation will hide this teacher from new selections. Existing reservations remain visible and can be managed in the lesson list.'
                : 'Review the profile and availability before marking this teacher active in the workspace.'}
            </p>
            <div className="ll-review-checklist">
              {[
                { text: 'Name and email', done: !!pendingStatus.name && !!pendingStatus.email },
                { text: 'Introduction', done: !!pendingStatus.bio },
                { text: 'Assigned programs', done: !!pendingStatus.programs.length },
                {
                  text: 'Calendar availability',
                  done: !!(pendingStatus.weekly.length || pendingStatus.groups.length),
                },
              ].map((item) => (
                <div key={item.text}>
                  <CheckCircle2 size={18} className={item.done ? 'ready' : ''} />
                  <span>{item.text}</span>
                  <small>{item.done ? 'Ready' : 'Not added'}</small>
                </div>
              ))}
            </div>
          </div>
          <footer className="ll-drawer-footer">
            <button className="ll-button secondary" onClick={() => setPendingStatus(null)}>
              Keep current status
            </button>
            <button
              className="ll-button primary"
              disabled={
                pendingStatus.status !== 'active' &&
                !(
                  pendingStatus.bio &&
                  pendingStatus.programs.length &&
                  (pendingStatus.weekly.length || pendingStatus.groups.length)
                )
              }
              onClick={async () => {
                if (
                  !(await updateTeacher({
                    ...pendingStatus,
                    status: pendingStatus.status === 'active' ? 'inactive' : 'active',
                  }))
                )
                  return;
                setPendingStatus(null);
                setNotice('Teacher status updated.');
              }}
            >
              {pendingStatus.status === 'active' ? 'Deactivate teacher' : 'Activate teacher'}
            </button>
          </footer>
        </Drawer>
      )}
      {lesson && (
        <Drawer
          title="Private lesson details"
          eyebrow="30-MINUTE ONE-TO-ONE LESSON"
          onClose={() => setLesson(null)}
        >
          <form
            className="ll-drawer-form"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await updateBooking(lesson.id, 'media', lesson.zoom, lesson.recording);
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Could not save links.');
                return;
              }
              setLesson(null);
              setNotice('Lesson references saved.');
            }}
          >
            <div className="ll-form-body">
              <div className="ll-session-summary">
                <div>
                  <CalendarDays size={18} />
                  <span>
                    {lesson.date} · {lesson.start}
                    <small>{teachers.find((t) => t.id === lesson.teacherId)?.timezone}</small>
                  </span>
                </div>
                <div>
                  <UserRound size={18} />
                  <span>
                    Student reservation<small>Private lesson reservation</small>
                  </span>
                </div>
              </div>
              <p className="ll-form-intro">
                This booking stays in place when weekly availability changes. Rescheduling is a
                separate action.
              </p>
              <label className="ll-field">
                <span>Zoom meeting link</span>
                <input
                  type="url"
                  pattern="https://.*"
                  placeholder="https://…"
                  readOnly={false}
                  value={lesson.zoom || ''}
                  onChange={(e) => setLesson({ ...lesson, zoom: e.target.value })}
                />
              </label>
              <label className="ll-field">
                <span>Private Vimeo recording link</span>
                <input
                  type="url"
                  pattern="https://.*"
                  placeholder="https://vimeo.com/…"
                  readOnly={false}
                  value={lesson.recording || ''}
                  onChange={(e) => setLesson({ ...lesson, recording: e.target.value })}
                />
              </label>
              <div className="ll-info-note">
                <ShieldCheck size={18} />
                <p>
                  The recording belongs to this lesson and is intended only for its attending
                  student. Students can open this link from their dashboard until its access period
                  ends.
                </p>
              </div>
            </div>
            <footer className="ll-drawer-footer">
              <button type="button" className="ll-button secondary" onClick={() => setLesson(null)}>
                Close
              </button>
              {(role === 'admin' || role === 'teacher') && (
                <button type="submit" disabled={busy} className="ll-button primary">
                  Save lesson links <Check size={16} />
                </button>
              )}
            </footer>
          </form>
        </Drawer>
      )}
      {notice && (
        <div className="ll-toast" role="status">
          <CheckCircle2 size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
