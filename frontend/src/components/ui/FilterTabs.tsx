type Tab = {
  id: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

const FilterTabs = ({ tabs, active, onChange, className }: Props) => (
  <div className={`inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 md:w-auto dark:border-gray-700 dark:bg-gray-800 ${className ?? ""}`}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${active === tab.id ? "bg-white text-blue-600 dark:bg-gray-700" : "text-gray-600 dark:text-gray-300"}`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default FilterTabs;
