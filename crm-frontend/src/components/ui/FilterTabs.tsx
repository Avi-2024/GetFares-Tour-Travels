type Tab = {
  id: string
  label: string
}

type Props = {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  className?: string
}

const FilterTabs = ({ tabs, active, onChange, className }: Props) => (
  <div
    className={`inline-flex w-full flex-nowrap gap-1 rounded-2xl border border-blue-100 bg-blue-50/70 p-1 md:w-auto dark:border-blue-400/40 dark:bg-blue-950/30 min-w-max ${
      className ?? ''
    }`}
  >
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-xl px-2.5 py-1 text-[13px] font-semibold tracking-tight transition-all ${
          active === tab.id
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/40'
            : 'text-blue-700/70 hover:bg-white/70 hover:text-blue-700 dark:text-blue-200'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

export default FilterTabs
