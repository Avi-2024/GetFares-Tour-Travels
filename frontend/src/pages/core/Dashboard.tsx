import React, { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FaArrowTrendDown, FaArrowTrendUp, FaCalendarDays, FaPhone, FaPlane, FaSackDollar, FaUserGroup } from "react-icons/fa6";
import SurfaceCard from "../../components/ui/SurfaceCard";

type Range = "Today" | "Week" | "Month" | "Year";
const data: Record<Range, Array<{ name: string; revenue: number; last: number }>> = {
  Today: [{ name: "08:00", revenue: 1200, last: 900 }, { name: "10:00", revenue: 1800, last: 1250 }, { name: "12:00", revenue: 1400, last: 1150 }, { name: "14:00", revenue: 2100, last: 1580 }, { name: "16:00", revenue: 2400, last: 2000 }],
  Week: [{ name: "Mon", revenue: 9200, last: 7800 }, { name: "Tue", revenue: 12400, last: 10020 }, { name: "Wed", revenue: 11100, last: 9440 }, { name: "Thu", revenue: 13800, last: 12000 }, { name: "Fri", revenue: 15900, last: 13300 }, { name: "Sat", revenue: 17400, last: 15000 }, { name: "Sun", revenue: 14600, last: 12800 }],
  Month: [{ name: "W1", revenue: 28000, last: 24200 }, { name: "W2", revenue: 31400, last: 26600 }, { name: "W3", revenue: 29200, last: 27900 }, { name: "W4", revenue: 36800, last: 30200 }],
  Year: [{ name: "Jan", revenue: 98000, last: 84000 }, { name: "Feb", revenue: 103000, last: 90000 }, { name: "Mar", revenue: 118000, last: 97000 }, { name: "Apr", revenue: 126000, last: 104000 }],
};
const sources = [{ name: "Social", value: 42 }, { name: "Website", value: 27 }, { name: "Referrals", value: 19 }, { name: "Partners", value: 12 }];
const colors = ["#2563eb", "#22c55e", "#a855f7", "#f59e0b"];

const Dashboard: React.FC = () => {
  const [range, setRange] = useState<Range>("Week");
  const rev = useMemo(() => data[range], [range]);
  const kpis = [
    { title: "Total Leads", value: "1,248", trend: "+12%", up: true, icon: FaUserGroup, bg: "bg-blue-100 text-blue-600" },
    { title: "Revenue", value: "$84.2k", trend: "+9.4%", up: true, icon: FaSackDollar, bg: "bg-green-100 text-green-600" },
    { title: "Pending Calls", value: "12", trend: "-4%", up: false, icon: FaPhone, bg: "bg-amber-100 text-amber-500" },
    { title: "Bookings", value: "186", trend: "+6%", up: true, icon: FaPlane, bg: "bg-gray-100 text-gray-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard Overview</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Performance, pipeline health, and recent operations at a glance.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"><FaCalendarDays className="text-blue-600" /> March 10, 2026</div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <SurfaceCard key={k.title} hoverable className="p-5">
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${k.bg}`}><k.icon /></div>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${k.up ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{k.up ? <FaArrowTrendUp className="mr-1" /> : <FaArrowTrendDown className="mr-1" />}{k.trend}</span>
            </div>
            <p className="mt-4 text-sm text-gray-500">{k.title}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">{k.value}</p>
          </SurfaceCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SurfaceCard className="xl:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Revenue Performance</h2>
              <p className="text-sm text-gray-500">Current period vs previous period.</p>
            </div>
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
              {(["Today", "Week", "Month", "Year"] as Range[]).map((r) => <button key={r} onClick={() => setRange(r)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${range === r ? "bg-blue-600 text-white" : "text-gray-600"}`}>{r}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={rev}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip formatter={(v: number | string | undefined) => [`$${Number(v ?? 0).toLocaleString()}`, "Revenue"]} />
              <Legend />
              <Area type="monotone" dataKey="revenue" fill="url(#g)" stroke="#2563eb" strokeWidth={2} name="Current" />
              <Line type="monotone" dataKey="last" stroke="#94a3b8" strokeWidth={2} dot={false} name="Previous" />
            </AreaChart>
          </ResponsiveContainer>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Lead Sources</h2>
          <p className="mb-4 text-sm text-gray-500">Channel split for new leads.</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sources} innerRadius={65} outerRadius={95} paddingAngle={4} dataKey="value" nameKey="name">
                {sources.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number | string | undefined) => `${Number(v ?? 0)}%`} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </SurfaceCard>
      </div>
    </div>
  );
};

export default Dashboard;
