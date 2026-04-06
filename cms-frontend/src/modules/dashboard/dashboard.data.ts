import {
  AlarmClockCheck,
  CalendarCheck2,
  Users2,
  Wallet,
} from "lucide-react";

class DashboardData {
  public static readonly stats = [
    {
      title: "Revenue",
      value: "$248.9K",
      trend: "+12.4% vs last month",
      icon: Wallet,
      data: [{ value: 10 }, { value: 14 }, { value: 11 }, { value: 16 }, { value: 15 }, { value: 19 }],
    },
    {
      title: "Leads",
      value: "1,284",
      trend: "+8.9% quality score",
      icon: Users2,
      data: [{ value: 9 }, { value: 13 }, { value: 12 }, { value: 14 }, { value: 17 }, { value: 18 }],
    },
    {
      title: "Bookings",
      value: "396",
      trend: "+15.1% conversion",
      icon: CalendarCheck2,
      data: [{ value: 7 }, { value: 8 }, { value: 11 }, { value: 12 }, { value: 13 }, { value: 16 }],
    },
    {
      title: "Open Follow Ups",
      value: "42",
      trend: "-6.2% pending",
      icon: AlarmClockCheck,
      data: [{ value: 16 }, { value: 14 }, { value: 13 }, { value: 11 }, { value: 9 }, { value: 8 }],
    },
  ];

  public static readonly revenue = [
    { name: "Jan", value: 42000 },
    { name: "Feb", value: 51000 },
    { name: "Mar", value: 46000 },
    { name: "Apr", value: 62000 },
    { name: "May", value: 59000 },
    { name: "Jun", value: 67000 },
  ];

  public static readonly leads = [
    { name: "Week 1", organic: 120, referrals: 52 },
    { name: "Week 2", organic: 146, referrals: 66 },
    { name: "Week 3", organic: 138, referrals: 71 },
    { name: "Week 4", organic: 166, referrals: 75 },
  ];

  public static readonly source = [
    { name: "Organic", value: 44, color: "#3b82f6" },
    { name: "Meta Ads", value: 23, color: "#8b5cf6" },
    { name: "Partners", value: 18, color: "#10b981" },
    { name: "Email", value: 15, color: "#f59e0b" },
  ];

  public static readonly recentLeads = [
    { name: "Sophia Carter", source: "Meta Ads", status: "Hot", amount: "$6,200" },
    { name: "Liam Walker", source: "Organic", status: "Warm", amount: "$4,120" },
    { name: "Olivia Brown", source: "Referral", status: "Proposal", amount: "$8,860" },
    { name: "Noah Wilson", source: "Partner", status: "Follow-up", amount: "$5,340" },
  ];
}

export { DashboardData };
