import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  mode?: 'single' | 'multiple';
  placeholder?: string;
  minWidth?: string;
  hideFooter?: boolean;
}

const MONTH_NAMES = [
  'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
  'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12',
];
const DAY_NAMES = ['T2','T3','T4','T5','T6','T7','CN'];

const CustomDatePicker = ({
  value,
  onChange,
  disabled,
  mode = 'multiple',
  placeholder,
  minWidth,
  hideFooter = false,
}: CustomDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDates = value
    ? value.split(',').map((d: string) => d.trim()).filter(Boolean)
    : [];

  const [currentDate, setCurrentDate] = useState(() => {
    if (selectedDates.length > 0) return new Date(selectedDates[0]);
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const dateToStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const handleSelect = (day: number) => {
    if (!day) return;
    const dateStr = dateToStr(year, month, day);
    if (mode === 'single') {
      onChange(dateStr);
      setIsOpen(false);
    } else {
      if (selectedDates.includes(dateStr)) {
        onChange(selectedDates.filter((d: string) => d !== dateStr).join(', '));
      } else {
        onChange([...selectedDates, dateStr].sort().join(', '));
      }
    }
  };

  const today = new Date();
  const todayStr = dateToStr(today.getFullYear(), today.getMonth(), today.getDate());

  let displayValue = placeholder || 'Chọn ngày...';
  if (selectedDates.length === 1) {
    const d = new Date(selectedDates[0]);
    displayValue = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } else if (selectedDates.length > 1) {
    displayValue = `${selectedDates.length} ngày đã chọn`;
  }

  return (
    <div className="relative" ref={containerRef} style={{ minWidth }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={`
          group w-full h-[38px] flex items-center gap-2 px-3
          rounded-xl border text-sm font-semibold
          transition-all duration-200 outline-none
          ${disabled
            ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
            : isOpen
              ? 'bg-red-50 border-[#CC0000]/40 shadow-[0_0_0_3px_rgba(204,0,0,0.08)] text-[#CC0000]'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm cursor-pointer'
          }
        `}
      >
        <Calendar
          size={15}
          strokeWidth={2.2}
          className={`shrink-0 transition-colors ${isOpen ? 'text-[#CC0000]' : 'text-slate-400 group-hover:text-slate-500'}`}
        />
        <span className={`flex-1 text-left truncate leading-none ${!value && !placeholder ? 'text-slate-400 font-medium' : ''}`}>
          {displayValue}
        </span>
        {selectedDates.length > 0 && !disabled && (
          <span
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="shrink-0 w-4 h-4 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-500 flex items-center justify-center transition-colors text-slate-500"
          >
            <X size={9} strokeWidth={3} />
          </span>
        )}
      </button>

      {/* Calendar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="
              absolute top-[calc(100%+6px)] left-0
              bg-white/95 backdrop-blur-xl
              border border-slate-200/80
              rounded-2xl
              shadow-[0_8px_30px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)]
              z-[9999] w-[300px] overflow-hidden
            "
          >
            {/* Red accent bar */}
            <div className="h-[2px] bg-gradient-to-r from-[#CC0000]/70 via-[#FF4444]/50 to-transparent" />

            <div className="p-4">
              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>

                <div className="flex items-center gap-1">
                  <select
                    value={month}
                    onChange={(e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1))}
                    className="text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-none outline-none px-2 py-1 rounded-lg cursor-pointer transition-colors appearance-none text-center"
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i} value={i}>{MONTH_NAMES[i]}</option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1))}
                    className="text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-none outline-none px-2 py-1 rounded-lg cursor-pointer transition-colors appearance-none text-center"
                  >
                    {Array.from({ length: 10 }).map((_, i) => {
                      const y = new Date().getFullYear() - 2 + i;
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-2">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="text-[10px] font-black text-slate-400 select-none uppercase tracking-wider text-center py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {days.map((d, i) => {
                  if (!d) return <div key={i} className="h-9 select-none" />;
                  const dateStr = dateToStr(year, month, d);
                  const isSelected = selectedDates.includes(dateStr);
                  const isToday = dateStr === todayStr;

                  return (
                    <button
                      type="button"
                      key={i}
                      onClick={() => { if (!disabled) handleSelect(d); }}
                      className={`
                        h-9 w-full rounded-xl text-sm font-bold flex items-center justify-center
                        transition-all duration-150 focus:outline-none select-none
                        ${isSelected
                          ? 'bg-[#CC0000] text-white shadow-md shadow-red-500/25 scale-[1.05]'
                          : isToday
                            ? 'bg-red-50 text-[#CC0000] border border-red-200 hover:bg-red-100'
                            : `text-slate-700 ${!disabled ? 'hover:bg-slate-100 hover:text-slate-900' : 'opacity-60 cursor-default'}`
                        }
                      `}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              {!hideFooter && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { if (!disabled) { onChange(''); if (mode === 'single') setIsOpen(false); } }}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors ${
                      disabled ? 'text-slate-300 cursor-default' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    Xóa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentDate(today);
                      if (!disabled) {
                        if (mode === 'single') { onChange(todayStr); setIsOpen(false); }
                        else if (!selectedDates.includes(todayStr)) {
                          onChange([...selectedDates, todayStr].sort().join(', '));
                        }
                      }
                    }}
                    className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors ${
                      disabled ? 'text-slate-300 cursor-default' : 'text-[#CC0000] hover:bg-red-50 border border-[#CC0000]/20 hover:border-[#CC0000]/40'
                    }`}
                  >
                    Hôm nay
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomDatePicker;
