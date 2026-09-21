import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Loader2,
  Play,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { enrollmentsApi } from '../../data/supabaseStore';
import type { Course, Enrollment } from '../../types';
import { useLiveLearning } from './LiveLearningContext';
import { hasLiveAccess, liveLearningPath, liveProgramFor } from './catalog';
import { dateKey, teacherNow, weekDates } from './model';
import { liveApi, type Availability } from './api';
import './live-learning.css';
import './live-learning-dark.css';

type Access = Enrollment & { course: Course };
type Props = {
  courseId?: string | null;
  teacherId?: string | null;
  bookingView?: boolean;
  onNavigate: (path: string) => void;
};

export default function LiveLearningPage({
  courseId,
  teacherId,
  bookingView = false,
  onNavigate,
}: Props) {
  const { t } = useTranslation('dashboard');
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const {
    teachers,
    selections,
    selectTeacher,
    bookings,
    settings,
    refresh,
    loading: workspaceLoading,
    error: workspaceError,
  } = useLiveLearning();
  const [availability, setAvailability] = useState<Availability>({ times: [], groups: [] });
  const [slotLoading, setSlotLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [success, setSuccess] = useState('');
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [access, setAccess] = useState<Access[]>([]);
  const [loadedUser, setLoadedUser] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [week, setWeek] = useState(0);
  const [day, setDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState('');
  const [format, setFormat] = useState<'private' | 'group'>('private');

  useEffect(() => {
    let cancelled = false;
    if (!userId) return;
    setError(false);
    setLoadedUser(null);
    enrollmentsApi
      .getByUserWithCourses(userId)
      .then((rows) => {
        if (cancelled) return;
        setAccess(rows.filter((row) => hasLiveAccess(row) && liveProgramFor(row.course)));
        setLoadedUser(userId);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoadedUser(userId);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userId, retry]);

  useEffect(() => {
    setWeek(0);
    setDay((new Date().getDay() + 6) % 7);
    setSelectedTime('');
  }, [courseId, teacherId]);

  const enrollment = access.find((item) => item.courseId === courseId);
  const program = enrollment && liveProgramFor(enrollment.course);
  const eligible = teachers.filter(
    (teacher) => teacher.status === 'active' && teacher.programs.includes(program?.id || '')
  );
  const teacher = eligible.find((item) => item.id === teacherId);
  const dates = weekDates(week, teacher?.timezone);
  const now = teacherNow(teacher?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const selectedDate = dateKey(dates[day]);
  const privateTimes = availability.times;
  const groups = availability.groups;
  useEffect(() => {
    let cancelled = false;
    if (!courseId || !teacherId || !userId) return;
    const load = async () => {
      setSlotLoading(true);
      try {
        const result = await liveApi.availability(courseId, teacherId, selectedDate);
        if (!cancelled) {
          setAvailability(result);
          setAvailabilityError('');
        }
      } catch (err) {
        if (!cancelled) {
          setAvailability({ times: [], groups: [] });
          setAvailabilityError(err instanceof Error ? err.message : t('live.errorBody'));
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    };
    void load();
    const interval = window.setInterval(load, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [courseId, teacherId, userId, selectedDate, availabilityVersion, t]);
  const loadedTeacherId = teacher?.id;
  useEffect(() => {
    if (bookingView && loadedTeacherId && loadedUser === userId && !workspaceLoading) {
      document.getElementById('teacher-availability')?.scrollIntoView?.({ block: 'start' });
    }
  }, [bookingView, loadedTeacherId, loadedUser, userId, workspaceLoading]);
  const currentFormat =
    program?.private && program?.group ? format : program?.group ? 'group' : 'private';
  const rules = program ? settings[program.id] : undefined;
  const creditsRemaining = Math.max(
    0,
    (currentFormat === 'private' ? program?.private || 0 : program?.group || 0) -
      bookings.filter(
        (b) =>
          b.userId === userId && b.courseId === courseId && b.kind === currentFormat && b.creditUsed
      ).length
  );

  function stateScreen(
    title: string,
    description: string,
    action?: { label: string; run: () => void }
  ) {
    return (
      <div className="ll-studio ll-dark ll-platform-page">
        <div className="ll-platform-container">
          <button className="ll-back" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={17} />
            {t('live.back')}
          </button>
          <section className="ll-platform-state">
            <span className="ll-profile-icon">
              <GraduationCap size={35} />
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
            {action && (
              <button className="ll-button primary" onClick={action.run}>
                {action.label}
                <ArrowRight size={16} />
              </button>
            )}
          </section>
        </div>
      </div>
    );
  }
  if (authLoading || workspaceLoading || (user && loadedUser !== user.id))
    return (
      <div className="ll-studio ll-dark ll-platform-page">
        <div className="ll-platform-state" role="status">
          <Loader2 className="animate-spin" size={28} />
          <p>{t('live.loading')}</p>
        </div>
      </div>
    );
  if (!user)
    return stateScreen(t('live.signInTitle'), t('live.signInBody'), {
      label: t('live.signIn'),
      run: () => onNavigate('login'),
    });
  if (error || workspaceError)
    return stateScreen(t('live.errorTitle'), t('live.errorBody'), {
      label: t('live.retry'),
      run: () => {
        setRetry((value) => value + 1);
        void refresh();
      },
    });
  if (!program || !enrollment)
    return stateScreen(t('live.accessTitle'), t('live.accessBody'), {
      label: t('live.back'),
      run: () => onNavigate('dashboard'),
    });
  if (teacherId && !teacher)
    return stateScreen(t('live.unavailableTitle'), t('live.unavailableBody'), {
      label: t('live.allTeachers'),
      run: () => onNavigate(liveLearningPath(enrollment.courseId)),
    });

  return (
    <div className="ll-studio ll-dark ll-platform-page">
      <div className="ll-platform-container">
        {(actionError || availabilityError || success) && (
          <p
            role={actionError || availabilityError ? 'alert' : 'status'}
            className={actionError || availabilityError ? 'll-error' : 'll-info-note'}
          >
            {actionError || availabilityError || success}
          </p>
        )}
        <div className="ll-platform-breadcrumb">
          <button className="ll-back" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={17} />
            {t('live.back')}
          </button>
          <span>
            {program.name}
            <ChevronRight size={13} />
            {teacher ? teacher.name : t('live.chooseTeacher')}
          </span>
        </div>
        {!teacher ? (
          <>
            <header className="ll-platform-heading">
              <span className="ll-eyebrow">{t('live.badge')}</span>
              <h1>
                {t('live.chooseTitle')}
                <span>.</span>
              </h1>
              <p>{t('live.chooseBody')}</p>
            </header>
            <div className="ll-product-layout">
              <section className="ll-teacher-directory">
                <div className="ll-directory-toolbar">
                  <h2>
                    {t('live.teachers')} <span>{eligible.length}</span>
                  </h2>
                  <label className="ll-search">
                    <Search size={18} />
                    <input
                      aria-label={t('live.search')}
                      placeholder={t('live.search')}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                </div>
                {eligible.length === 0 ? (
                  <div className="ll-directory-empty">
                    <div className="ll-empty-orbit">
                      <GraduationCap size={38} />
                    </div>
                    <h2>{t('live.emptyTitle')}</h2>
                    <p>{t('live.emptyBody')}</p>
                    <button className="ll-button secondary" onClick={() => onNavigate('contact')}>
                      {t('live.contact')}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="ll-directory-grid">
                    {eligible
                      .filter((item) =>
                        `${item.name} ${item.languages}`
                          .toLowerCase()
                          .includes(search.toLowerCase())
                      )
                      .map((item) => (
                        <article className="ll-directory-card" key={item.id}>
                          <button
                            className="ll-teacher-image"
                            aria-label={`${t('live.viewProfile')}: ${item.name}`}
                            onClick={() =>
                              onNavigate(liveLearningPath(enrollment.courseId, item.id))
                            }
                          >
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} />
                            ) : (
                              <span>
                                {item.name
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((part) => part[0])
                                  .join('')}
                              </span>
                            )}
                            <span className="ll-teacher-stamp">
                              <GraduationCap size={14} />
                              {t('live.teacher')}
                            </span>
                          </button>
                          <div className="ll-directory-card-body">
                            <h3>{item.name}</h3>
                            <span className="ll-teaching-languages">{item.languages}</span>
                            <p>{item.bio || t('live.introFallback')}</p>
                            <div className="ll-profile-formats">
                              {program.group > 0 && (
                                <span>
                                  <Users size={14} />
                                  {t('live.group')}
                                </span>
                              )}
                              {program.private > 0 && (
                                <span>
                                  <UserRound size={14} />
                                  {t('live.private')}
                                </span>
                              )}
                            </div>
                            <button
                              className="ll-button primary"
                              onClick={() =>
                                onNavigate(liveLearningPath(enrollment.courseId, item.id))
                              }
                            >
                              {t('live.viewProfile')}
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
                {eligible.length > 0 &&
                  !eligible.some((item) =>
                    `${item.name} ${item.languages}`.toLowerCase().includes(search.toLowerCase())
                  ) && (
                    <div className="ll-directory-empty">
                      <Search size={28} />
                      <h2>{t('live.noResults')}</h2>
                      <button className="ll-button secondary" onClick={() => setSearch('')}>
                        {t('live.clearSearch')}
                      </button>
                    </div>
                  )}
              </section>
              <aside className="ll-enrolled-package">
                <span className="ll-eyebrow">{t('live.yourPackage')}</span>
                <h2>{program.name}</h2>
                <p>{t('live.packageBody')}</p>
                <div className="ll-package-included">
                  {program.group > 0 && (
                    <div>
                      <Users size={21} />
                      <span>
                        <strong>{program.group}</strong>
                        {t('live.groupSessions')}
                        <small>50 {t('live.minutes')}</small>
                      </span>
                    </div>
                  )}
                  {program.private > 0 && (
                    <div>
                      <UserRound size={21} />
                      <span>
                        <strong>{program.private}</strong>
                        {t('live.privateLessons')}
                        <small>30 {t('live.minutes')}</small>
                      </span>
                    </div>
                  )}
                </div>
                <div className="ll-package-note">
                  <ShieldCheck size={18} />
                  <p>
                    {t(
                      program.group && program.private
                        ? 'live.sameTeacher'
                        : 'live.personalGuidance'
                    )}
                  </p>
                </div>
                <div className="ll-next-steps">
                  <span>01</span>
                  <p>{t('live.stepOne')}</p>
                  <span>02</span>
                  <p>{t('live.stepTwo')}</p>
                  <span>03</span>
                  <p>{t('live.stepThree')}</p>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <>
            <section className="ll-full-profile">
              <div className="ll-profile-photo">
                {teacher.photo ? (
                  <img src={teacher.photo} alt={teacher.name} />
                ) : (
                  <span>
                    {teacher.name
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')}
                  </span>
                )}
              </div>
              <div className="ll-profile-intro">
                <span className="ll-eyebrow">
                  <GraduationCap size={15} />
                  {t('live.teacher')}
                </span>
                <h1>{teacher.name}</h1>
                <p className="ll-profile-language">{teacher.languages}</p>
                <div className="ll-profile-formats">
                  {program.group > 0 && (
                    <span>
                      <Users size={16} />
                      {t('live.group')} · 50 {t('live.minutes')}
                    </span>
                  )}
                  {program.private > 0 && (
                    <span>
                      <UserRound size={16} />
                      {t('live.private')} · 30 {t('live.minutes')}
                    </span>
                  )}
                </div>
                <div className="ll-profile-buttons">
                  <button
                    className="ll-button primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setActionError('');
                      setSuccess('');
                      try {
                        if (selections[enrollment.courseId] !== teacher.id) {
                          await selectTeacher(enrollment.courseId, teacher.id);
                        }
                        document
                          .getElementById('teacher-availability')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : t('live.errorBody'));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {selections[enrollment.courseId] === teacher.id ? (
                      <Check size={17} />
                    ) : (
                      <CalendarDays size={17} />
                    )}
                    {selections[enrollment.courseId] === teacher.id
                      ? t('live.hub.bookLesson')
                      : t('live.selectTeacher')}
                  </button>
                  {teacher.video && (
                    <a
                      className="ll-button secondary"
                      href={teacher.video}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Play size={16} />
                      {t('live.watchIntro')}
                    </a>
                  )}
                </div>
              </div>
            </section>
            <div className="ll-profile-details">
              <div>
                <section className="ll-profile-about">
                  <span className="ll-eyebrow">{t('live.getToKnow')}</span>
                  <h2>{t('live.aboutTeacher')}</h2>
                  <p>{teacher.bio || t('live.introFallback')}</p>
                </section>
                <section className="ll-profile-about ll-profile-approach">
                  <ShieldCheck size={23} />
                  <h2>{t('live.yourPace')}</h2>
                  <p>{t('live.yourPaceBody')}</p>
                </section>
              </div>
              <section
                id="teacher-availability"
                className="ll-profile-calendar"
                style={{ scrollMarginTop: 110 }}
              >
                <div className="ll-profile-calendar-heading">
                  <div>
                    <span className="ll-eyebrow">{program.name}</span>
                    <h2>{t('live.availability')}</h2>
                  </div>
                  <CalendarDays size={24} />
                </div>
                <p className="ll-zone-label">
                  <Clock3 size={14} />
                  {teacher.timezone.replaceAll('_', ' ')}
                </p>
                {program.group > 0 && program.private > 0 && (
                  <div className="ll-format-tabs">
                    <button
                      aria-pressed={currentFormat === 'private'}
                      onClick={() => {
                        setFormat('private');
                        setSelectedTime('');
                      }}
                    >
                      <UserRound size={15} />
                      {t('live.private')}
                    </button>
                    <button
                      aria-pressed={currentFormat === 'group'}
                      onClick={() => {
                        setFormat('group');
                        setSelectedTime('');
                      }}
                    >
                      <Users size={15} />
                      {t('live.group')}
                    </button>
                  </div>
                )}
                {currentFormat === 'private' ? (
                  <>
                    <div className="ll-profile-week">
                      <button
                        className="ll-icon-button"
                        aria-label={t('live.previousWeek')}
                        disabled={week === 0 || busy}
                        onClick={() => {
                          setWeek(week - 1);
                          setSelectedTime('');
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span>
                        {dates[0].toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        className="ll-icon-button"
                        aria-label={t('live.nextWeek')}
                        disabled={week >= 25 || busy}
                        onClick={() => {
                          setWeek(week + 1);
                          setSelectedTime('');
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <div className="ll-profile-dates">
                      {dates.map((date, index) => (
                        <button
                          key={dateKey(date)}
                          disabled={dateKey(date) < now.date}
                          aria-pressed={day === index}
                          onClick={() => {
                            setDay(index);
                            setSelectedTime('');
                          }}
                        >
                          <span>{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                          <strong>{date.getDate()}</strong>
                        </button>
                      ))}
                    </div>
                    <div className="ll-profile-times" aria-busy={slotLoading}>
                      {slotLoading && <p role="status">{t('live.loading')}</p>}
                      {privateTimes.map((time) => (
                        <button
                          disabled={slotLoading || busy}
                          aria-pressed={selectedTime === time}
                          key={time}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {!slotLoading && !availabilityError && privateTimes.length === 0 && (
                      <div className="ll-availability-empty">
                        <Clock3 size={25} />
                        <h3>{t('live.noTimes')}</h3>
                        <p>{t('live.tryAnotherDay')}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="ll-profile-groups">
                    {groups.length ? (
                      groups.map((group) => (
                        <button
                          key={group.id}
                          disabled={slotLoading || busy}
                          aria-pressed={selectedTime === group.id}
                          onClick={() => setSelectedTime(group.id)}
                        >
                          <CalendarDays size={19} />
                          <span>
                            <strong>{group.title || program.name}</strong>
                            <small>
                              {new Date(`${group.date}T12:00:00`).toLocaleDateString()} ·{' '}
                              {group.start} · 50 {t('live.minutes')}
                            </small>
                            <small>{t('live.seatsLeft', { count: group.seats })}</small>
                          </span>
                          {selectedTime === group.id && <Check size={18} />}
                        </button>
                      ))
                    ) : (
                      <div className="ll-availability-empty">
                        <Users size={25} />
                        <h3>{t('live.noGroups')}</h3>
                        <p>{t('live.checkBack')}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedTime && (
                  <div className="ll-reservation-summary">
                    <strong>
                      {currentFormat === 'private'
                        ? `${dates[day].toLocaleDateString()} · ${selectedTime}`
                        : groups.find((group) => group.id === selectedTime)?.title || program.name}
                    </strong>
                    <p>{t('live.selectedTime')}</p>
                  </div>
                )}
                <div aria-live="polite">
                  {actionError && <p className="ll-error">{actionError}</p>}
                  {success && (
                    <div className="ll-info-note">
                      <p>{success}</p>
                      <button
                        className="ll-button secondary"
                        onClick={() => onNavigate('dashboard')}
                      >
                        {t('live.back')}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="ll-button primary ll-booking-soon"
                  disabled={
                    busy ||
                    slotLoading ||
                    creditsRemaining === 0 ||
                    !selectedTime ||
                    selections[enrollment.courseId] !== teacher.id ||
                    (currentFormat === 'private'
                      ? !privateTimes.includes(selectedTime)
                      : !groups.some((g) => g.id === selectedTime))
                  }
                  onClick={async () => {
                    setBusy(true);
                    setActionError('');
                    setSuccess('');
                    try {
                      await liveApi.book(
                        enrollment.courseId,
                        teacher.id,
                        selectedDate,
                        currentFormat === 'private' ? selectedTime : null,
                        currentFormat === 'group' ? selectedTime : null
                      );
                      await refresh();
                      setSelectedTime('');
                      setSuccess(t('live.bookingConfirmed'));
                    } catch (err) {
                      setActionError(err instanceof Error ? err.message : t('live.errorBody'));
                    } finally {
                      setBusy(false);
                      setAvailabilityVersion((v) => v + 1);
                    }
                  }}
                >
                  {t(busy ? 'live.saving' : 'live.confirmBooking')}
                </button>
                <p className="ll-booking-help">
                  {t(
                    selections[enrollment.courseId] === teacher.id
                      ? 'live.creditExplanation'
                      : 'live.chooseBeforeBooking'
                  )}
                </p>
                <p className="ll-booking-help">
                  {t('live.creditsRemaining', {
                    count: creditsRemaining,
                  })}
                </p>
                {rules && (
                  <div className="ll-booking-help">
                    <p>{t('live.bookingNotice', { count: rules.notice_minutes })}</p>
                    <p>
                      {rules.cancellation_hours === null
                        ? t('live.cancellationContact')
                        : t('live.cancellationCutoff', { count: rules.cancellation_hours })}
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
