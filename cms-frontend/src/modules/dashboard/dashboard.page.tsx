import { Component } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  BellRing,
  CircleDashed,
  LayoutGrid,
} from "lucide-react";
import SurfaceCardComponent from "../../shared/components/cards/surface-card.component";
import StatCardComponent from "../../shared/components/cards/stat-card.component";
import { DashboardData } from "./dashboard.data";

class DashboardPage extends Component {
  render() {
    return (
      <div className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="surface-card-elevated relative overflow-hidden p-6"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--accent)_16%,transparent),transparent_58%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_50%)]" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-(--text-secondary)">
                CMS Command Center
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-(--text-primary)">
                Build Faster Campaign Operations
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-(--text-secondary)">
                Manage destinations, packages, visa content, and media rollout from one cohesive workspace.
                Your current publishing velocity is 18% faster than last quarter.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-(--primary) to-(--accent) px-4 py-2.5 text-sm font-semibold text-white shadow-(--shadow-soft)"
            >
              Launch Campaign
              <ArrowUpRight size={16} />
            </button>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DashboardData.stats.map((stat) => (
            <StatCardComponent
              key={stat.title}
              title={stat.title}
              value={stat.value}
              trend={stat.trend}
              icon={stat.icon}
              data={stat.data}
            />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[2fr_1fr]">
          <SurfaceCardComponent
            title="Revenue Momentum"
            subtitle="Monthly performance with smooth growth curve"
            rightSlot={
              <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_18%,transparent)] px-2 py-1 text-xs font-semibold text-(--success)">
                +14.3%
              </span>
            }
          >
            <div className="h-70">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={DashboardData.revenue}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCardComponent>

          <SurfaceCardComponent title="Lead Sources" subtitle="Current pipeline mix">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={DashboardData.source}
                    innerRadius={56}
                    outerRadius={82}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {DashboardData.source.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {DashboardData.source.map((source) => (
                <div key={source.name} className="flex items-center gap-2 text-(--text-secondary)">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                  {source.name}
                </div>
              ))}
            </div>
          </SurfaceCardComponent>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <SurfaceCardComponent title="Recent Leads" subtitle="Top active opportunities in CRM">
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-(--text-secondary)">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Customer</th>
                    <th className="px-3 py-3 font-semibold">Source</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Potential</th>
                  </tr>
                </thead>
                <tbody>
                  {DashboardData.recentLeads.map((lead) => (
                    <tr key={lead.name} className="border-t border-(--border) transition hover:bg-(--surface)">
                      <td className="px-3 py-3 font-medium text-(--text-primary)">{lead.name}</td>
                      <td className="px-3 py-3 text-(--text-secondary)">{lead.source}</td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-[color-mix(in_srgb,var(--primary)_18%,transparent)] px-2 py-1 text-xs font-semibold text-(--primary)">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-(--text-primary)">{lead.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SurfaceCardComponent>

          <div className="space-y-4">
            <SurfaceCardComponent title="Lead Velocity" subtitle="Organic vs referral by week">
              <div className="h-45">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={DashboardData.leads}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="organic" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="referrals" fill="var(--accent)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCardComponent>

            <SurfaceCardComponent title="Upcoming Follow-Ups">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-2xl border border-(--border) bg-(--surface) p-3">
                  <BellRing size={16} className="text-(--warning)" />
                  <div>
                    <p className="font-semibold text-(--text-primary)">Maldives group package review</p>
                    <p className="text-xs text-(--text-secondary)">Today at 4:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-(--border) bg-(--surface) p-3">
                  <LayoutGrid size={16} className="text-(--primary)" />
                  <div>
                    <p className="font-semibold text-(--text-primary)">Visa document audit</p>
                    <p className="text-xs text-(--text-secondary)">Tomorrow at 11:30 AM</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-dashed border-(--border) bg-(--surface) p-6 text-center">
                  <CircleDashed size={20} className="mx-auto text-(--text-secondary)" />
                  <p className="mt-2 text-sm font-semibold text-(--text-primary)">
                    No blocked approvals right now
                  </p>
                  <p className="text-xs text-(--text-secondary)">
                    Add a new reminder to keep your team on track.
                  </p>
                </div>
              </div>
            </SurfaceCardComponent>
          </div>
        </section>
      </div>
    );
  }
}

export default DashboardPage;
