import type { ReactNode } from "react";

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

const EmptyState = ({ title, description, action, icon, className }: Props) => (
  <div className={`surface-card flex min-h-72 flex-col items-center justify-center text-center ${className ?? ""}`}>
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
      {icon ?? <span className="text-lg font-semibold">?</span>}
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
    <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export default EmptyState;
