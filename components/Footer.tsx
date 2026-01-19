
import React, { useEffect, useState } from 'react';
import { Mail, Phone, MapPin, Instagram, Users, MonitorPlay, FileText, Crown, Diamond } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course } from '../types';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await coursesApi.list({ isPublished: true });
        setCourses(data || []);
      } catch (error) {
        console.error('Footer: Failed to load courses', error);
      }
    };
    loadCourses();
  }, []);

  const handleLinkClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      window.location.hash = path === 'home' ? '' : `#${path}`;
    }
  };

  // Helper to find course by level and type
  const findCourse = (level: string, productType: string) => {
    return courses.find(c => c.level === level && c.productType === productType);
  };

  // Navigate to course detail page
  const goToCourse = (level: string, productType: string) => {
    const course = findCourse(level, productType);
    if (course) {
      const route = productType === 'ebook' ? `#ebook-${course.id}` : `#syllabus-${course.id}`;
      window.location.hash = route;
    } else {
      // Fallback to courses page
      window.location.hash = '#courses';
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* About Column */}
        <div className="lg:col-span-1">
          <h4 className="text-white text-xl font-bold mb-6">DSA SMART START</h4>
          <p className="text-sm leading-loose mb-8">
            The first program in the world specifically designed for those living with dyslexia, helping them achieve amazing results and make learning fun.
          </p>
          <div className="flex gap-4">
            <a href="https://www.instagram.com/dsasmartstart/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors" aria-label="Follow us on Instagram"><Instagram size={18} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-3 text-sm">
            <li><button onClick={() => handleLinkClick('home')} className="hover:text-purple-400 transition-colors">Home</button></li>
            <li><button onClick={() => handleLinkClick('who-we-are')} className="hover:text-purple-400 transition-colors">Who We Are</button></li>
            <li><button onClick={() => handleLinkClick('courses')} className="hover:text-purple-400 transition-colors">All Courses</button></li>
            <li><button onClick={() => handleLinkClick('contact')} className="hover:text-purple-400 transition-colors">Contact</button></li>
            <li><button onClick={() => handleLinkClick('faq')} className="hover:text-purple-400 transition-colors">FAQ</button></li>
            <li><button onClick={() => handleLinkClick('login')} className="hover:text-purple-400 transition-colors">Login / Register</button></li>
          </ul>
        </div>

        {/* Online & Interactive Courses */}
        <div>
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <Users size={16} className="text-violet-400" />
            Online Courses
          </h4>
          <ul className="space-y-3 text-sm mb-6">
            <li>
              <button onClick={() => goToCourse('premium', 'service')} className="hover:text-purple-400 transition-colors text-left flex items-center gap-2">
                <Crown size={12} className="text-violet-400" />
                Premium Program
              </button>
            </li>
            <li>
              <button onClick={() => goToCourse('golden', 'service')} className="hover:text-purple-400 transition-colors text-left flex items-center gap-2">
                <Diamond size={12} className="text-amber-400" />
                Golden Program
              </button>
            </li>
          </ul>
          
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <MonitorPlay size={16} className="text-purple-400" />
            Interactive Courses
          </h4>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => goToCourse('A1', 'learndash')} className="hover:text-purple-400 transition-colors text-left">A1 Beginner</button></li>
            <li><button onClick={() => goToCourse('A2', 'learndash')} className="hover:text-purple-400 transition-colors text-left">A2 Elementary</button></li>
            <li><button onClick={() => goToCourse('B1', 'learndash')} className="hover:text-purple-400 transition-colors text-left">B1 Intermediate</button></li>
            <li><button onClick={() => goToCourse('kids-basic', 'learndash')} className="hover:text-purple-400 transition-colors text-left">Kids Basic</button></li>
            <li><button onClick={() => goToCourse('kids-medium', 'learndash')} className="hover:text-purple-400 transition-colors text-left">Kids Medium</button></li>
            <li><button onClick={() => goToCourse('kids-advanced', 'learndash')} className="hover:text-purple-400 transition-colors text-left">Kids Advanced</button></li>
          </ul>
        </div>

        {/* E-books Column */}
        <div>
          <h4 className="text-white font-bold mb-4 flex items-center gap-2">
            <FileText size={16} className="text-pink-400" />
            E-books
          </h4>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Adults & Teens</p>
          <ul className="space-y-2 text-sm mb-4">
            <li><button onClick={() => goToCourse('A1', 'ebook')} className="hover:text-purple-400 transition-colors text-left">A1 Beginner E-book</button></li>
            <li><button onClick={() => goToCourse('A2', 'ebook')} className="hover:text-purple-400 transition-colors text-left">A2 Elementary E-book</button></li>
            <li><button onClick={() => goToCourse('B1', 'ebook')} className="hover:text-purple-400 transition-colors text-left">B1 Intermediate E-book</button></li>
          </ul>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Kids</p>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => goToCourse('kids-basic', 'ebook')} className="hover:text-purple-400 transition-colors text-left">Kids Basic E-book</button></li>
            <li><button onClick={() => goToCourse('kids-medium', 'ebook')} className="hover:text-purple-400 transition-colors text-left">Kids Medium E-book</button></li>
            <li><button onClick={() => goToCourse('kids-advanced', 'ebook')} className="hover:text-purple-400 transition-colors text-left">Kids Advanced E-book</button></li>
          </ul>
        </div>

        {/* Contact Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Contact Us</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Phone size={16} className="text-purple-500" />
              +39 351 8459607
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-purple-500" />
              dsa.smart.start@gmail.com
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="text-purple-500 shrink-0" />
              Viale Bonaria, 90, 09125 Cagliari
            </li>
            <li className="pt-4"><button onClick={() => handleLinkClick('faq')} className="hover:text-purple-400 transition-colors">Support & FAQ</button></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
        <p>Copyright © 2026 DSA SMARTSTART | All rights reserved</p>
        <div className="flex gap-6 flex-wrap justify-center">
          <button onClick={() => handleLinkClick('cookie-policy')} className="hover:text-white">Cookie Policy</button>
          <button onClick={() => handleLinkClick('privacy-policy')} className="hover:text-white">Privacy Policy</button>
          <button onClick={() => handleLinkClick('refund-policy')} className="hover:text-white">Refund and Return Policy</button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
