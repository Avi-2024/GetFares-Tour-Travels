import type { ReactNode } from 'react'
import { FaSearch } from 'react-icons/fa'

type FilterTab = {
  key: string
  label: string
}

type TableFilterPanelProps = {
  error?: string
  tabs?: FilterTab[]
  activeTab?: string
  onTabChange?: (key: string) => void
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  activeFilterCount?: number
  rightMetaText?: string
  actions?: ReactNode
  children?: ReactNode
  onReset?: () => void
  resetLabel?: string
  withBorder?: boolean
}

const TableFilterPanel = ({
  error,
  tabs,
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  activeFilterCount,
  rightMetaText,
  actions,
  children,
  onReset,
  resetLabel = 'Reset Filters',
  withBorder = true
}: TableFilterPanelProps) => {
  const hasTabs = Boolean(tabs?.length && onTabChange)
  const hasFilterBox = Boolean(children || onReset)

  const derivedMetaText =
    rightMetaText ??
    (typeof activeFilterCount === 'number'
      ? activeFilterCount > 0
        ? `${activeFilterCount} filter(s) applied`
        : 'No filter applied'
      : '')

  return (
    <div
      className={`${withBorder ? 'border-b border-gray-100 dark:border-gray-800 p-3 sm:p-4' : ''} space-y-3`}
    >
      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {error}
        </div>
      ) : null}

      {hasTabs ? (
        <div className='w-full overflow-x-auto pb-1 scrollbar-hide'>
          <div className='inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 min-w-max'>
            {tabs?.map(item => (
              <button
                key={item.key}
                onClick={() => onTabChange?.(item.key)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === item.key
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-end'>
        <div className='relative w-full'>
          <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400' />
          <input
            type='text'
            value={searchValue}
            onChange={event => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>
        {derivedMetaText || actions ? (
          <div className='flex flex-wrap items-center justify-end gap-2'>
            {derivedMetaText ? (
              <div className='text-xs text-gray-500 dark:text-gray-400'>
                {derivedMetaText}
              </div>
            ) : null}
            {actions}
          </div>
        ) : null}
      </div>

      {hasFilterBox ? (
        <div className='space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-700 dark:bg-gray-900/30'>
          {children}
          {onReset ? (
            <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
              <button
                type='button'
                onClick={onReset}
                className='rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
              >
                {resetLabel}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default TableFilterPanel
