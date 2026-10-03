import base from './tailwind.config.js';

// Public pages and their shared dialogs. Protected dashboards, quizzes, and
// nested admin/live-learning components receive the complete workspace sheet.
export default {
  ...base,
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/*.{ts,tsx}',
    './{contexts,hooks,data,lib,types,src}/**/*.{ts,tsx,js,jsx}',
    '!./components/{DashboardPage,CourseViewer,QuizCheckpoint,QuizRenderer,FinalTestRenderer}.tsx',
    '!./**/*.test.{ts,tsx}',
  ],
};
