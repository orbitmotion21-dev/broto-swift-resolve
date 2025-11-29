import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterDropdown } from '@/components/FilterDropdown';
import { Search, X, Filter } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface FilterState {
  search: string;
  status: string[];
  category: string[];
  urgency: string[];
  dateRange: { from?: Date; to?: Date } | null;
  studentName?: string;
  batch?: string;
}

interface ComplaintFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  showStudentFilter?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Waiting for Student', label: 'Waiting for Student' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const CATEGORY_OPTIONS = [
  { value: 'System', label: 'System' },
  { value: 'Hostel', label: 'Hostel' },
  { value: 'Internet', label: 'Internet' },
  { value: 'Food', label: 'Food' },
  { value: 'Behaviour', label: 'Behaviour' },
  { value: 'Others', label: 'Others' },
];

const URGENCY_OPTIONS = [
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
];

export const ComplaintFilters = ({ 
  filters, 
  onFilterChange, 
  showStudentFilter = false 
}: ComplaintFiltersProps) => {
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce search
    setTimeout(() => {
      onFilterChange({ ...filters, search: value });
    }, 300);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    onFilterChange({
      search: '',
      status: [],
      category: [],
      urgency: [],
      dateRange: null,
      studentName: '',
      batch: '',
    });
  };

  const activeFilterCount = 
    filters.status.length + 
    filters.category.length + 
    filters.urgency.length + 
    (filters.dateRange ? 1 : 0) +
    (filters.studentName ? 1 : 0) +
    (filters.batch ? 1 : 0);

  return (
    <div className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="search-input-wrapper rounded-lg">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search complaints by title or description..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-11 bg-card border-border"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters:</span>
        </div>

        <FilterDropdown
          label="Status"
          options={STATUS_OPTIONS}
          selected={filters.status}
          onChange={(selected) => onFilterChange({ ...filters, status: selected })}
        />

        <FilterDropdown
          label="Category"
          options={CATEGORY_OPTIONS}
          selected={filters.category}
          onChange={(selected) => onFilterChange({ ...filters, category: selected })}
        />

        <FilterDropdown
          label="Urgency"
          options={URGENCY_OPTIONS}
          selected={filters.urgency}
          onChange={(selected) => onFilterChange({ ...filters, urgency: selected })}
        />

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "relative gap-2 transition-all",
                filters.dateRange && "border-accent text-accent"
              )}
            >
              <span>Date Range</span>
              {filters.dateRange && (
                <span className="filter-count">1</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 filter-dropdown" align="start">
            <Calendar
              mode="range"
              selected={filters.dateRange ? { from: filters.dateRange.from, to: filters.dateRange.to } : undefined}
              onSelect={(range) => onFilterChange({ ...filters, dateRange: range || null })}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
            {filters.dateRange && filters.dateRange.from && (
              <div className="p-3 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  {format(filters.dateRange.from, 'MMM dd, yyyy')}
                  {filters.dateRange.to && ` - ${format(filters.dateRange.to, 'MMM dd, yyyy')}`}
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Student Name Filter (Admin Only) */}
        {showStudentFilter && (
          <Input
            placeholder="Student name..."
            value={filters.studentName || ''}
            onChange={(e) => onFilterChange({ ...filters, studentName: e.target.value })}
            className="w-48 h-9 text-sm"
          />
        )}

        {/* Batch Filter (Admin Only) */}
        {showStudentFilter && (
          <Input
            placeholder="Batch..."
            value={filters.batch || ''}
            onChange={(e) => onFilterChange({ ...filters, batch: e.target.value })}
            className="w-32 h-9 text-sm"
          />
        )}

        {/* Clear Filters Button */}
        {activeFilterCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearFilters}
            className="gap-2 text-muted-foreground hover:text-foreground animate-shake"
          >
            <X className="w-3 h-3" />
            Clear All ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
};
