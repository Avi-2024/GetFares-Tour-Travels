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
  dropdownPlacement = 'down'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

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

  const selected = options.find(item => item.value === value)

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter(item => {
      const searchable = (item.searchText ?? item.label).toLowerCase()
      return searchable.includes(term)
    })
  }, [options, query])

  const enableScroll = options.length > 5

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type='button'
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          setIsOpen(prev => {
            if (!prev) setQuery('')
            return !prev
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
          className={`absolute z-20 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${
            dropdownPlacement === 'up' ? 'bottom-full mb-2' : 'mt-2'
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
