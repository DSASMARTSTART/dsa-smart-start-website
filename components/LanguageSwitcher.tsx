import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS, preloadLanguage } from '../lib/i18n';
import type { SupportedLanguage } from '../lib/i18n';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = (i18n.language?.substring(0, 2) || 'en') as SupportedLanguage;
  const currentInfo = LANGUAGE_LABELS[current] || LANGUAGE_LABELS.en;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = async (lng: SupportedLanguage) => {
    setOpen(false);
    await preloadLanguage(lng);          // load bundles first
    await i18n.changeLanguage(lng);      // then switch (also persists to localStorage)
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 text-gray-300 hover:bg-purple-500/20 hover:text-purple-400 transition-all border border-white/10 text-xs font-bold uppercase tracking-wider"
        aria-label="Change language"
      >
        <Globe size={14} />
        <span>{currentInfo.flag} {currentInfo.label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-36 bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-1.5 overflow-hidden animate-reveal z-[120]">
          {SUPPORTED_LANGUAGES.map((lng) => {
            const info = LANGUAGE_LABELS[lng];
            const isActive = lng === current;
            return (
              <button
                key={lng}
                onClick={() => handleChange(lng)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-black uppercase rounded-xl transition-all ${
                  isActive
                    ? 'text-purple-400 bg-purple-500/20'
                    : 'text-gray-300 hover:bg-white/10 hover:text-purple-400'
                }`}
              >
                <span className="text-base">{info.flag}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
