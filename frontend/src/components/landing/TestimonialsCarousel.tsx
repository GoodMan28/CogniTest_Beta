import { useState, useEffect, useRef } from 'react';

const institutes = [
  { name: 'Biome', logo: '/logos/biome.png' },
  { name: 'Vasuka Academy', logo: '/logos/vasuka.png' },
  { name: 'Orange', logo: '/logos/orange.png' },
];

const testimonials = [
  {
    quote: 'The personalized report cards and WhatsApp integration have dramatically improved parent engagement. Parents now actively discuss their child\'s weak areas with faculty.',
    name: 'Priya Nair',
    designation: 'Academic Head',
    institute: 'Pinnacle Academy',
    initials: 'PN',
    color: '#818cf8',
  },
  {
    quote: 'We went from manual OMR checking to automated AI analysis in one week. The accuracy is incredible and students get their reports within minutes. Game changer.',
    name: 'Amit Verma',
    designation: 'Founder',
    institute: 'Excel Coaching',
    initials: 'AV',
    color: '#60a5fa',
  },
];

const TestimonialsCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-advance testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.classList.add('testimonials-visible');
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track {
          animation: marquee 25s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        .testimonials-section {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .testimonials-visible .testimonials-section {
          opacity: 1;
          transform: translateY(0);
        }
        .testimonial-card {
          transition: opacity 0.4s ease, transform 0.4s ease;
          will-change: transform, opacity;
        }
      `}</style>

      <section ref={sectionRef} className="relative py-24 px-6 overflow-hidden">
        <div className="testimonials-section">
          {/* Section Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-teal-400 mb-4"
              style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.25)' }}>
              TRUSTED PARTNERS
            </div>
            <h2 className="text-white mb-3" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-1.2px' }}>
              Trusted by Leading{' '}
              <span style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Coaching Institutes
              </span>
            </h2>
            <p className="text-gray-400">Join institutes already using CogniTest</p>
          </div>

          {/* Marquee logo strip */}
          <div className="relative mb-20 overflow-hidden"
            style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)' }}>
            <div className="flex marquee-track gap-6">
              {/* Duplicate for seamless loop */}
              {[...institutes, ...institutes, ...institutes].map((inst, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 px-6 py-3 rounded-xl flex items-center justify-center gap-3"
                  style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.2)', minWidth: '180px', height: '70px' }}
                >
                  <img 
                    src={inst.logo} 
                    alt={inst.name} 
                    className="h-full w-full object-contain" 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="max-w-4xl mx-auto">
            {/* Cards */}
            <div className="relative" style={{ minHeight: '220px' }}>
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="testimonial-card absolute inset-0 p-8 rounded-2xl"
                  style={{
                    opacity: i === activeIndex ? 1 : 0,
                    transform: i === activeIndex ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
                    pointerEvents: i === activeIndex ? 'auto' : 'none',
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: `1px solid ${i === activeIndex ? `${t.color}40` : 'rgba(255,255,255,0.05)'}`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, si) => (
                      <span key={si} className="text-lg" style={{ color: t.color }}>★</span>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-gray-200 text-lg leading-relaxed italic mb-6" style={{ fontSize: '1.05rem' }}>
                    "{t.quote}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: `linear-gradient(135deg, ${t.color}40, ${t.color}20)`, color: t.color, border: `1px solid ${t.color}40` }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{t.name}</div>
                      <div className="text-gray-400 text-xs">{t.designation} · {t.institute}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-72 sm:mt-56">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === activeIndex ? '24px' : '8px',
                    height: '8px',
                    background: i === activeIndex ? '#14b8a6' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default TestimonialsCarousel;
