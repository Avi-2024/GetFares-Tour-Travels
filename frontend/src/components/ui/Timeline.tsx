import type { ReactNode } from "react";

type TimelineItem = {
  id: string;
  title: string;
  time: string;
  description?: string;
  meta?: string;
  icon?: ReactNode;
};

type Props = {
  items: TimelineItem[];
};

const Timeline = ({ items }: Props) => (
  <div className="relative pl-4 space-y-6">
    {items.map((item) => (
      <div key={item.id} className="relative pl-8">
        <div className="absolute left-0 top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-blue-600 shadow-sm dark:border-gray-900 dark:bg-blue-900/40 dark:text-blue-300">
          {item.icon ?? <span className="text-xs font-semibold">i</span>}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</span>
              {item.meta ? <span className="text-xs text-gray-500">- {item.meta}</span> : null}
            </div>
            <span className="text-xs text-gray-400">{item.time}</span>
          </div>
          {item.description ? <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p> : null}
        </div>
      </div>
    ))}
  </div>
);

export default Timeline;
