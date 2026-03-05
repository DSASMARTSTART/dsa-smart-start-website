
import React, { useState } from 'react';
import { Search, Map, Rocket, ChevronRight } from 'lucide-react';
import AssessmentPopup from './AssessmentPopup';
import { useTranslation } from 'react-i18next';

interface CareerSectionProps {
  onNavigate?: (path: string) => void;
}

const CareerSection: React.FC<CareerSectionProps> = ({ onNavigate }) => {
  const { t } = useTranslation('home');
  const [showAssessment, setShowAssessment] = useState(false);

  const steps = [
    {
      icon: <Search className="text-purple-400" />,
      title: t('career.step1Title'),
      desc: t('career.step1Desc'),
      cta: t('career.step1Cta'),
      action: () => setShowAssessment(true),
    },
    {
      icon: <Map className="text-blue-400" />,
      title: t('career.step2Title'),
      desc: t('career.step2Desc'),
      cta: t('career.step2Cta'),
      action: () => onNavigate?.('courses'),
    },
    {
      icon: <Rocket className="text-pink-400" />,
      title: t('career.step3Title'),
      desc: t('career.step3Desc'),
      cta: t('career.step3Cta'),
      action: () => setShowAssessment(true),
    }
  ];

  return (
    <section className="py-32 px-6 bg-black text-white overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[150px] translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[150px] -translate-x-1/2 translate-y-1/2"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-24 animate-reveal">
          <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter leading-tight">
            {t('career.title', { defaultValue: '' }).split('<1>')[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{t('career.title', { defaultValue: '' }).match(/<1>(.*?)<\/1>/)?.[1]}</span>{t('career.title', { defaultValue: '' }).split('</1>')[1]}
          </h2>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12 font-medium">
            {t('career.subtitle')}
          </p>
          <button className="bg-[#25D366] hover:bg-[#1ebe5d] text-white px-14 py-5 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-[#25D366]/30 active:scale-95">
            {t('career.bookNow')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {steps.map((step, i) => (
            <div key={i} className="group bg-white/5 p-10 rounded-[2.5rem] border border-white/10 hover:border-purple-500/50 transition-all duration-500 animate-reveal" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all">
                {step.icon}
              </div>
              <h4 className="text-2xl font-bold mb-4 tracking-tight">{step.title}</h4>
              <p className="text-gray-400 leading-relaxed font-medium mb-6">{step.desc}</p>
              <button
                onClick={step.action}
                className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest text-purple-400 hover:text-white transition-colors group/btn"
              >
                {step.cta}
                <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Assessment Popup */}
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

export default CareerSection;
