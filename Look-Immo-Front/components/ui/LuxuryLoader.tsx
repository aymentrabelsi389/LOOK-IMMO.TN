import React, { useEffect, useState } from 'react';

interface LuxuryLoaderProps {
  message?: string;
}

const LuxuryLoader: React.FC<LuxuryLoaderProps> = ({
  message = 'Préparation de votre expérience immobilière...',
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate an elegant loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Eased increments — fast start, slow finish
        const remaining = 100 - prev;
        const increment = Math.max(0.5, remaining * 0.035);
        return Math.min(prev + increment, 100);
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);



  return (
    <div
      className="luxury-loader-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0C1F32 0%, #0f2a44 50%, #0C1F32 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Subtle animated background grid */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.04,
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, #C9A96E 39px, #C9A96E 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #C9A96E 39px, #C9A96E 40px)`,
      }} />

      {/* Radial glow */}
      <div style={{
        position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,169,110,0.08) 0%, transparent 70%)',
        animation: 'luxuryPulse 4s ease-in-out infinite',
      }} />

      {/* Main content card */}
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '40px', animation: 'luxuryFadeUp 0.8s ease-out forwards',
        padding: '0 24px', maxWidth: '400px', width: '100%',
      }}>

        {/* Logo / building icon */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Outer ring */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            border: '1px solid rgba(201,169,110,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'luxuryRotate 8s linear infinite',
          }}>
            {/* Inner ring */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: '2px solid rgba(201,169,110,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'luxuryRotate 6s linear infinite reverse',
            }}>
              {/* Building icon — SVG drawn inline */}
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{ animation: 'luxuryPulse 2s ease-in-out infinite' }}>
                {/* Main building */}
                <rect x="4" y="12" width="28" height="22" rx="1" stroke="#C9A96E" strokeWidth="1.5" fill="none"/>
                {/* Roof / penthouse */}
                <path d="M2 13L18 3L34 13" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                {/* Door */}
                <rect x="14" y="26" width="8" height="8" rx="0.5" stroke="#C9A96E" strokeWidth="1.2" fill="none"/>
                {/* Windows row 1 */}
                <rect x="7" y="17" width="5" height="4" rx="0.5" stroke="#C9A96E" strokeWidth="1" fill="rgba(201,169,110,0.15)"/>
                <rect x="15.5" y="17" width="5" height="4" rx="0.5" stroke="#C9A96E" strokeWidth="1" fill="rgba(201,169,110,0.15)"/>
                <rect x="24" y="17" width="5" height="4" rx="0.5" stroke="#C9A96E" strokeWidth="1" fill="rgba(201,169,110,0.15)"/>
              </svg>
            </div>
          </div>

          {/* Brand name */}
          <div style={{ textAlign: 'center', animation: 'luxuryFadeUp 0.9s 0.2s ease-out both' }}>
            <div style={{
              fontSize: '28px', fontWeight: '700', letterSpacing: '6px', textTransform: 'uppercase',
              fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
              background: 'linear-gradient(135deg, #ffffff 0%, #C9A96E 50%, #ffffff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundSize: '200% 100%', animation: 'luxuryShimmerText 3s ease-in-out infinite',
            }}>
              LOOK IMMO
            </div>
            <div style={{
              fontSize: '10px', letterSpacing: '4px', color: 'rgba(201,169,110,0.7)',
              textTransform: 'uppercase', marginTop: '6px', fontWeight: '400',
            }}>
              Premium Real Estate
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div style={{
          width: '100%', height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5), transparent)',
          animation: 'luxuryFadeUp 1s 0.3s ease-out both',
        }} />

        {/* Progress bar section */}
        <div style={{ width: '100%', animation: 'luxuryFadeUp 1s 0.4s ease-out both' }}>
          {/* Label */}
          <p style={{
            fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '14px',
          }}>
            {message}
          </p>

          {/* Progress track */}
          <div style={{
            width: '100%', height: '2px',
            background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, #C9A96E, #E8D5A3, #C9A96E)',
              backgroundSize: '200% 100%',
              width: `${progress}%`,
              transition: 'width 0.1s ease-out',
              animation: 'luxuryShimmerText 2s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(201,169,110,0.6)',
            }} />
          </div>

          {/* Percentage */}
          <div style={{
            textAlign: 'right', marginTop: '8px',
            fontSize: '10px', color: 'rgba(201,169,110,0.6)',
            letterSpacing: '1px', fontVariantNumeric: 'tabular-nums',
          }}>
            {Math.round(progress)}%
          </div>
        </div>

        {/* Decorative bottom dots */}
        <div style={{ display: 'flex', gap: '8px', animation: 'luxuryFadeUp 1s 0.5s ease-out both' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: '4px', height: '4px', borderRadius: '50%',
              background: '#C9A96E',
              animation: `luxuryDotPulse 1.4s ${i * 0.2}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      </div>

      {/* Embedded keyframes */}
      <style>{`
        @keyframes luxuryFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes luxuryPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes luxuryRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes luxuryShimmerText {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @keyframes luxuryDotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default LuxuryLoader;
