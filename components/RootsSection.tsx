
import React, { useState } from 'react';
import { BookOpen, ChevronRight, Sparkles, GraduationCap, ClipboardCheck } from 'lucide-react';
import AssessmentPopup from './AssessmentPopup';
import { AssessmentTestType } from '../types';
import { useTranslation } from 'react-i18next';

interface RootsSectionProps {
  onNavigate?: (path: string) => void;
}

const RootsSection: React.FC<RootsSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation('home');
  const [showAssessment, setShowAssessment] = useState(false);

  const categories = [
    {
      label: t('roots.liveCourses'),
      icon: <GraduationCap size={28} />,
      color: 'from-purple-500 to-pink-600',
      shadow: 'shadow-purple-500/20',
      accent: 'text-purple-400',
      tab: 'courses-live',
    },
    {
      label: t('roots.ebooks'),
      icon: <BookOpen size={28} />,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/20',
      accent: 'text-blue-400',
      tab: 'courses-ebooks',
    },
  ];

  return (
    <section className="py-32 bg-black relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-600 rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-pink-600 rounded-full blur-[120px] opacity-20 animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 mb-6">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">{t('roots.badge')}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">
            {t('roots.title', { defaultValue: '' }).split('<1>')[0]}<span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85] italic px-4">{t('roots.title', { defaultValue: '' }).match(/<1>(.*?)<\/1>/)?.[1]}</span>{t('roots.title', { defaultValue: '' }).split('</1>')[1]}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg leading-relaxed">
            {t('roots.subtitle')}
          </p>
        </div>

        {/* Single Placement Test Button */}
        <div className="flex justify-center mb-20 animate-reveal stagger-1">
          <button
            onClick={() => setShowAssessment(true)}
            className="inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white px-10 py-5 rounded-full font-black uppercase tracking-widest text-lg hover:scale-105 transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
          >
            <ClipboardCheck size={24} />
            {t('roots.placementTest')}
          </button>
        </div>

        {/* Three Category Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20 max-w-3xl mx-auto">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => onNavigate?.(cat.tab)}
              className="group relative bg-white/5 rounded-[2.5rem] p-10 border border-white/10 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 animate-reveal text-left"
              style={{ animationDelay: `${0.15 + i * 0.1}s` }}
            >

              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center mb-8 shadow-lg ${cat.shadow} transform group-hover:-translate-y-2 transition-transform duration-500`}>
                {cat.icon}
              </div>

              <h5 className="text-2xl font-black text-white tracking-tight mb-2">{cat.label}</h5>

              <div className="pt-4 flex items-center">
                <span className={`text-[11px] font-black uppercase tracking-widest ${cat.accent} flex items-center gap-2 group-hover:gap-4 transition-all`}>
                  {t('roots.explore')}
                  <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Still Not Sure CTA */}
        <div className="text-center animate-reveal stagger-3">
          <div className="bg-white/5 p-10 sm:p-12 rounded-[3rem] shadow-lg border border-white/10 max-w-2xl mx-auto">
            <h5 className="text-2xl sm:text-3xl font-black text-white mb-4 tracking-tight">
              {t('roots.stillNotSure')}
            </h5>
            <p className="text-gray-400 max-w-md mx-auto mb-8 text-lg">
              {t('roots.stillNotSureDesc')}
            </p>
            <a 
              href="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0qY73eSZNjDKlM_CQETEMDZFNGB5SONV3eJl2rbRFfK6hT6uNAwz_X4L7Jo0lIbuw-zerkbJWu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-[#25D366] text-white px-10 py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#1ebe5d] transition-all shadow-xl shadow-[#25D366]/30 active:scale-95"
            >
              {t('roots.bookFreeCall')}
              <ChevronRight size={20} />
            </a>
          </div>
        </div>
      </div>

      {/* Assessment Popup — auto-detects age group */}
      <AssessmentPopup
        isOpen={showAssessment}
        onClose={() => setShowAssessment(false)}
        testType="teens_adults"
        autoDetectAge={true}
        onNavigate={onNavigate}
      />
    </section>
  );
};

export default RootsSection;
