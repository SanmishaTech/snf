import * as React from 'react';
import { ChevronsUpDown, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

export type ComboboxItem = {
  value: string;
  label: string;
  subLabel?: string;
};

export interface SearchableComboboxProps {
  value: string | null;
  onChange: (value: string | null, item?: ComboboxItem) => void;
  items: ComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  selectedLabel?: string | null;
  onQueryChange?: (q: string) => void;
  buttonClassName?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  items,
  placeholder = 'Select... ',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found',
  loading = false,
  disabled = false,
  selectedLabel = null,
  onQueryChange,
  buttonClassName,
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const selected = React.useMemo(() => {
    if (selectedLabel) return selectedLabel;
    const found = items.find((i) => i.value === (value ?? ''));
    return found?.label ?? '';
  }, [items, value, selectedLabel]);

  const handleSelect = (val: string) => {
    const item = items.find((i) => i.value === val);
    onChange(val, item);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          role="combobox"
          variant="outline"
          aria-expanded={open}
          className={cn('w-full justify-between', buttonClassName)}
          disabled={disabled}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>{selected || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true} className="w-full">
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              onQueryChange?.(v);
            }}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching...
              </div>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.value} value={`${item.label} ${item.subLabel || ''}`.trim()} onSelect={() => handleSelect(item.value)}>
                  <Check className={cn('mr-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    {item.subLabel ? (
                      <span className="text-xs text-muted-foreground">{item.subLabel}</span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableCombobox;
