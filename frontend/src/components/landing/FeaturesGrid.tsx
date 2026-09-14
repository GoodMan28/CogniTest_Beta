import { useEffect, useRef } from 'react';

const features = [
  {
    icon: 'document_scanner',
    title: 'OMR Sheet Processing',
    description: 'Upload scanned OMR sheets and get instant digital evaluation with 99.9% accuracy.',
    color: '#14b8a6',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    icon: 'psychology',
    title: 'AI-Powered Analytics',
    description: 'Deep chapter-wise, topic-wise performance breakdown with AI-generated insights.',
    color: '#818cf8',
    gradient: 'from-violet-500 to-indigo-500',
  },
  {
    icon: 'analytics',
    title: 'Personalized Reports',
    description: 'Beautiful PDF report cards with radar charts, strength maps, and improvement roadmaps.',
    color: '#60a5fa',
    gradient: 'from-blue-500 to-sky-500',
  },
  {
    icon: 'my_location',
    title: 'Smart Practice Engine',
    description: 'AI recommends practice questions targeting each student\'s exact weak spots.',
    color: '#f97316',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: 'dashboard',
    title: 'Real-Time Dashboards',
    description: 'Live leaderboards, batch comparisons, and trend tracking for administrators.',
    color: '#34d399',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: 'chat',
    title: 'WhatsApp Integration',
    description: 'Automatically broadcast PDF report cards to parents via WhatsApp.',
    color: '#a78bfa',
    gradient: 'from-purple-500 to-violet-500',
  },
];

const FeaturesGrid = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll('.feature-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('feature-visible'), i * 80);
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .feature-card {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.6s ease, transform 0.6s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card.feature-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .feature-card:hover {
          transform: translateY(-6px) !important;
          border-color: rgba(20,184,166,0.4) !important;
          box-shadow: 0 20px 60px rgba(20,184,166,0.12), 0 0 0 1px rgba(20,184,166,0.2);
        }
      `}</style>

      <section ref={sectionRef} className="relative py-24 px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-teal-400 mb-4"
            style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)' }}>
            POWERFUL FEATURES
          </div>
          <h2 className="text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-1.2px' }}>
            Everything you need to{' '}
            <span style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              supercharge learning
            </span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto" style={{ fontSize: '1rem' }}>
            From OMR scanning to AI-personalized recommendations — one platform for the entire exam analytics workflow.
          </p>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="feature-card rounded-2xl p-6 cursor-default"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                style={{ background: `linear-gradient(135deg, ${feature.color}25, ${feature.color}10)`, border: `1px solid ${feature.color}30` }}
              >
                <span className="material-symbols-outlined text-[24px]" style={{ color: feature.color }}>
                  {feature.icon}
                </span>
              </div>

              {/* Content */}
              <h3 className="text-white font-bold mb-2" style={{ fontSize: '1rem', letterSpacing: '-0.3px' }}>
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Subtle bottom accent */}
              <div className="mt-5 h-px w-12 rounded-full" style={{ background: `linear-gradient(to right, ${feature.color}, transparent)` }}></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default FeaturesGrid;
