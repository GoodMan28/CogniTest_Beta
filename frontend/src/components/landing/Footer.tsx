import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="relative" style={{ borderTop: '1px solid rgba(20,184,166,0.2)' }}>
      {/* Turquoise top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #14b8a6, #06b6d4, #14b8a6, transparent)' }} />

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #06b6d4)' }}>
                <span className="material-symbols-outlined text-white text-[18px]">psychology</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight">CogniTest</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">
              AI-powered exam analytics for JEE coaching institutes.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <Link to="/student/login" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
              Student Login
            </Link>
            <Link to="/admin/login" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
              Admin Dashboard
            </Link>
            <a href="#features" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
              Features
            </a>
            <a href="mailto:support@cognitest.in" className="text-gray-400 hover:text-teal-400 transition-colors text-sm">
              Contact
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="my-8 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-xs">
            © 2026 CogniTest. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
