import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, PlusCircle, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
  [key: string]: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onAddNew?: (searchQuery?: string) => void;
  addNewLabel?: string;
  className?: string;
  renderOption?: (option: Option) => React.ReactNode;
  allowCustomValue?: boolean;
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Chọn...', 
  onAddNew, 
  addNewLabel = '+ Thêm mới',
  className = '',
  renderOption,
  allowCustomValue = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(o => 
      o.label.toLowerCase().includes(query) || 
      (o.sublabel && o.sublabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    return options.some(o => o.label.toLowerCase() === searchQuery.trim().toLowerCase() || o.id.toLowerCase() === searchQuery.trim().toLowerCase());
  }, [options, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isOpen && allowCustomValue && searchQuery.trim() && !hasExactMatch) {
          onChange(searchQuery.trim());
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, allowCustomValue, searchQuery, hasExactMatch, onChange]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        onChange(filteredOptions[0].id);
        setIsOpen(false);
      } else if (allowCustomValue && searchQuery.trim()) {
        onChange(searchQuery.trim());
        setIsOpen(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all bg-white shadow-sm ${
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 truncate">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-[10px] text-gray-500 truncate">{selectedOption.sublabel}</span>
              )}
            </div>
          ) : value ? (
            <span className="text-sm font-medium text-gray-900 truncate">{value}</span>
          ) : (
            <span className="text-gray-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[110] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Tìm kiếm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1">
              {allowCustomValue && searchQuery.trim() && !hasExactMatch && (
                <div
                  onClick={() => {
                    onChange(searchQuery.trim());
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 text-blue-700 hover:bg-blue-100 transition-all cursor-pointer font-medium text-sm mb-1"
                >
                  <span className="truncate">Tự nhập: <strong className="font-bold">"{searchQuery.trim()}"</strong></span>
                  <PlusCircle size={16} className="shrink-0 ml-2" />
                </div>
              )}
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.id);
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group ${
                      option.disabled 
                        ? 'opacity-50 cursor-not-allowed' 
                        : value === option.id 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      {renderOption ? renderOption(option) : (
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium truncate ${value === option.id ? 'text-blue-700' : 'text-gray-900'}`}>
                            {option.label}
                          </span>
                          {option.sublabel && (
                            <span className="text-[10px] text-gray-500 truncate">{option.sublabel}</span>
                          )}
                        </div>
                      )}
                    </div>
                    {value === option.id && <Check size={16} className="text-blue-600 shrink-0 ml-2" />}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-xs text-gray-400">Không tìm thấy kết quả</p>
                </div>
              )}
            </div>

            {onAddNew && (
              <div className="p-1 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    onAddNew(searchQuery);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all text-sm font-bold uppercase tracking-wider"
                >
                  <PlusCircle size={18} />
                  {addNewLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
