import { Component } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";

interface StatPoint {
  value: number;
}

interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  data: StatPoint[];
}

class StatCardComponent extends Component<StatCardProps> {
  render() {
    const { title, value, trend, icon: Icon, data } = this.props;
    const gradientId = `gradient-${title.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <motion.article
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="surface-card group p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{title}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</h3>
            <p className="mt-1 text-xs font-semibold text-[var(--success)]">{trend}</p>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[color-mix(in_srgb,var(--primary)_26%,transparent)] to-[color-mix(in_srgb,var(--accent)_26%,transparent)] text-[var(--primary)]">
            <Icon size={18} />
          </span>
        </div>

        <div className="mt-4 h-14">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.article>
    );
  }
}

export default StatCardComponent;
