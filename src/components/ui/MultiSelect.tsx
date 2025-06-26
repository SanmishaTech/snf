import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckIcon, XCircle, ChevronDown, XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';

const multiSelectVariants = cva(
  'm-1 transition ease-in-out delay-150 hover:-translate-y-1 hover:scale-110 duration-300',
  {
    variants: {
      variant: {
        default:
          'border-foreground/10 text-foreground bg-card hover:bg-card/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        inverted:
          'inverted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface MultiSelectProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof multiSelectVariants> {
  options: {
    label: string;
    value: any;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
  onValueChange: (value: any[]) => void;
  defaultValue: any[];
  placeholder?: string;
  animation?: number;
  maxCount?: number;
  asChild?: boolean;
  className?: string;
}

export const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>((
  {
    options,
    onValueChange,
    variant,
    defaultValue = [],
    placeholder = 'Select options',
    animation = 0,
    maxCount = 3,
    asChild = false,
    className,
    ...props
  },
  ref
) => {
  const [selectedValues, setSelectedValues] = React.useState(new Set(defaultValue));
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    setSelectedValues(new Set(defaultValue));
  }, [defaultValue]);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      setIsPopoverOpen(true);
    }
  };

  const toggleOption = (value: any) => {
    const newSelectedValues = new Set(selectedValues);
    if (newSelectedValues.has(value)) {
      newSelectedValues.delete(value);
    } else {
      newSelectedValues.add(value);
    }
    setSelectedValues(newSelectedValues);
    onValueChange(Array.from(newSelectedValues));
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          {...props}
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className="flex w-full p-1 rounded-md border min-h-10 h-auto items-center justify-between bg-inherit hover:bg-card"
        >
          {selectedValues.size > 0 ? (
            <div className="flex justify-between items-center w-full">
              <div className="flex flex-wrap items-center">
                {options
                  .filter((option) => selectedValues.has(option.value))
                  .map((option) => (
                    <Badge
                      key={option.value}
                      className={cn(multiSelectVariants({ variant, className }))}
                      style={{ animationDuration: `${animation}s` }}
                    >
                      {option.label}
                      <XCircle className="ml-2 h-4 w-4 cursor-pointer" onClick={(event) => {
                        event.stopPropagation();
                        toggleOption(option.value);
                      }} />
                    </Badge>
                  ))}
              </div>
              <div className="flex items-center justify-between">
                <XIcon className="h-4 mx-2 cursor-pointer text-muted-foreground" onClick={(event) => {
                  event.stopPropagation();
                  setSelectedValues(new Set());
                  onValueChange([]);
                }} />
                <Separator orientation="vertical" className="flex min-h-6 h-full" />
                <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full mx-auto">
              <span className="text-sm text-muted-foreground mx-3">{placeholder}</span>
              <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." onKeyDown={handleInputKeyDown} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggleOption(option.value)}
                    style={{ pointerEvents: 'auto', opacity: 1 }}
                    className="cursor-pointer"
                  >
                    <div className={cn(
                      'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible'
                    )}>
                      <CheckIcon className={cn('h-4 w-4')} />
                    </div>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setSelectedValues(new Set());
                      onValueChange([]);
                    }}
                    style={{ pointerEvents: 'auto', opacity: 1 }}
                    className="cursor-pointer"
                  >
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
