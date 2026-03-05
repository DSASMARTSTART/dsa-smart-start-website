
import React from 'react';
import { Quote, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TestimonialsSection: React.FC = () => {
  const { t } = useTranslation('home');

  const reviews = [
    {
      name: t('testimonials.review1Name'),
      role: t('testimonials.review1Role'),
      text: t('testimonials.review1Text'),
      rating: 5
    },
    {
      name: t('testimonials.review2Name'),
      role: t('testimonials.review2Role'),
      text: t('testimonials.review2Text'),
      rating: 5
    },
    {
      name: t('testimonials.review3Name'),
      role: t('testimonials.review3Role'),
      text: t('testimonials.review3Text'),
      rating: 5
    },
    {
      name: t('testimonials.review4Name'),
      role: t('testimonials.review4Role'),
      text: t('testimonials.review4Text'),
      rating: 5
    },
    {
      name: t('testimonials.review5Name'),
      role: t('testimonials.review5Role'),
      text: t('testimonials.review5Text'),
      rating: 5
    },
    {
      name: t('testimonials.review6Name'),
      role: t('testimonials.review6Role'),
      text: t('testimonials.review6Text'),
      rating: 5
    }
  ];

  return (
    <section className="py-32 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-purple-400 uppercase tracking-[0.3em] mb-4">{t('testimonials.badge')}</h2>
          <h3 className="text-4xl md:text-6xl font-black text-white tracking-tight">{t('testimonials.title', { defaultValue: '' }).split('<1>')[0]}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9b4dff] via-[#8a3ffc] to-[#ff2d85]">{t('testimonials.title', { defaultValue: '' }).match(/<1>(.*?)<\/1>/)?.[1]}</span>{t('testimonials.title', { defaultValue: '' }).split('</1>')[1]}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((rev, i) => (
            <div key={i} className="bg-white/5 p-10 rounded-[2.5rem] border border-white/10 shadow-sm relative group hover:-translate-y-2 transition-all duration-500 flex flex-col">
              <div className="flex gap-1 mb-6">
                {[...Array(rev.rating)].map((_, i) => (
                  <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <Quote className="absolute top-10 right-10 text-purple-500/20 opacity-50 group-hover:text-purple-500/30 transition-colors" size={60} />
              
              <div className="relative z-10 flex-grow">
                <p className="text-gray-300 italic text-lg leading-relaxed mb-8">"{rev.text}"</p>
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <h4 className="font-black text-white">{rev.name}</h4>
                <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1">{rev.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-4 p-4 bg-white/5 rounded-2xl shadow-sm border border-white/10">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="w-10 h-10 rounded-full border-2 border-black bg-gray-600"></div>
              ))}
            </div>
            <p className="text-sm font-bold text-gray-300">{t('testimonials.joinedBy', { defaultValue: '' }).split('<1>')[0]}<span className="text-purple-400">{t('testimonials.joinedBy', { defaultValue: '' }).match(/<1>(.*?)<\/1>/)?.[1]}</span>{t('testimonials.joinedBy', { defaultValue: '' }).split('</1>')[1]}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
