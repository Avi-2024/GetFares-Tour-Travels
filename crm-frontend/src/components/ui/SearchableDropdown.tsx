import React, { useMemo, useRef, useState } from 'react'
import { FaChevronDown, FaSearch } from 'react-icons/fa'

export type DropdownOption = {
  value: string
  label: string
  selectedLabel?: string
  searchText?: string
  leftLabel?: string
  rightLabel?: string
  rightEmphasis?: boolean
  rightSubLabel?: string
  rightSubEmphasis?: boolean
}

type SearchableDropdownProps = {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  hasError?: boolean
  searchPlaceholder?: string
  dropdownPlacement?: 'down' | 'up'
  onSearch?: (query: string) => void
  /** Fired when the menu opens (e.g. load recent options). */
  onMenuOpen?: () => void
  /** When typing does not match an option exactly, offer using the typed text */
  creatable?: boolean
  onCreatePick?: (trimmedSearch: string) => void
  createPrompt?: string
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  hasError = false,
  searchPlaceholder = 'Search...',
  dropdownPlacement = 'down',
  onSearch,
  onMenuOpen,
  creatable = false,
  onCreatePick,
  createPrompt = 'Use as custom:'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const [placement, setPlacement] = useState<'down' | 'up'>(dropdownPlacement)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (onSearch && query.trim()) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        onSearch(query.trim())
      }, 300)
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query, onSearch])

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  // Auto-detect placement to avoid going off-screen
  React.useEffect(() => {
    if (!isOpen || !rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 280
    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      setPlacement('up')
    } else {
      setPlacement('down')
    }
  }, [isOpen])

  const selected = options.find(item => item.value === value)

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    if (onSearch && term.length >= 2) return options
    return options.filter(item => {
      const searchable = (item.searchText ?? item.label).toLowerCase()
      return searchable.includes(term)
    })
  }, [onSearch, options, query])

  const queryTrimmed = query.trim()
  const hasExactMatch = useMemo(() => {
    if (!queryTrimmed) return false
    const lc = queryTrimmed.toLowerCase()
    return options.some(
      o =>
        o.label.trim().toLowerCase() === lc ||
        String(o.value).trim().toLowerCase() === lc,
    )
  }, [options, queryTrimmed])

  const enableScroll = options.length > 5

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type='button'
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setIsOpen(prev => {
            const next = !prev
            if (next) {
              setQuery('')
              onMenuOpen?.()
            }
            return next
          })
        }}
        className={`flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-left text-sm text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-600 dark:focus:ring-blue-900/60 ${
          hasError ? 'border-red-500' : 'border-gray-200'
        }`}
      >
        <span
          className={`truncate ${
            selected ? 'font-medium' : 'text-gray-400 dark:text-gray-500'
          }`}
        >
          {selected?.selectedLabel ?? selected?.label ?? placeholder}
        </span>
        <FaChevronDown
          className={`ml-2 text-xs text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen ? (
        <div
          ref={dropdownRef}
          className={`absolute z-[9999] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${
            placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className='border-b border-gray-100 p-2 dark:border-gray-800'>
            <div className='relative'>
              <FaSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
              <input
                className='field-input !rounded-lg !py-2 !pl-9'
                placeholder={searchPlaceholder}
                value={query}
                onChange={event => setQuery(event.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div
            className={`p-1.5 ${
              enableScroll
                ? 'status-dropdown-scroll max-h-56 overflow-y-auto'
                : 'overflow-y-visible'
            }`}
          >
            {creatable &&
            Boolean(onCreatePick) &&
            queryTrimmed.length > 0 &&
            !hasExactMatch ?
              <button
                type='button'
                onClick={() => {
                  onCreatePick?.(queryTrimmed)
                  setIsOpen(false)
                  setQuery('')
                }}
                className='mb-2 w-full rounded-lg border border-dashed border-blue-300 bg-blue-50/90 px-3 py-2.5 text-left text-sm font-medium text-blue-800 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-100 dark:hover:bg-blue-900/60'
              >
                {createPrompt}{' '}
                <span className='break-words'>&quot;{queryTrimmed}&quot;</span>
              </button>
            : null}
            {filteredOptions.length ? (
              filteredOptions.map(item => {
                const isActive = item.value === value
                const hasSplitLabels = Boolean(
                  item.leftLabel || item.rightLabel
                )
                return (
                  <button
                    key={`${item.value}-${item.label}`}
                    type='button'
                    onClick={() => {
                      onChange(item.value)
                      setIsOpen(false)
                      setQuery('')
                    }}
                    className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors last:mb-0 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    {hasSplitLabels ? (
                      <div className='flex w-full items-center justify-between gap-3'>
                        <span className='truncate font-semibold'>
                          {item.leftLabel ?? item.label}
                        </span>
                        <div className='shrink-0 text-right'>
                          <span
                            className={`block text-xs ${
                              item.rightEmphasis
                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                : 'font-normal text-gray-700 dark:text-gray-300'
                            } ${
                              isActive
                                ? 'text-blue-600/80 dark:text-blue-300/80'
                                : ''
                            }`}
                          >
                            {item.rightLabel}
                          </span>
                          {item.rightSubLabel ? (
                            <span
                              className={`block text-[12px] ${
                                item.rightSubEmphasis
                                  ? 'font-bold text-emerald-600 dark:text-emerald-400'
                                  : 'font-normal text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {item.rightSubLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <span className={isActive ? 'font-semibold' : ''}>
                        {item.label}
                      </span>
                    )}
                  </button>
                )
              })
            ) : (
              <p className='px-3 py-3 text-sm text-gray-500 dark:text-gray-400'>
                No matching option found.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default SearchableDropdown
