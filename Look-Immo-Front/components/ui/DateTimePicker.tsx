import React, { useState, useEffect, useRef } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ChevronDown } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  required?: boolean;
  allowPastDates?: boolean;
}

export const CustomDatePicker: React.FC<DatePickerProps> = ({ value, onChange, required, allowPastDates = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync current month view with selected value
  useEffect(() => {
    if (value) {
      const [year, month] = value.split('-');
      setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
    }
  }, [value]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Adjust so Monday is 0
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: startOffset }, (_, i) => i);

  const handleSelectDate = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setIsOpen(false);
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const formatDisplayDate = (val: string) => {
    if (!val) return 'jj/mm/aaaa';
    const [y, m, d] = val.split('-');
    return `${d}/${m}/${y}`;
  };

  const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const dayNames = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all text-left shadow-sm cursor-pointer"
      >
        <span className={value ? "text-gray-900 font-semibold text-sm whitespace-nowrap" : "text-gray-400 text-sm whitespace-nowrap"}>
          {formatDisplayDate(value)}
        </span>
        <CalendarDays size={18} className="text-gray-400" />
      </button>
      
      {/* Hidden native input for required validation */}
      {required && <input type="date" value={value} readOnly className="absolute opacity-0 w-0 h-0" required />}

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full min-w-[280px] left-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-scale-in origin-top-left">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 cursor-pointer">
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm text-gray-800">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button" onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 cursor-pointer">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {padding.map(p => (
              <div key={`pad-${p}`} className="h-8"></div>
            ))}
            {days.map(d => {
              const currentDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = value === currentDateStr;
              
              const now = new Date();
              const isToday = d === now.getDate() && currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear();
              
              const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
              dayDate.setHours(23, 59, 59, 999);
              const isPast = !allowPastDates && dayDate < now;

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => !isPast && handleSelectDate(d)}
                  disabled={isPast}
                  className={`h-8 w-full rounded-lg text-sm font-medium transition-all flex items-center justify-center cursor-pointer
                    ${isSelected 
                      ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/30' 
                      : isPast
                        ? 'text-gray-300 line-through cursor-not-allowed opacity-40'
                        : isToday 
                          ? 'bg-brand-teal/10 text-brand-teal font-bold border border-brand-teal/30' 
                          : 'text-gray-700 hover:bg-gray-100 hover:scale-105 active:scale-95'
                    }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  required?: boolean;
}

export const CustomTimePicker: React.FC<TimePickerProps> = ({ value, onChange, required }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Local states for custom hour and minute inputs
  const [customHour, setCustomHour] = useState('');
  const [customMinute, setCustomMinute] = useState('');

  // Sync inputs with value whenever the popover is opened or value changed
  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setCustomHour(h);
      setCustomMinute(m);
    } else {
      setCustomHour('');
      setCustomMinute('');
    }
  }, [value, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const handleCustomConfirm = () => {
    let h = parseInt(customHour, 10);
    let m = parseInt(customMinute, 10);

    if (isNaN(h) || h < 0 || h > 23) {
      h = 12; // default fallback
    }
    if (isNaN(m) || m < 0 || m > 59) {
      m = 0; // default fallback
    }

    const formattedTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(formattedTime);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-50 transition-all text-left shadow-sm cursor-pointer"
      >
        <span className={value ? "text-gray-900 font-semibold text-sm" : "text-gray-400 text-sm"}>
          {value || '-- Sélectionner --'}
        </span>
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock size={16} />
          <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
        </div>
      </button>

      {/* Hidden input for HTML5 validation if required */}
      {required && <input type="text" value={value} readOnly className="absolute opacity-0 w-0 h-0" required />}

      {isOpen && (
        <div className="absolute z-[100] mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-scale-in origin-top-left">
          {/* Custom Time Selector Section */}
          <div className="mb-4">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Saisir une heure</span>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-gray-50 p-1.5 border border-gray-200 rounded-xl flex-1 justify-center">
                <input
                  type="text"
                  maxLength={2}
                  value={customHour}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 23)) {
                      setCustomHour(val);
                      // Auto-focus minutes if 2 digits are entered
                      if (val.length === 2 && parseInt(val, 10) <= 23) {
                        const minInput = document.getElementById('custom-minute-input');
                        if (minInput) (minInput as HTMLInputElement).focus();
                      }
                    }
                  }}
                  placeholder="HH"
                  className="w-10 text-center font-bold text-base bg-transparent border-none outline-none focus:ring-0 focus:outline-none p-0 text-gray-800"
                />
                <span className="text-gray-400 font-bold text-lg">:</span>
                <input
                  id="custom-minute-input"
                  type="text"
                  maxLength={2}
                  value={customMinute}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59)) {
                      setCustomMinute(val);
                    }
                  }}
                  placeholder="MM"
                  className="w-10 text-center font-bold text-base bg-transparent border-none outline-none focus:ring-0 focus:outline-none p-0 text-gray-800"
                />
              </div>
              <button
                type="button"
                onClick={() => handleCustomConfirm()}
                className="px-4 py-2 bg-brand-teal hover:bg-brand-teal/90 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-brand-teal/20 flex items-center justify-center cursor-pointer"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
