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
    className={`inline-flex w-max max-w-full flex-nowrap gap-1 rounded-2xl border border-purple-100 bg-purple-50/70 p-1 dark:border-blue-400/40 dark:bg-blue-950/30 ${
      className ?? ''
    }`}
  >
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`whitespace-nowrap rounded-xl px-2.5 py-1 text-[13px] font-semibold tracking-tight transition-all ${
          active === tab.id
            ? 'bg-[rgba(96,47,247,0.8)] text-white shadow-sm shadow-purple-600/40'
            : 'text-purple-700/70 hover:bg-white/70 hover:text-purple-700 dark:text-purple-200'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
)

export default FilterTabs
