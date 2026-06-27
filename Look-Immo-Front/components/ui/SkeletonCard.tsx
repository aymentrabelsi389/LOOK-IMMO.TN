import React from 'react';

interface SkeletonCardProps {
  count?: number;
}

// Single shimmer skeleton property card
export const SkeletonPropertyCard: React.FC = () => (
  <div style={{
    borderRadius: '16px', overflow: 'hidden',
    background: '#ffffff', border: '1px solid #f1f5f9',
    boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)',
    height: '400px', display: 'flex', flexDirection: 'column',
    position: 'relative',
  }}>
    {/* Image skeleton */}
    <div style={{
      height: '240px', background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
      backgroundSize: '400% 100%', animation: 'shimmer 1.6s ease-in-out infinite',
      flexShrink: 0,
    }} />

    {/* Badge overlay skeleton */}
    <div style={{
      position: 'absolute', top: '16px', left: '16px',
      width: '64px', height: '22px', borderRadius: '20px',
      background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
    }} />

    {/* Content */}
    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Price */}
      <div style={{
        height: '22px', width: '40%', borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
        backgroundSize: '400% 100%', animation: 'shimmer 1.6s 0.1s ease-in-out infinite',
      }} />

      {/* Title */}
      <div style={{
        height: '16px', width: '75%', borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
        backgroundSize: '400% 100%', animation: 'shimmer 1.6s 0.15s ease-in-out infinite',
      }} />

      {/* Location */}
      <div style={{
        height: '13px', width: '50%', borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
        backgroundSize: '400% 100%', animation: 'shimmer 1.6s 0.2s ease-in-out infinite',
      }} />

      {/* Feature pills */}
      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px' }}>
        {[35, 28, 32].map((w, i) => (
          <div key={i} style={{
            height: '13px', width: `${w}%`, borderRadius: '6px',
            background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
            backgroundSize: '400% 100%', animation: `shimmer 1.6s ${0.25 + i * 0.05}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>

    <style>{`
      @keyframes shimmer {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
    `}</style>
  </div>
);

// Grid of skeleton cards for listings/search results
const SkeletonGrid: React.FC<SkeletonCardProps> = ({ count = 6 }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px',
  }}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonPropertyCard key={i} />
    ))}
  </div>
);

// Skeleton for the full listings page (sidebar + grid)
export const ListingsPageSkeleton: React.FC = () => (
  <div style={{ display: 'flex', gap: '24px', padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
    {/* Sidebar skeleton */}
    <div style={{
      width: '280px', flexShrink: 0,
      background: '#fff', borderRadius: '16px',
      border: '1px solid #f1f5f9', padding: '24px',
      display: 'flex', flexDirection: 'column', gap: '20px',
      boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)',
      alignSelf: 'flex-start',
    }}>
      {/* Search bar skeleton */}
      <div style={{
        height: '44px', borderRadius: '10px',
        background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
        backgroundSize: '400% 100%', animation: 'shimmer 1.6s ease-in-out infinite',
      }} />
      {/* Filter groups */}
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            height: '12px', width: '45%', borderRadius: '6px',
            background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
            backgroundSize: '400% 100%', animation: `shimmer 1.6s ${i * 0.1}s ease-in-out infinite`,
          }} />
          <div style={{
            height: '38px', borderRadius: '8px',
            background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
            backgroundSize: '400% 100%', animation: `shimmer 1.6s ${i * 0.12}s ease-in-out infinite`,
          }} />
        </div>
      ))}
    </div>

    {/* Results grid */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Result count skeleton */}
      <div style={{
        height: '14px', width: '180px', borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f4f8 25%, #e8edf3 50%, #f0f4f8 75%)',
        backgroundSize: '400% 100%', animation: 'shimmer 1.6s ease-in-out infinite',
      }} />
      <SkeletonGrid count={6} />
    </div>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
    `}</style>
  </div>
);

export default SkeletonGrid;
