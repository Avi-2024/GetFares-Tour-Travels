import React from "react";
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const revenueData = [
  { name: "Oct 1", revenue: 12000 },
  { name: "Oct 5", revenue: 15500 },
  { name: "Oct 10", revenue: 11000 },
  { name: "Oct 15", revenue: 18000 },
  { name: "Oct 20", revenue: 16500 },
  { name: "Oct 25", revenue: 22000 },
];

const leadData = [
  { name: "Social Media", value: 45 },
  { name: "Website", value: 25 },
  { name: "Referrals", value: 20 },
  { name: "Partners", value: 10 },
];

const COLORS = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b"];

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, Alex! Here's what's happening today.
          </p>
        </div>

        <div className="flex gap-3">
          <span className="text-sm bg-white px-3 py-1.5 border rounded-lg">
            Oct 24, 2023
          </span>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Export Report
          </button>
        </div>
      </div>

      {/* KPI CARDS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">

        <KpiCard title="Total Leads" value="1,248" color="blue" icon="👥"/>
        <KpiCard title="New Today" value="24" color="indigo" icon="📅"/>
        <KpiCard title="Monthly Revenue" value="$84.2k" color="green" icon="💰"/>
        <KpiCard title="Conversion Rate" value="18.5%" color="purple" icon="📈"/>
        <KpiCard title="Pending Calls" value="12" color="orange" icon="📞"/>
        <KpiCard title="Unpaid Invoices" value="5" color="red" icon="📄"/>
        <KpiCard title="Visa Processing" value="8" color="teal" icon="🛂"/>

      </div>

      {/* CHARTS */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Chart */}

        <div className="bg-white p-6 rounded-xl shadow border lg:col-span-2">

          <div className="flex justify-between mb-6">

            <div>
              <h3 className="text-lg font-bold">
                Revenue Performance
              </h3>
              <p className="text-sm text-gray-500">
                Comparing current vs previous month
              </p>
            </div>

          </div>

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={revenueData}>

              <CartesianGrid stroke="#f3f4f6" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

        {/* Lead Source Chart */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h3 className="text-lg font-bold mb-6">
            Lead Sources
          </h3>

          <ResponsiveContainer width="100%" height={300}>

            <PieChart>

              <Pie
                data={leadData}
                innerRadius={70}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >

                {leadData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}

              </Pie>

              <Legend />

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* SECOND ROW */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* TOP DESTINATIONS */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-bold">
              Top Destinations
            </h3>
            <span className="text-blue-600 text-sm">
              View All
            </span>
          </div>

          <Progress name="Dubai" value={85} amount="$42k" color="bg-blue-500"/>
          <Progress name="Maldives" value={65} amount="$28k" color="bg-teal-400"/>
          <Progress name="Paris" value={45} amount="$19k" color="bg-indigo-400"/>
          <Progress name="Bali" value={35} amount="$15k" color="bg-orange-400"/>

        </div>

        {/* TOP CONSULTANTS */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h3 className="text-lg font-bold mb-4">
            Top Consultants
          </h3>

          <Consultant name="Sarah J." deals="24 Deals" amount="$45.2k"/>
          <Consultant name="Mike R." deals="18 Deals" amount="$32.1k"/>
          <Consultant name="Emma W." deals="15 Deals" amount="$28.4k"/>

        </div>

        {/* RECENT ACTIVITY */}

        <div className="bg-white p-6 rounded-xl shadow border">

          <h3 className="text-lg font-bold mb-4">
            Recent Activity
          </h3>

          <Activity text="New Booking confirmed for #BK-2024-88" time="10 minutes ago"/>
          <Activity text="Payment received from John Doe" time="45 minutes ago"/>
          <Activity text="Visa application Pending Review" time="2 hours ago"/>
          <Activity text="System maintenance scheduled" time="Yesterday"/>

        </div>

      </div>

      {/* SLA SECTION */}

      <div className="bg-white p-6 rounded-xl shadow border">

        <div className="flex justify-between mb-4">

          <h3 className="text-lg font-bold">
            SLA & Compliance Status
          </h3>

          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
            Health: Good
          </span>

        </div>

        <div className="grid md:grid-cols-4 gap-6">

          <Metric title="Quote Response Time" value="1h 15m" percent={92}/>
          <Metric title="Visa Doc Accuracy" value="98.5%" percent={98}/>
          <Metric title="Customer Satisfaction" value="4.8/5" percent={96}/>
          <Metric title="Follow-up Compliance" value="82%" percent={82}/>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;





/* COMPONENTS */

const KpiCard = ({ title, value, icon, color }: any) => (
  <div className="bg-white p-4 rounded-xl shadow border h-32 flex flex-col justify-between">
    <div className={`text-${color}-600 text-xl`}>
      {icon}
    </div>
    <div>
      <h3 className="text-2xl font-bold">{value}</h3>
      <p className="text-xs text-gray-500">{title}</p>
    </div>
  </div>
);

const Progress = ({ name, value, amount, color }: any) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-1">
      <span>{name}</span>
      <span>{amount}</span>
    </div>
    <div className="w-full bg-gray-100 h-2 rounded">
      <div className={`${color} h-2 rounded`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

const Consultant = ({ name, deals, amount }: any) => (
  <div className="flex justify-between items-center mb-4">
    <div>
      <p className="font-semibold">{name}</p>
      <p className="text-xs text-gray-500">{deals}</p>
    </div>
    <span className="text-green-600 font-bold">{amount}</span>
  </div>
);

const Activity = ({ text, time }: any) => (
  <div className="mb-4">
    <p className="text-sm">{text}</p>
    <p className="text-xs text-gray-400">{time}</p>
  </div>
);

const Metric = ({ title, value, percent }: any) => (
  <div>
    <div className="flex justify-between text-sm mb-2">
      <span>{title}</span>
      <span className="font-semibold">{value}</span>
    </div>
    <div className="bg-gray-100 h-1.5 rounded">
      <div
        className="bg-blue-500 h-1.5 rounded"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);