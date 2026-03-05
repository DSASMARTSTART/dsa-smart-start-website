
import React from 'react';
import { ArrowLeft, Shield, Cookie, RefreshCw, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PolicyPageProps {
  type: 'privacy' | 'cookie' | 'refund' | 'terms';
  onBack: () => void;
}

const POLICY_ICONS = {
  privacy: Shield,
  cookie: Cookie,
  refund: RefreshCw,
  terms: FileText,
};

const PolicyPage: React.FC<PolicyPageProps> = ({ type, onBack }) => {
  const { t } = useTranslation('policies');

  const Icon = POLICY_ICONS[type];
  const title = t(`${type}.title`);
  const lastUpdated = t(`${type}.lastUpdated`);
  const content = t(`${type}.content`, { returnObjects: true }) as { heading: string; text: string }[];

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-purple-400 mb-8 font-medium transition-colors"
        >
          <ArrowLeft size={20} />
          {t('backToHome')}
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
            <Icon size={40} className="text-purple-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
            {title}
          </h1>
          <p className="text-gray-500 font-medium">
            {t('lastUpdatedLabel', { date: lastUpdated })}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white/5 rounded-3xl shadow-xl shadow-purple-500/10 p-8 md:p-12 border border-white/10">
          <div className="space-y-10">
            {content.map((section, index) => (
              <div key={index}>
                <h2 className="text-xl font-bold text-white mb-4">
                  {section.heading}
                </h2>
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">
                  {section.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">{t('ctaQuestion')}</p>
          <a
            href="mailto:office@eduway.academy"
            className="inline-flex items-center gap-2 text-purple-400 font-bold hover:text-purple-300 transition-colors"
          >
            {t('ctaContact')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;
