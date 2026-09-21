import React, { useRef, useState } from 'react';
import { ArrowRight, CalendarDays, GraduationCap, Play, UserRound, Video } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Course } from '../../types';
import { getLocalizedTitle } from '../../hooks/useLocalizedCourse';
import { liveLearningPath, liveProgramFor } from './catalog';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveLearning } from './LiveLearningContext';
import { lessonProgress } from './progress';
import LessonList from './LessonList';
import LiveMaterials from './LiveMaterials';

type Props = { courses: Course[]; onNavigate?: (path: string) => void };
type View = 'upcoming' | 'history' | 'materials';
export default function LiveProgramCards({ courses, onNavigate }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const { selections, teachers, bookings, loading, error, refresh } = useLiveLearning();
  const [chosen, setChosen] = useState('');
  const [view, setView] = useState<View>('upcoming');
  const library = useRef<HTMLDivElement>(null);
  const selectedCourse = courses.find((c) => c.id === chosen) || courses[0];
  const navigate = (path: string) =>
    onNavigate ? onNavigate(path) : (window.location.hash = `#${path}`);
  if (!courses.length) return null;
  const labels = ['completed', 'scheduled', 'otherUsed', 'remaining'] as const;
  const colors = ['#a78bfa', '#38bdf8', '#fbbf24', '#303038'];
  return (
    <section className="mb-12" aria-labelledby="live-lessons-heading">
      <div className="mb-6">
        <h2
          id="live-lessons-heading"
          className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3"
        >
          <GraduationCap size={23} className="text-[#AB8FFF]" />
          {t('live.title')}
        </h2>
        <p className="text-gray-400 text-sm mt-3">{t('live.hub.body')}</p>
      </div>
      {loading ? (
        <p role="status" className="text-gray-400">
          {t('live.loading')}
        </p>
      ) : error ? (
        <p role="alert" className="text-red-300 mb-4">
          {error}{' '}
          <button className="underline" onClick={() => void refresh()}>
            {t('live.retry')}
          </button>
        </p>
      ) : (
        <>
          <div className="grid gap-6">
            {courses.map((course) => {
              const program = liveProgramFor(course);
              if (!program) return null;
              const teacher = teachers.find(
                (x) =>
                  x.id === selections[course.id] &&
                  x.status === 'active' &&
                  x.programs.includes(program.id)
              );
              const stats = lessonProgress(bookings, user?.id, course.id, program);
              let offset = 0;
              const chart = labels
                .map((key, index) => {
                  const start = offset;
                  offset += (stats[key] / Math.max(1, stats.total)) * 100;
                  return `${colors[index]} ${start}% ${offset}%`;
                })
                .join(',');
              const path = liveLearningPath(course.id, teacher?.id);
              return (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-[#101014]"
                >
                  <div className="grid gap-8 p-6 md:p-8 lg:grid-cols-[1fr_1fr]">
                    <div className="min-w-0">
                      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-purple-300">
                        {t('live.badge')}
                      </p>
                      <h3 className="text-2xl font-bold text-white">
                        {getLocalizedTitle(course, i18n.language)}
                      </h3>
                      <div className="mt-6 flex flex-wrap items-center gap-6">
                        <div
                          role="img"
                          aria-label={t('live.hub.chartLabel', stats)}
                          className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
                          style={{ background: `conic-gradient(${chart})` }}
                        >
                          <div
                            className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#101014]"
                            aria-hidden="true"
                          >
                            <span className="text-3xl font-bold text-white">
                              {stats.completed}
                              <span className="text-sm font-normal text-gray-400">
                                {' '}
                                / {stats.total}
                              </span>
                            </span>
                            <span className="mt-1 text-xs text-gray-400">
                              {t('live.hub.completed')}
                            </span>
                          </div>
                        </div>
                        <dl className="min-w-[140px] flex-1 space-y-2.5 text-sm">
                          {labels
                            .filter((key) => key !== 'otherUsed' || stats.otherUsed > 0)
                            .map((key) => (
                              <div key={key} className="flex items-center justify-between gap-6">
                                <dt className="flex items-center gap-2 text-gray-300">
                                  <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ background: colors[labels.indexOf(key)] }}
                                  />
                                  {t(`live.hub.${key}`)}
                                </dt>
                                <dd className="font-semibold text-white">{stats[key]}</dd>
                              </div>
                            ))}
                        </dl>
                      </div>
                      <p className="mt-5 text-sm text-gray-300">
                        {t('live.creditsRemaining', { count: stats.remaining })}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">
                        {[
                          program.group > 0 &&
                            t('live.hub.groupBalance', { count: stats.groupRemaining }),
                          program.private > 0 &&
                            t('live.hub.privateBalance', { count: stats.privateRemaining }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {stats.otherUsed > 0 && (
                        <p className="mt-2 text-xs text-amber-200/80">{t('live.hub.otherHelp')}</p>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col justify-between gap-5 lg:border-l lg:border-white/10 lg:pl-8">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/15 text-purple-300">
                          {teacher?.photo ? (
                            <img
                              src={teacher.photo}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <UserRound size={21} />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">{t('live.hub.yourTeacher')}</p>
                          <p className="mt-1 font-semibold text-white">
                            {teacher?.name || t('live.hub.noTeacher')}
                          </p>
                        </div>
                        {teacher && (
                          <button
                            className="ml-auto text-sm text-purple-300 underline underline-offset-4"
                            onClick={() => navigate(liveLearningPath(course.id))}
                          >
                            {t('live.hub.change')}
                          </button>
                        )}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                        <p className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                          <CalendarDays size={15} />
                          {t('live.hub.nextLesson')}
                        </p>
                        {stats.next ? (
                          <>
                            <p className="mt-3 font-semibold text-white">{stats.next.title}</p>
                            <p className="mt-1 text-sm text-gray-300">
                              {new Date(stats.next.startsAt).toLocaleString(i18n.language, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              {teachers.find((x) => x.id === stats.next.teacherId)?.name} ·{' '}
                              {Intl.DateTimeFormat().resolvedOptions().timeZone}
                            </p>
                            {stats.next.zoom && (
                              <a
                                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-purple-300"
                                href={stats.next.zoom}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Video size={16} />
                                {t('live.joinLesson')}
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="mt-3 text-sm text-gray-300">
                            {t(teacher ? 'live.hub.noNextLesson' : 'live.hub.startWithTeacher')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => navigate(teacher ? `${path}&view=book` : path)}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8a3ffc] px-5 py-3.5 text-sm font-semibold text-white hover:bg-purple-500"
                        >
                          {t(teacher ? 'live.hub.bookLesson' : 'live.chooseTeacher')}
                          <ArrowRight size={16} />
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm text-gray-200 hover:bg-white/5"
                          onClick={() => {
                            setChosen(course.id);
                            setView('history');
                            library.current?.scrollIntoView?.({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }}
                        >
                          <Play size={15} />
                          {t('live.hub.replays')}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div ref={library} className="mt-8 scroll-mt-28">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('live.hub.library')}>
                {(['upcoming', 'history', 'materials'] as const).map((tab) => (
                  <button
                    key={tab}
                    aria-pressed={view === tab}
                    onClick={() => setView(tab)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${view === tab ? 'bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/30' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                  >
                    {t(`live.hub.${tab}`)}
                  </button>
                ))}
              </div>
              {courses.length > 1 && (
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  {t('live.materialPackage')}
                  <select
                    className="max-w-full rounded-xl border border-white/15 bg-[#101014] p-3 text-white"
                    value={selectedCourse.id}
                    onChange={(e) => setChosen(e.target.value)}
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {getLocalizedTitle(course, i18n.language)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {view === 'materials' ? (
              <LiveMaterials key={selectedCourse.id} courseId={selectedCourse.id} showUnavailable />
            ) : (
              <LessonList
                key={`${selectedCourse.id}-${view}`}
                courseId={selectedCourse.id}
                view={view}
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}
