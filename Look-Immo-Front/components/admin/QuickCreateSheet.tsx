import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Calendar, ClipboardList, X } from 'lucide-react';

interface QuickCreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickCreateSheet: React.FC<QuickCreateSheetProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  // shouldRender controls DOM presence; isActive controls CSS transition state
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Phase 1: mount the DOM element (still at off-screen starting position)
      setShouldRender(true);
      // Phase 2: on the next paint, trigger the CSS transition in
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsActive(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Phase 1: trigger CSS transition out
      setIsActive(false);
      // Phase 2: after animation completes, unmount from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 520);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleAction = (target: 'property' | 'appointment' | 'demand') => {
    onClose();
    const options = { replace: true, state: {} as any };
    if (target === 'property') {
      options.state = { tab: 'properties', action: 'new-property' };
      navigate('/admin', options);
    } else if (target === 'appointment') {
      options.state = { action: 'new-appointment' };
      navigate('/dashboard', options);
    } else if (target === 'demand') {
      options.state = { action: 'new-demand' };
      navigate('/dashboard', options);
    }
  };

  if (!shouldRender) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-end justify-center lg:hidden ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Backdrop overlay */}
      <div 
        onClick={handleClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-up bottom sheet */}
      <div 
        className={`relative w-full max-w-md bg-[#0C1F32] rounded-t-[28px] border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] z-10 transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] transform ${
          isActive ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none'
        } pb-[calc(16px+env(safe-area-inset-bottom))]`}
      >
        {/* Drag/Touch Handle Indicator */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-3" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
          <h3 className="text-white font-black text-base tracking-wide">Actions rapides</h3>
          <button 
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-all duration-200 outline-none pointer-events-auto"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Fully centered, balanced layout */}
        <div className="p-4 space-y-3">
          {/* Primary Action: Full Width Card (Centered Layout) */}
          <button
            onClick={() => handleAction('appointment')}
            className="w-full flex flex-col items-center justify-center p-5 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] border border-white/5 rounded-2xl transition-all duration-200 active:scale-[0.98] outline-none group shadow-sm pointer-events-auto"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-brand-teal/10 text-brand-teal group-hover:scale-105 transition-transform duration-200 mb-2.5">
              <Calendar size={22} className="stroke-[2.2]" />
            </div>
            <h4 className="text-white font-bold text-sm tracking-wide">Rendez-vous</h4>
          </button>

          {/* Secondary Actions: Grid of 2 Equal columns (Centered Layout) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left Card: Client Demand */}
            <button
              onClick={() => handleAction('demand')}
              className="flex flex-col items-center justify-center text-center p-4 bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.09] border border-white/5 rounded-2xl transition-all duration-200 active:scale-[0.98] outline-none group shadow-sm pointer-events-auto"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/10 text-orange-400 group-hover:scale-105 transition-transform duration-200 mb-2">
                <ClipboardList size={18} className="stroke-[2.2]" />
              </div>
              <h4 className="text-white font-bold text-xs tracking-wide">Demande client</h4>
            </button>

            {/* Right Card: Property */}
            <button
              onClick={() => handleAction('property')}
              className="flex flex-col items-center justify-center text-center p-4 bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.09] border border-white/5 rounded-2xl transition-all duration-200 active:scale-[0.98] outline-none group shadow-sm pointer-events-auto"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform duration-200 mb-2">
                <Home size={18} className="stroke-[2.2]" />
              </div>
              <h4 className="text-white font-bold text-xs tracking-wide">Nouvelle propriété</h4>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickCreateSheet;
