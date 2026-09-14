const TurquoiseGrid = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Deep dark background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #020817 0%, #0a1628 50%, #020817 100%)' }} />

      {/* Turquoise dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(20,184,166,0.35) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Animated shimmer line */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to right, transparent, rgba(20,184,166,0.06) 50%, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 8s ease-in-out infinite',
        }}
      />

      {/* Large glowing orb — top center */}
      <div
        className="absolute rounded-full"
        style={{
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '700px',
          background: 'radial-gradient(circle, rgba(20,184,166,0.15) 0%, rgba(6,182,212,0.08) 40%, transparent 70%)',
          animation: 'pulse-orb 6s ease-in-out infinite',
        }}
      />

      {/* Secondary orb — bottom right */}
      <div
        className="absolute rounded-full"
        style={{
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)',
          animation: 'pulse-orb 8s ease-in-out infinite reverse',
        }}
      />

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-orb {
          0%, 100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
          50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
        }
      `}</style>
    </div>
  );
};

export default TurquoiseGrid;
