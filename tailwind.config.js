/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './{components,contexts,hooks,data,lib,types,src}/**/*.{ts,tsx,js,jsx}',
  ],
  // These classes are built from a runtime variable (CoursesSection course-card
  // hover shadow), so the content scanner cannot see the full literal. Safelist
  // them so the colored hover shadow survives production purge.
  safelist: [
    'hover:shadow-[#AB8FFF]/20',
    'hover:shadow-[#FFC1F2]/20',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
