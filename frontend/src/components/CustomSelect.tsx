import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: Option[];
  icon?: React.ReactNode;
  minWidth?: string;
  className?: string;
  placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  icon,
  minWidth = '130px',
  className = '',
  placeholder = 'Chọn...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value == value);

  return (
    <div
      ref={containerRef}
      className={`relative select-none cursor-pointer ${className}`}
      style={{ minWidth }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          group w-full h-[38px] flex items-center gap-2 px-3 pr-2.5
          rounded-xl border text-sm font-semibold
          transition-all duration-200 outline-none
          ${isOpen
            ? 'bg-red-50 border-[#CC0000]/40 shadow-[0_0_0_3px_rgba(204,0,0,0.08)] text-[#CC0000]'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/80 shadow-sm'
          }
        `}
      >
        {/* Left Icon */}
        {icon && (
          <span className={`shrink-0 transition-colors duration-200 ${isOpen ? 'text-[#CC0000]' : 'text-slate-400 group-hover:text-slate-500'}`}>
            {icon}
          </span>
        )}

        {/* Label */}
        <span className="flex-1 text-left truncate leading-none">
          {selectedOption ? selectedOption.label : (
            <span className="text-slate-400 font-medium">{placeholder}</span>
          )}
        </span>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className={`shrink-0 transition-colors duration-200 ${isOpen ? 'text-[#CC0000]' : 'text-slate-400 group-hover:text-slate-500'}`}
        >
          <ChevronDown size={15} strokeWidth={2.5} />
        </motion.span>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="
              absolute top-[calc(100%+6px)] left-0 w-full min-w-max
              bg-white/95 backdrop-blur-xl
              border border-slate-200/80
              rounded-2xl
              shadow-[0_8px_30px_rgba(0,0,0,0.10),0_2px_8px_rgba(0,0,0,0.06)]
              z-[9999] overflow-hidden
            "
          >
            {/* Subtle top accent line */}
            <div className="h-[2px] bg-gradient-to-r from-[#CC0000]/70 via-[#FF4444]/50 to-transparent" />

            <div className="max-h-[240px] overflow-y-auto py-1.5 custom-scrollbar">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-400 text-center font-medium">
                  Không có lựa chọn
                </div>
              ) : (
                options.map((opt, idx) => {
                  const isSelected = opt.value == value;
                  return (
                    <motion.div
                      key={opt.value}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.12, delay: idx * 0.025 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`
                        relative flex items-center gap-3 mx-1.5 px-3 py-2.5
                        text-sm rounded-xl cursor-pointer transition-all duration-150
                        ${isSelected
                          ? 'bg-gradient-to-r from-[#CC0000]/8 to-[#CC0000]/5 text-[#CC0000] font-bold'
                          : 'text-slate-700 font-medium hover:bg-slate-100/80 hover:text-slate-900'
                        }
                      `}
                    >
                      {/* Selected indicator dot */}
                      {isSelected && (
                        <span className="shrink-0 w-4 h-4 rounded-full bg-[#CC0000] flex items-center justify-center shadow-sm shadow-red-500/30">
                          <Check size={9} strokeWidth={3.5} className="text-white" />
                        </span>
                      )}
                      {!isSelected && <span className="shrink-0 w-4 h-4" />}

                      <span className="truncate">{opt.label}</span>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
