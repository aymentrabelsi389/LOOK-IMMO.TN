import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { ClientDemand } from '@/types';

interface StatusDropdownProps {
  status: ClientDemand['status'];
  onChange: (status: ClientDemand['status']) => void;
}

const statusConfig: Record<ClientDemand['status'], { label: string; bg: string; text: string; dot: string; hoverBg: string }> = {
  searching: {
    label: 'En recherche',
    bg: 'bg-amber-50/80 border-amber-200/60 text-amber-700 hover:bg-amber-100/80',
    hoverBg: 'hover:bg-amber-50 hover:text-amber-700',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  contacted: {
    label: 'Contacté',
    bg: 'bg-blue-50/80 border-blue-200/60 text-blue-700 hover:bg-blue-100/80',
    hoverBg: 'hover:bg-blue-50 hover:text-blue-700',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
  matched: {
    label: 'Matché',
    bg: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700 hover:bg-emerald-100/80',
    hoverBg: 'hover:bg-emerald-50 hover:text-emerald-700',
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  closed: {
    label: 'Fermé',
    bg: 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100',
    hoverBg: 'hover:bg-slate-50 hover:text-slate-600',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
  },
};

export const StatusDropdown: React.FC<StatusDropdownProps> = ({ status, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const top = rect.bottom + window.scrollY;
      let left = rect.left + window.scrollX;
      
      const dropdownWidth = 176; // w-44 is 176px
      if (rect.left + dropdownWidth > window.innerWidth) {
        left = rect.right - dropdownWidth + window.scrollX;
      }
      
      setCoords({ top, left });
    }
  };

  const handleOpenToggle = () => {
    if (!isOpen) {
      updateCoords();
    }
    setIsOpen(!isOpen);
  };

  // Re-calculate coords on scroll or resize when open
  useEffect(() => {
    if (isOpen) {
      updateCoords();
      // Listen to scroll events on any parent element (using capture phase)
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
    }
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  // Click outside logic that checks both trigger button and portal menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && 
        !buttonRef.current.contains(target) &&
        menuRef.current && 
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const current = statusConfig[status] || statusConfig.searching;

  return (
    <div className="relative inline-block text-left w-full sm:w-auto">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpenToggle}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm outline-none w-full sm:w-auto min-w-[130px] ${current.bg} hover:shadow-md active:scale-95`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${current.dot} animate-pulse`} />
          <span className="truncate">{current.label}</span>
        </div>
        <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div 
          ref={menuRef}
          style={{
            position: 'absolute',
            top: `${coords.top + 6}px`,
            left: `${coords.left}px`,
          }}
          className="w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-[9999] animate-fade-in-up"
        >
          {(Object.keys(statusConfig) as ClientDemand['status'][]).map((key) => {
            const opt = statusConfig[key];
            const isSelected = key === status;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                  isSelected 
                    ? 'bg-gray-50 text-gray-900 font-extrabold' 
                    : `text-gray-500 hover:bg-gray-50 ${opt.hoverBg}`
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check size={12} className="text-gray-900 flex-shrink-0" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};
