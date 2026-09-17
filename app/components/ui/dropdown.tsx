"use client";
import { cn } from "cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DropdownProps = {
  options: DropdownOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
};

function Dropdown({
  options,
  placeholder = "Pilih X",
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className,
  contentClassName,
}: DropdownProps) {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={(nextValue) => {
        if (nextValue !== null) {
          onValueChange?.(nextValue);
        }
      }}
    >
      <SelectTrigger
        disabled={disabled}
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border border-primary-500 bg-neutral-0 px-3 font-sans text-b9 text-primary-700 shadow-none transition-colors data-placeholder:text-neutral-500 hover:bg-primary-50 focus-visible:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-200 disabled:border-transparent disabled:bg-neutral-100 disabled:text-neutral-400 disabled:opacity-100 sm:h-12 sm:px-4 sm:text-b7",
          className,
        )}
      >
        {/* Base UI's Select.Value renders the raw VALUE by default -- it
            only shows the human label if you explicitly map it yourself
            via this render-prop. Without it, every Dropdown usage where
            value !== label (most of them) silently displayed things like
            "all"/"500" instead of "Semua Jenis"/"< 500 m". */}
        <SelectValue placeholder={placeholder}>
          {(selected: string | null) =>
            options.find((option) => option.value === selected)?.label ?? placeholder
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="start"
        sideOffset={4}
        alignItemWithTrigger={false}
        className={cn(
          "w-(--anchor-width) min-w-0 origin-(--transform-origin) rounded-lg border-0 bg-neutral-100 p-2 shadow-none ring-0 transition-[opacity,transform] duration-150 ease-out data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1",
          contentClassName,
        )}
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className="h-10 rounded-md px-2 font-sans text-b9 text-neutral-500 focus:bg-neutral-200 focus:text-neutral-700 sm:h-12 sm:px-3 sm:text-b7"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { Dropdown };
export type { DropdownOption, DropdownProps };
