import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('hero-visible');
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .hero-animate {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .hero-visible .hero-animate {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .hero-animate-delay-1 { transition-delay: 0.1s; }
        .hero-animate-delay-2 { transition-delay: 0.25s; }
        .hero-animate-delay-3 { transition-delay: 0.4s; }
        .hero-animate-delay-4 { transition-delay: 0.6s; }

        @keyframes float {
          0%, 100% { transform: perspective(1200px) rotateX(8deg) rotateY(-4deg) translate3d(0, 0, 0); }
          50% { transform: perspective(1200px) rotateX(8deg) rotateY(-4deg) translate3d(0, -12px, 0); }
        }
        .dashboard-float {
          animation: float 6s ease-in-out infinite;
          transform: perspective(1200px) rotateX(8deg) rotateY(-4deg) translate3d(0, 0, 0);
          will-change: transform;
        }
        .glow-teal {
          box-shadow: 0 0 30px rgba(20, 184, 166, 0.3), 0 0 60px rgba(20, 184, 166, 0.1);
        }
        .btn-primary {
          background: linear-gradient(135deg, #0d9488, #06b6d4);
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          background: linear-gradient(135deg, #0f766e, #0891b2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(20, 184, 166, 0.4);
        }
        .btn-secondary {
          border: 1px solid rgba(255,255,255,0.2);
          transition: all 0.3s ease;
        }
        .btn-secondary:hover {
          border-color: rgba(20,184,166,0.6);
          background: rgba(20,184,166,0.08);
          transform: translateY(-2px);
        }
      `}</style>

      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        {/* Navbar */}
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4" style={{ background: 'rgba(2,8,23,0.95)', borderBottom: '1px solid rgba(20,184,166,0.15)' }}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]">
              <span className="text-white font-bold text-xl leading-none font-serif tracking-tighter italic">C</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">CogniTest</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/contact" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">Contact Us</Link>
            <Link to="/student/login" className="text-sm text-gray-300 hover:text-white transition-colors px-3 py-2">Student Login</Link>
            <Link to="/admin/login" className="btn-primary text-white text-sm font-semibold px-5 py-2 rounded-lg">Admin Dashboard</Link>
          </div>
        </nav>

        {/* Badge */}
        <div className="hero-animate hero-animate-delay-1 mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-teal-300"
          style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.3)' }}>
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          AI-Powered Exam Analytics Platform
        </div>

        {/* Headline */}
        <h1 className="hero-animate hero-animate-delay-2 max-w-5xl text-white leading-none mb-6"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 700, letterSpacing: '-2px' }}>
          Transform Exam Results Into{' '}
          <span style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Actionable Intelligence
          </span>
        </h1>

        {/* Subheading */}
        <p className="hero-animate hero-animate-delay-3 max-w-2xl text-gray-400 mb-10 leading-relaxed"
          style={{ fontSize: '1.125rem', fontWeight: 400 }}>
          CogniTest powers JEE/NEET coaching institutes with AI-driven OMR processing, personalized analytics, and automated report generation — turning raw test scores into student success.
        </p>

        {/* CTA Buttons */}
        <div className="hero-animate hero-animate-delay-4 flex flex-col sm:flex-row gap-4 mb-20">
          <Link to="/student/login" className="btn-primary text-white font-bold px-8 py-4 rounded-xl text-base flex items-center gap-2 justify-center">
            Student Portal
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
          <Link to="/admin/login" className="btn-secondary text-white font-bold px-8 py-4 rounded-xl text-base flex items-center gap-2 justify-center bg-transparent">
            Admin Dashboard
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
          </Link>
        </div>

        {/* Mock Dashboard Preview */}
        <div className="hero-animate hero-animate-delay-4 dashboard-float w-full max-w-4xl glow-teal rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(20,184,166,0.25)', background: 'rgba(15,23,42,0.95)' }}>
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
            <div className="flex-1 mx-4 h-6 rounded-md flex items-center px-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-gray-500 text-xs">app.cognitest.in/student/reports</span>
            </div>
          </div>

          {/* Dashboard content mock */}
          <div className="p-6 grid grid-cols-12 gap-4">
            {/* Score cards */}
            <div className="col-span-12 grid grid-cols-4 gap-3">
              {[
                { label: 'Total Score', value: '247/300', color: '#14b8a6' },
                { label: 'Physics', value: '82/100', color: '#60a5fa' },
                { label: 'Chemistry', value: '78/100', color: '#34d399' },
                { label: 'Mathematics', value: '87/100', color: '#f97316' },
              ].map((card) => (
                <div key={card.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-xs text-gray-500 mb-1">{card.label}</div>
                  <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1 rounded-full" style={{ width: '72%', background: card.color }}></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart placeholder */}
            <div className="col-span-8 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', height: '160px' }}>
              <div className="text-xs text-gray-500 mb-3">Chapter-wise Performance</div>
              <div className="flex items-end gap-2 h-24">
                {[60, 85, 45, 90, 70, 55, 80, 65, 75, 88].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${h}%`, background: `rgba(20,184,166,${0.3 + (h / 300)})` }}></div>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="col-span-4 rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-xs text-gray-500">AI Recommendations</div>
              {['Complex Numbers', 'Electrochemistry', 'Optics'].map((topic) => (
                <div key={topic} className="flex items-center gap-2 text-xs text-gray-400 py-1 px-2 rounded-lg" style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust signal */}
        <p className="mt-8 text-xs text-gray-600">Trusted by coaching institutes across India</p>
      </section>
    </>
  );
};

export default HeroSection;
