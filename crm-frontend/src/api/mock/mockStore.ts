const now = () => new Date().toISOString();

let idSeq = 1000;
export const nextId = () => String(++idSeq);

export const demoUser = {
  id: "demo-admin-1",
  email: "admin@demo.com",
  fullName: "Demo Admin",
  name: "Demo Admin",
  role: "admin",
  roleId: "role-admin",
  active: true,
  isActive: true,
};

export const mockLeads = [
  {
    id: "1",
    leadId: "LD-1001",
    leadCode: "LD-1001",
    fullName: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "+919876543210",
    destination: { name: "Dubai", country: "UAE" },
    status: "OPEN",
    statusLabel: "New",
    temperature: "HOT",
    priority: "High",
    adultsCount: 2,
    childrenCount: 1,
    childAges: [6],
    packageName: "Dubai Explorer",
    source: "Website",
    createdAt: now(),
    assignedUser: { fullName: "Demo Admin", email: demoUser.email },
    slaStatus: "WITHIN_SLA",
    slaBreached: false,
  },
  {
    id: "2",
    leadId: "LD-1002",
    leadCode: "LD-1002",
    fullName: "Priya Patel",
    email: "priya@example.com",
    phone: "+919812345678",
    destination: { name: "Bali", country: "Indonesia" },
    status: "FOLLOW_UP",
    statusLabel: "Follow Up 1",
    subStatus: "CALL_SCHEDULED",
    temperature: "WARM",
    priority: "Medium",
    adultsCount: 2,
    childrenCount: 0,
    packageName: "Bali Honeymoon",
    source: "Meta Ads",
    createdAt: now(),
    assignedUser: { fullName: "Demo Admin", email: demoUser.email },
    slaStatus: "WITHIN_SLA",
    slaBreached: false,
  },
  {
    id: "3",
    leadId: "LD-1003",
    leadCode: "LD-1003",
    fullName: "James Wilson",
    email: "james@example.com",
    phone: "+447700900123",
    destination: { name: "Paris", country: "France" },
    status: "QUOTED",
    statusLabel: "Quoted",
    temperature: "COLD",
    priority: "Low",
    adultsCount: 4,
    childrenCount: 2,
    childAges: [8, 12],
    packageName: "Europe Highlights",
    source: "Referral",
    createdAt: now(),
    assignedUser: { fullName: "Demo Admin", email: demoUser.email },
    slaStatus: "PENDING",
    slaBreached: false,
  },
];

export const mockCustomers = [
  {
    id: "c1",
    fullName: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "+919876543210",
    segment: "VIP",
    country: "India",
    createdAt: now(),
  },
  {
    id: "c2",
    fullName: "Priya Patel",
    email: "priya@example.com",
    phone: "+919812345678",
    segment: "Regular",
    country: "India",
    createdAt: now(),
  },
];

export const mockBookings = [
  {
    id: "b1",
    bookingCode: "BK-5001",
    status: "CONFIRMED",
    customerName: "Rahul Sharma",
    destination: "Dubai",
    totalAmount: 45000,
    currency: "INR",
    travelDate: "2026-06-15",
    createdAt: now(),
  },
  {
    id: "b2",
    bookingCode: "BK-5002",
    status: "PENDING",
    customerName: "Priya Patel",
    destination: "Bali",
    totalAmount: 62000,
    currency: "INR",
    travelDate: "2026-07-01",
    createdAt: now(),
  },
];

export const mockQuotations = [
  {
    id: "q1",
    quotationCode: "QT-9001",
    status: "SENT",
    customerName: "Rahul Sharma",
    destination: "Dubai",
    totalAmount: 48000,
    currency: "INR",
    createdAt: now(),
  },
  {
    id: "q2",
    quotationCode: "QT-9002",
    status: "DRAFT",
    customerName: "James Wilson",
    destination: "Paris",
    totalAmount: 185000,
    currency: "INR",
    createdAt: now(),
  },
];

export const mockCampaigns = [
  {
    id: "camp1",
    name: "Summer Dubai Push",
    status: "ACTIVE",
    platform: "Meta",
    budget: 50000,
    leadsCount: 24,
    createdAt: now(),
  },
];

export const mockComplaints = [
  {
    id: "cmp1",
    ticketCode: "CMP-101",
    subject: "Delay in visa processing",
    status: "OPEN",
    priority: "HIGH",
    customerName: "Rahul Sharma",
    createdAt: now(),
  },
];

export const mockUsers = [
  {
    id: demoUser.id,
    fullName: demoUser.fullName,
    email: demoUser.email,
    role: "admin",
    isActive: true,
  },
  {
    id: "u2",
    fullName: "Sales Agent",
    email: "agent@demo.com",
    role: "agent",
    isActive: true,
  },
];

export const mockNotifications = [
  {
    id: "n1",
    title: "New lead assigned",
    message: "Lead LD-1001 assigned to you",
    type: "LEAD",
    isRead: false,
    createdAt: now(),
  },
  {
    id: "n2",
    title: "Quotation viewed",
    message: "Customer viewed QT-9001",
    type: "QUOTATION",
    isRead: true,
    createdAt: now(),
  },
];

export const mockDestinations = [
  { id: "d1", name: "Dubai", country: "UAE", isActive: true },
  { id: "d2", name: "Bali", country: "Indonesia", isActive: true },
  { id: "d3", name: "Paris", country: "France", isActive: true },
];

export const mockPackages = [
  {
    id: "p1",
    name: "Dubai Explorer",
    destination: "Dubai",
    durationDays: 5,
    basePrice: 45000,
    currency: "INR",
    status: "PUBLISHED",
  },
];

export const mockSuppliers = [
  {
    id: "s1",
    name: "Skyline Hotels",
    type: "HOTEL",
    country: "UAE",
    isActive: true,
  },
];

export const mockVisaCases = [
  {
    id: "v1",
    caseCode: "VS-201",
    status: "IN_PROGRESS",
    applicantName: "Rahul Sharma",
    destinationCountry: "UAE",
    visaType: "TOURIST",
    createdAt: now(),
  },
];

export const mockPayments = [
  {
    id: "pay1",
    paymentCode: "PAY-301",
    status: "PENDING",
    amount: 25000,
    currency: "INR",
    bookingCode: "BK-5001",
    customerName: "Rahul Sharma",
    createdAt: now(),
  },
];

export const mockRoles = [
  {
    id: "role-admin",
    name: "admin",
    description: "Full access",
    isActive: true,
  },
  {
    id: "role-agent",
    name: "agent",
    description: "Sales agent",
    isActive: true,
  },
];

export const allPermissions = [
  "leads:read",
  "leads:create",
  "leads:update",
  "bookings:read",
  "bookings:create",
  "quotations:read",
  "quotations:create",
  "quotations:update",
  "payments:read",
  "refunds:read",
  "visa:read",
  "visa:create",
  "campaigns:read",
  "customers:read",
  "complaints:read",
  "users:read",
  "settings:read",
  "reports:read",
  "notifications:read",
  "suppliers:read",
];
