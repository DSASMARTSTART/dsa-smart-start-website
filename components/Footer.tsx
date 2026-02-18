import React, { useEffect, useState, useMemo } from 'react';
import { Mail, Phone, MapPin, Instagram, Users, MonitorPlay, FileText, Crown, Diamond, ChevronRight } from 'lucide-react';
import { coursesApi } from '../data/supabaseStore';
import { Course, ProductType, TargetAudience } from '../types';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

// Maximum links per category before showing "View All"
const MAX_LINKS_PER_CATEGORY = 6;

// Icons for different product types
const PRODUCT_ICONS: Record<ProductType, React.ReactNode> = {
  'service': <Users size={16} className="text-violet-400" />,
  'learndash': <MonitorPlay size={16} className="text-purple-400" />,
  'ebook': <FileText size={16} className="text-pink-400" />
};

// Level icons for special programs
const LEVEL_ICONS: Record<string, React.ReactNode> = {
  'premium': <Crown size={12} className="text-violet-400" />,
  'golden': <Diamond size={12} className="text-amber-400" />,
  'Premium': <Crown size={12} className="text-violet-400" />,
  'Gold': <Diamond size={12} className="text-amber-400" />
};

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const data = await coursesApi.list({ isPublished: true });
        setCourses(data || []);
      } catch (error) {
        console.error('Footer: Failed to load courses', error);
      } finally {
        setLoading(false);
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

  // Navigate to course detail page
  const goToCourse = (course: Course) => {
    const route = course.productType === 'ebook' 
      ? `#ebook-${course.id}` 
      : `#syllabus-${course.id}`;
    window.location.hash = route;
  };

  // Navigate to courses page with filter
  const goToCoursesFiltered = (productType?: ProductType, audience?: TargetAudience) => {
    let hash = '#courses';
    const params: string[] = [];
    if (productType) params.push(`type=${productType}`);
    if (audience) params.push(`audience=${audience}`);
    if (params.length > 0) hash += `?${params.join('&')}`;
    window.location.hash = hash;
  };

  // Group courses dynamically by productType and targetAudience
  const groupedCourses = useMemo(() => {
    // Filter courses that should appear in footer
    const footerCourses = courses.filter(c => c.showInFooter !== false && c.isPublished);
    
    // Sort by footerOrder (lower first), then by title
    const sorted = [...footerCourses].sort((a, b) => {
      const orderA = a.footerOrder ?? 999;
      const orderB = b.footerOrder ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return a.title.localeCompare(b.title);
    });

    // Group by productType
    const services = sorted.filter(c => c.productType === 'service');
    const interactive = sorted.filter(c => c.productType === 'learndash');
    const ebooks = sorted.filter(c => c.productType === 'ebook');

    // Further split interactive and ebooks by target audience
    const interactiveAdults = interactive.filter(c => c.targetAudience === 'adults_teens');
    const interactiveKids = interactive.filter(c => c.targetAudience === 'kids');
    const ebooksAdults = ebooks.filter(c => c.targetAudience === 'adults_teens');
    const ebooksKids = ebooks.filter(c => c.targetAudience === 'kids');

    return {
      services,
      interactiveAdults,
      interactiveKids,
      ebooksAdults,
      ebooksKids,
      totalInteractive: interactive.length,
      totalEbooks: ebooks.length
    };
  }, [courses]);

  // Helper to render course links with limit
  const renderCourseLinks = (
    courseList: Course[], 
    maxItems: number = MAX_LINKS_PER_CATEGORY,
    showViewAll: boolean = false,
    viewAllProductType?: ProductType,
    viewAllAudience?: TargetAudience
  ) => {
    const displayCourses = courseList.slice(0, maxItems);
    const hasMore = courseList.length > maxItems;

    return (
      <>
        {displayCourses.map(course => (
          <li key={course.id}>
            <button 
              onClick={() => goToCourse(course)} 
              className="hover:text-purple-400 transition-colors text-left flex items-center gap-2"
            >
              {LEVEL_ICONS[course.level] || null}
              <span className="truncate max-w-[180px]">{course.title}</span>
            </button>
          </li>
        ))}
        {(hasMore || showViewAll) && (
          <li>
            <button 
              onClick={() => goToCoursesFiltered(viewAllProductType, viewAllAudience)} 
              className="hover:text-purple-400 transition-colors text-left flex items-center gap-1 text-purple-400 font-medium mt-1"
            >
              View All
              <ChevronRight size={14} />
            </button>
          </li>
        )}
      </>
    );
  };

  return (
    <footer className="bg-black text-gray-300 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
        {/* About Column */}
        <div className="lg:col-span-1">
          <h4 className="text-white text-xl font-bold mb-6">EDUWAY</h4>
          <p className="text-sm leading-loose mb-8">
            The first program in the world specifically designed for those living with dyslexia, helping them achieve amazing results and make learning fun.
          </p>
          <div className="flex gap-4">
            <a 
              href="https://www.instagram.com/dsasmartstart/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors" 
              aria-label="Follow us on Instagram"
            >
              <Instagram size={18} />
            </a>
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

        {/* Online & Interactive Courses - Dynamic */}
        <div>
          {/* Online Courses (Services) */}
          {groupedCourses.services.length > 0 && (
            <>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                {PRODUCT_ICONS['service']}
                Online Courses
              </h4>
              <ul className="space-y-3 text-sm mb-6">
                {renderCourseLinks(
                  groupedCourses.services, 
                  MAX_LINKS_PER_CATEGORY, 
                  false, 
                  'service'
                )}
              </ul>
            </>
          )}
          
          {/* Interactive Courses */}
          {groupedCourses.totalInteractive > 0 && (
            <>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                {PRODUCT_ICONS['learndash']}
                Interactive Courses
              </h4>
              
              {/* Adults & Teens */}
              {groupedCourses.interactiveAdults.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Adults & Teens</p>
                  <ul className="space-y-2 text-sm mb-4">
                    {renderCourseLinks(
                      groupedCourses.interactiveAdults, 
                      3, 
                      groupedCourses.interactiveAdults.length > 3, 
                      'learndash', 
                      'adults_teens'
                    )}
                  </ul>
                </>
              )}
              
              {/* Kids */}
              {groupedCourses.interactiveKids.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Kids</p>
                  <ul className="space-y-2 text-sm">
                    {renderCourseLinks(
                      groupedCourses.interactiveKids, 
                      3, 
                      groupedCourses.interactiveKids.length > 3, 
                      'learndash', 
                      'kids'
                    )}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        {/* E-books Column - Dynamic */}
        <div>
          {groupedCourses.totalEbooks > 0 && (
            <>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                {PRODUCT_ICONS['ebook']}
                E-books
              </h4>
              
              {/* Adults & Teens */}
              {groupedCourses.ebooksAdults.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Adults & Teens</p>
                  <ul className="space-y-2 text-sm mb-4">
                    {renderCourseLinks(
                      groupedCourses.ebooksAdults, 
                      3, 
                      groupedCourses.ebooksAdults.length > 3, 
                      'ebook', 
                      'adults_teens'
                    )}
                  </ul>
                </>
              )}
              
              {/* Kids */}
              {groupedCourses.ebooksKids.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Kids</p>
                  <ul className="space-y-2 text-sm">
                    {renderCourseLinks(
                      groupedCourses.ebooksKids, 
                      3, 
                      groupedCourses.ebooksKids.length > 3, 
                      'ebook', 
                      'kids'
                    )}
                  </ul>
                </>
              )}
            </>
          )}

          {/* Show placeholder if no ebooks */}
          {groupedCourses.totalEbooks === 0 && !loading && (
            <div>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                {PRODUCT_ICONS['ebook']}
                E-books
              </h4>
              <p className="text-xs text-gray-500">Coming soon...</p>
            </div>
          )}
        </div>

        {/* Contact Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Contact Us</h4>
          <ul className="space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Phone size={16} className="text-purple-500" />
              +381 65 886 9930
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="text-purple-500" />
              dsa.smart.start@gmail.com
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={16} className="text-purple-500 shrink-0" />
              Vladana Desnice 28, Beograd, Srbija
            </li>
            <li className="pt-4">
              <button onClick={() => handleLinkClick('faq')} className="hover:text-purple-400 transition-colors">
                Support & FAQ
              </button>
            </li>
          </ul>

          {/* Legal Entity Info */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
              ANA MILATOVIĆ PR CENTAR ZA EDUKACIJE EDUWAY BEOGRAD (ZVEZDARA)
            </p>
            <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
              MB: 68375720 &nbsp;|&nbsp; PIB: 115450214<br />
              Šifra delatnosti: 8559
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-gray-500">
        <p>Copyright © 2026 ANA MILATOVIĆ PR CENTAR ZA EDUKACIJE EDUWAY | All rights reserved</p>
        <div className="flex gap-6 flex-wrap justify-center">
          <button onClick={() => handleLinkClick('terms')} className="hover:text-white">Terms & Conditions</button>
          <button onClick={() => handleLinkClick('cookie-policy')} className="hover:text-white">Cookie Policy</button>
          <button onClick={() => handleLinkClick('privacy-policy')} className="hover:text-white">Privacy Policy</button>
          <button onClick={() => handleLinkClick('refund-policy')} className="hover:text-white">Refund and Return Policy</button>
        </div>
        {/* Accepted Payment Methods */}
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[9px] uppercase tracking-widest text-gray-600">We accept:</span>
          <img src="/assets/images/visa-logo.jpg" alt="Visa" className="h-6 opacity-50 hover:opacity-80 transition-opacity" />
          <img src="/assets/images/mastercard-logo.png" alt="Mastercard" className="h-6 opacity-50 hover:opacity-80 transition-opacity" />
          <img src="/assets/images/dinacard-logo.jpg" alt="DinaCard" className="h-6 opacity-50 hover:opacity-80 transition-opacity" />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
