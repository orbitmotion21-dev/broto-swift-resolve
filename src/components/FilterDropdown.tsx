import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export const FilterDropdown = ({
  label,
  options,
  selected,
  onChange,
}: FilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={cn(
          "gap-2 transition-all relative",
          selected.length > 0 && "border-accent text-accent"
        )}
      >
        <span>{label}</span>
        <ChevronDown 
          className={cn(
            "w-3 h-3 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
        {selected.length > 0 && (
          <span className="filter-count">{selected.length}</span>
        )}
      </Button>

      {isOpen && (
        <div 
          className={cn(
            "filter-dropdown",
            isClosing && "filter-dropdown-closing"
          )}
        >
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/10 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="text-sm text-foreground">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
