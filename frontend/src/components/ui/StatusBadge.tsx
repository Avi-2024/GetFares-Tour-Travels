const styles: Record<string, string> = {
  new: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900",
  contacted: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900",
  qualified: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900",
  lost: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900",
  default: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
};

const StatusBadge = ({ status }: { status: string }) => {
  const key = status.toLowerCase();
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[key] ?? styles.default}`}>{status}</span>;
};

export default StatusBadge;
