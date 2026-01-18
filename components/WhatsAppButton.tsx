
import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton: React.FC = () => {
  const whatsappUrl = "https://wa.me/393518459607";

  return (
    <div className="fixed bottom-8 right-8 z-[200] flex flex-col items-end gap-3 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-gray-100 animate-reveal opacity-0 stagger-3 pointer-events-auto">
        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Chat with us</p>
      </div>
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-center w-16 h-16 bg-[#25D366] text-white rounded-full shadow-2xl shadow-green-500/40 hover:scale-110 active:scale-95 transition-all duration-300 pointer-events-auto"
        aria-label="Chat on WhatsApp"
      >
        <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
        <MessageCircle size={32} strokeWidth={2.5} />
      </a>
    </div>
  );
};

export default WhatsAppButton;
