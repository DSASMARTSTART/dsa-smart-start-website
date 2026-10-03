import base from './tailwind.config.js';

// Public shell/landing styles are the only render-blocking utilities. Other
// screens load their route utility sheet alongside their page code.
export default {
  ...base,
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/{Navbar,LanguageSwitcher,HeroSection,AboutSection,MissionSection,RootsSection,MethodSection,PathwaysDetail,TestimonialsSection,Footer,WhatsAppButton,CartBubble,ErrorBoundary,OptimizedImage}.tsx',
  ],
};
