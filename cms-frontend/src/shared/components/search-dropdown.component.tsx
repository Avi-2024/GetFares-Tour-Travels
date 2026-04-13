import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

type SearchDropdownOption = {
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

interface SearchDropDownProps {
  value: string;
  options: SearchDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onChange: (value: string, option?: SearchDropdownOption) => void;
  onClear?: () => void;
}

const SearchDropDown = ({
  value,
  options,
  placeholder = "Select option",
  disabled = false,
  loading = false,
  className = "",
  onChange,
  onClear,
}: SearchDropDownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listboxId = useRef(`combobox-${Math.random().toString(36).slice(2)}`);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!query) {
      return options;
    }
    const lowered = query.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowered),
    );
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setIsOpen((prev) => !prev);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputFocus = () => {
    if (disabled) {
      return;
    }
    setIsOpen(true);
  };

  const handleInputChange = (nextValue: string) => {
    if (disabled) {
      return;
    }
    setQuery(nextValue);
    setIsOpen(true);
    setActiveIndex(0);
  };

  const handleSelect = (option: SearchDropdownOption) => {
    onChange(option.value, option);
    setIsOpen(false);
  };

  const handleClear = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
    onChange("");
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) {
        handleSelect(option);
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const inputValue = isOpen ? query : selectedOption?.label ?? "";
  const resolvedClassName =
    className ||
    "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-9 pr-9 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]";

  return (
    <div ref={rootRef} className="relative">
      <div
        className="relative"
        role="combobox"
        aria-haspopup="listbox"
        aria-owns={listboxId.current}
        aria-expanded={isOpen}
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onFocus={handleInputFocus}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={resolvedClassName}
          aria-controls={listboxId.current}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId.current}-${activeIndex}` : undefined
          }
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={handleToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
          aria-label="Toggle options"
          disabled={disabled}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      <div
        id={listboxId.current}
        role="listbox"
        className={`absolute left-0 right-0 z-[9999] mt-2 max-h-64 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_12px_32px_rgba(15,23,42,0.18)] transition ${
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {loading && (
          <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">
            Loading...
          </div>
        )}
        {!loading && filteredOptions.length === 0 && (
          <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">
            No results found
          </div>
        )}
        {!loading &&
          filteredOptions.map((option, index) => {
            const active = index === activeIndex;
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                id={`${listboxId.current}-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                  active
                    ? "bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]"
                    : "text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selected && (
                  <span className="text-xs text-[var(--text-tertiary)]">Selected</span>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
};

export type { SearchDropdownOption };
export default SearchDropDown;
