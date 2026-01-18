
import React from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook, Linkedin } from 'lucide-react';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const handleLinkClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      window.location.hash = path === 'home' ? '' : `#${path}`;
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 pt-20 pb-10 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* About Column */}
        <div>
          <h4 className="text-white text-xl font-bold mb-6">DSA SMART START</h4>
          <p className="text-sm leading-loose mb-8">
            The first program in the world specifically designed for those living with dyslexia, helping them achieve amazing results and make learning fun.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors"><Instagram size={18} /></a>
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors"><Facebook size={18} /></a>
            <a href="#" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-purple-600 transition-colors"><Linkedin size={18} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-4 text-sm">
            <li><button onClick={() => handleLinkClick('home')} className="hover:text-purple-400 transition-colors">Home</button></li>
            <li><button onClick={() => handleLinkClick('who-we-are')} className="hover:text-purple-400 transition-colors">Who We Are</button></li>
            <li><a href="#roots" className="hover:text-purple-400 transition-colors">Courses</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">Products</a></li>
            <li><a href="#contacts" className="hover:text-purple-400 transition-colors">Contact</a></li>
          </ul>
        </div>

        {/* Courses Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Courses</h4>
          <ul className="space-y-4 text-sm">
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START - A1 LEVEL</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START - A2 LEVEL</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START - B1 LEVEL</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START KIDS - BASIC</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START KIDS - MEDIUM</a></li>
            <li><a href="#" className="hover:text-purple-400 transition-colors">DSA SMART START KIDS - ADVANCED</a></li>
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
        <p>Copyright © 2025 DSA SMARTSTART | All rights reserved</p>
        <div className="flex gap-6 flex-wrap justify-center">
          <a href="#" className="hover:text-white">Cookie Policy</a>
          <a href="#" className="hover:text-white">Privacy Policy</a>
          <a href="#" className="hover:text-white">Refund and Return Policy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
