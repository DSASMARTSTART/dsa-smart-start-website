import React from 'react';
import { ArrowRight, GraduationCap, UserRound, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Course } from '../../types';
import { getLocalizedTitle } from '../../hooks/useLocalizedCourse';
import { liveLearningPath, liveProgramFor } from './catalog';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveLearning } from './LiveLearningContext';

type Props = { courses: Course[]; onNavigate?: (path: string) => void };
export default function LiveProgramCards({ courses, onNavigate }: Props) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('dashboard');
  const { selections, teachers, bookings, error, refresh } = useLiveLearning();
  if (!courses.length) return null;
  return (
    <section className="mb-12" aria-labelledby="live-lessons-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2
            id="live-lessons-heading"
            className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3"
          >
            <GraduationCap size={23} className="text-[#AB8FFF]" />
            {t('live.title')}
          </h2>
          <p className="text-gray-400 text-sm mt-3">{t('live.dashboardBody')}</p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-red-300 mb-4">
          {error} <button onClick={() => void refresh()}>{t('live.retry')}</button>
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {courses.map((course) => {
          const program = liveProgramFor(course);
          if (!program) return null;
          const selectedTeacher = teachers.find(
            (teacher) =>
              teacher.id === selections[course.id] &&
              teacher.status === 'active' &&
              teacher.programs.includes(program.id)
          );
          const path = liveLearningPath(course.id, selectedTeacher?.id);
          return (
            <article
              key={course.id}
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 via-white/[0.03] to-pink-500/5 border border-purple-400/20 rounded-[2rem] p-7 md:p-8"
            >
              <span className="inline-flex text-[9px] font-bold uppercase tracking-[0.2em] text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1.5 mb-5">
                {t('live.badge')}
              </span>
              <h3 className="text-2xl font-black tracking-tight text-white mb-3">
                {getLocalizedTitle(course, i18n.language)}
              </h3>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-400 mb-7">
                {program.group > 0 && (
                  <span className="flex items-center gap-2">
                    <Users size={16} className="text-purple-300" />
                    {program.group} {t('live.groupSessions')}
                  </span>
                )}
                {program.private > 0 && (
                  <span className="flex items-center gap-2">
                    <UserRound size={16} className="text-pink-300" />
                    {program.private} {t('live.privateLessons')}
                  </span>
                )}
              </div>
              {selectedTeacher ? (
                <div className="flex items-center gap-3 border-t border-white/10 pt-5 mb-7">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-500/15 text-purple-300">
                    {selectedTeacher.photo ? (
                      <img
                        src={selectedTeacher.photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound size={21} />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{t('live.teacherSelected')}</p>
                    <p className="font-semibold text-white">{selectedTeacher.name}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm leading-relaxed max-w-md mb-7">
                  {t('live.cardBody')}
                </p>
              )}
              <p className="text-sm text-gray-400 mb-5">
                {t('live.creditsRemaining', {
                  count:
                    program.group +
                    program.private -
                    bookings.filter(
                      (b) => b.userId === user?.id && b.courseId === course.id && b.creditUsed
                    ).length,
                })}
              </p>
              <button
                onClick={() =>
                  onNavigate ? onNavigate(path) : (window.location.hash = `#${path}`)
                }
                className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-[#8a3ffc] text-white text-xs font-bold hover:bg-purple-500 transition-colors"
              >
                {t(selectedTeacher ? 'live.viewProfile' : 'live.chooseTeacher')}
                <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
