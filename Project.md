Getfares Tour & Travel CRM
Module A: Complete System Overview
Business Requirements
• Provide an all-in-one CRM for Tour & Travel companies.
• Centralize leads, packages, customers, quotations, visa cases, reports,
employees.
• Automate every operational task: lead capture → distribution → quotation →
follow-up → booking.
• Ensure real-time visibility for management on sales, revenue, performance.
User Requirements
• Admin: Full visibility, access, control, configuration.
• Managers: Team monitoring, target tracking, lead allocation oversight.
• Sales Consultants: Manage leads, create quotations, update status, follow
follow-ups.
• Visa Executives: Manage visa pipeline, document status, appointment tracking.
• Marketing: Access campaigns, package performance, send bulk
emails/WhatsApp.
• Customer: Receive quotations, WhatsApp updates, reminders, confirmations.
Functions / Scope
• End-to-end CRM backbone connecting all modules.
• Role-based access control.
• Real-time dashboards.
• Automated workflows (lead, follow-up, quotation, visa, post-sale).
• Integration with website, CMS, WhatsApp, Facebook, Instagram, ads, landing
pages.
Module B: Automatic Lead Capture
Business Requirements
• Automatically fetch leads from Facebook, Instagram, Website, WhatsApp.
• Avoid lead leakage and reduce response time.
User Requirements
• Admin: Configure integrations.
• Sales Executive: Receive new leads instantly with notifications.
• Customer: Receive instant WhatsApp welcome message.
Functions / Scope
• Auto-API integration with FB/IG Lead Ads.
• Website enquiry auto-sync with package ID.
• WhatsApp-triggered enquiries captured as CRM leads.
• Lead data fields include: personal details, travel requirements, source
campaign, etc.
• Lead scoring (Hot/Warm/Cold).
• Anti-duplication logic.
Module C: Smart Lead Distribution
Business Requirements
• Assign the right lead to the right consultant automatically.
• Improve speed, accuracy & eliminate internal conflicts.
User Requirements
• Admin: Configure rules, override manually.
• Managers: View team load & assignment logic.
• Sales Consultant: Receive only relevant leads.
Functions / Scope
• Rule-based routing (Destination, Budget, Expertise).
• Round-robin logic.
• Performance-based distribution.
• Auto-skip sales executive on leave.
• Lead reassign if agent inactive for X minutes.
• Manager alerts for unattended leads.
• Workload balancing.
Module D: Sales Team Management
Business Requirements
• Track agent performance, calls, tasks, follow-ups, targets.
• Provide transparency and accountability.
User Requirements
• Admin/Manager: See all team performance metrics.
• Agents: View daily to-do list, personal targets.
Functions / Scope
• Daily task dashboard.
• Follow-up tracking.
• Target vs Achievement.
• Performance ranking.
• Activity logs: calls, status changes, quotes sent.
Module E: Quotation Management
Business Requirements
• Create beautiful quotations in 5–10 minutes.
• Maintain professionalism and branding.
User Requirements
• Sales Consultant: Create/edit/send quotations.
• Manager: View quotation analytics.
• Customer: Receive PDF or link on WhatsApp/email.
Functions / Scope
• Ready-made templates.
• Auto-filling customer data.
• Add supplier cost → auto-calculate profit.
• Auto-reminders after 24 hours.
• Upload confirmed quotation (Final PDF).
• Status update: Quoted → Converted.
Module F: WhatsApp Automation
Business Requirements
• Automate customer communication to increase engagement.
User Requirements
• Agents: Use two-way chat.
• Customer: Receive automated sequences.
Functions / Scope
• Automated triggers:
o New lead → Welcome message
o Quotation sent → Package + PDF link
o Quotation not opened → Reminder
o Pre-travel → Trip reminder
o Post-travel → Feedback request
• Templates with variables.
• Two-way WhatsApp chat.
Module G: Lead Management & Follow-up System
Business Requirements
• Track complete lead lifecycle.
• Ensure no follow-up is missed.
User Requirements
• Consultant: Daily follow-ups, notes, next follow-up date.
• Manager: Overdue follow-up alerts, response time tracking.
Functions / Scope
• Lead stages: Open → WIP → Quoted → Follow-up → Converted/Lost.
• Detailed status sub-stages:
o Contacted
o Quote pending
o Quote sent
o Follow-up 1/2/3
o Payment pending
• Daily follow-up dashboard.
• Overdue alerts.
• Email/WhatsApp notifications for pending follow-ups.
Module H: Customer Management
Business Requirements
• Store all customer data, history, preferences for repeat sales.
User Requirements
• Consultant: View customer preferences & past interactions.
• Marketing: Segment customers for campaigns.
Functions / Scope
• Customer profile with contact, budget, preferences.
• Travel history & Visa history.
• Special dates: Anniversary, Birthday.
• Segmentation (Platinum/Gold/Silver/New).
• Marketing automation:
o Bulk email
o WhatsApp offers
o Auto follow-up sequences
Module I: Visa Tracking & Operations
Business Requirements
• End-to-end visa case management.
• Prevent document delays and errors.
User Requirements
• Visa Executive: Manage documents, submission, appointments.
• Consultant: Track visa status of their bookings.
• Manager: View visa performance.
Functions / Scope
• Visa fields: Country, Type, Submission, Fees, Supplier, Appointment, Status.
• Document upload.
• Pending document alerts.
• Rejection tracking.
• Visa validity reminders.
Module J: Reports & Analytics
Business Requirements
• Provide real-time insights for revenue, conversions, team performance.
User Requirements
• Admin/Manager: View company-wide and consultant-level data.
Functions / Scope
• Dashboards with:
o Total leads
o Converted leads
o Revenue (Holiday + Visa)
o Monthly profit
o Consultant-wise performance
o Trending destinations
o Lead source performance
o Conversion funnel
o Lost lead reasons
• Exportable reports.
• Forecasting: pipeline revenue, expected conversions, seasonal trends.
• Supplier performance tracking.
Module K: Employee Management
Business Requirements
• Manage employees, attendance, roles, targets, incentives.
User Requirements
• HR/Admin: Create roles, assign permissions.
• Manager: Track attendance & targets.
• Employee: View targets and incentives.
Functions / Scope
• Employee directory.
• Attendance (manual/auto).
• Leave management.
• Target & incentive tracking.
• Role-based access control (Admin / Manager / Agent / Visa Exec / Marketing).
Module L: Operations & Customer Service
Business Requirements
• Manage post-sales operations like complaints, cancellations, upgrades.
User Requirements
• Ops team: Resolve cases.
• Management: Track quality.
Functions / Scope
• Complaint tracking.
• Refund cases.
• Cancellation workflow.
• Upgrade requests.
• Emergency case logging.
Module M: Management Tools & Monthly Summary
Business Requirements
• Provide strategic reporting for top leadership.
User Requirements
• Admin/Owners: Need monthly overview.
Functions / Scope
• Monthly summary including:
o Total leads
o Total bookings
o Conversion %
o Revenue / Cost / Profit
o Avg booking value
o Avg margin %
• Destination-wise performance chart.
• Consultant-wise performance.
• Supplier negotiation insights.
Module N: Proposed Technology
Frontend
• React.js
• Redux Toolkit
• Tailwind / Material UI
• SEO for package pages
Backend (Microservices)
• Node.js (Express / NestJS)
• Fine for automation engines: lead distribution, follow-ups, WhatsApp triggers.
Services recommended:
o Lead Service
o Quotation Service
o Package Service
o User/Role/Auth Service
o WhatsApp Automation Service
o Visa Module Service
o Reporting & Analytics Service
o Notification Service
Database
• PostgreSQL
o Best for heavy relational queries
o Ideal for analytics & reporting
o Handles transactions (bookings, visa approved workflows)
DevOps / Hosting
• AWS
• Azure
Integrations
• Meta Lead Ads
• WhatsApp Cloud API
• SMTP / SendGrid for emails

---
Finance System ↔ CRM Mapping Requirements
Zephyr SGB Global
1. Client Onboarding
To be captured at the time of lead generation:
• PAN
• Address
• Email ID
• Contact Number
2. Supplier Onboarding
For onboarding a new supplier, the following details are required:
• Supplier PAN
• GST (if applicable)
• Address
• Invoice details for payment processing
• Supplier Contact Details:
o Email ID
o Contact Number
3. Cost Break-up Details
The following cost components must be captured:
• Supplier cost (with tax break-up)
• Our Markup
• Our Service Fee
• GST
• TCS (if applicable)
• Total sale value for the client
4. Mode of Payment
Capture the payment mode used by the client:
• Cash
• Bank Transfer
• Payment Gateway
5. Currency
• Currency in which the client is registered
• Currency in which the supplier is registered

---
PRODUCT REQUIREMENT DOCUMENT (PRD)
CRM System – Travel Agency (Holidays & Visa Services)

PROJECT OVERVIEW
1. Project Name - Travel Agency CRM – Holidays & Visa Management System

2. Objective
To develop a centralized CRM system to manage:
•	Holiday Package Sales (B2C & B2B)
•	Worldwide Visa Services
•	Lead Management
•	Quotation & Booking Workflow
•	Payment Tracking
•	Supplier Coordination
•	Reporting & KPI Monitoring

The CRM should improve:
•	Lead conversion ratio
•	Response time
•	Revenue tracking
•	Team accountability
•	Operational efficiency

USER ROLES & ACCESS LEVELS
1. Admin
•	Full system access
•	Add/edit/delete users
•	Access to reports & revenue dashboard
•	Modify margins & pricing settings



2. Holiday Consultant
•	Access to assigned leads
•	Create quotations
•	Update lead status
•	Upload documents
•	Convert to booking

3. Visa Consultant
•	Manage visa leads
•	Upload visa documents
•	Track application stages
•	Update status

4. Accounts Team
•	Update payment status
•	Generate invoices
•	Refund processing
•	View revenue reports

5. Management
•	Dashboard view only
•	KPI monitoring
•	Conversion reports
•	Revenue tracking






CORE MODULES REQUIRED
MODULE 1: LEAD MANAGEMENT
Features Required:
1. Manual lead entry
2. Auto lead capture from:
•	Website forms
•	Meta Ads
•	WhatsApp integration
•	Google Ads
3. Lead source tracking
(Facebook / Instagram / Google Ad / Website / Walk-in / Referral / B2B)

Lead Fields:
•	Unique Lead ID
•	Client Name
•	Nationality
•	Contact Number
•	Email
•	Destination
•	Travel Dates
•	No. of Adults / Children
•	Budget Range (Optional)
•	Visa Required (Yes/No)
•	Lead Type (Holiday / Visa / Both)
•	Lead Source

Lead Status Stages:
•	New
•	Contacted
•	Follow-up 1
•	Follow-up 2
•	Follow-up 3
•	Final Reminder
•	Quoted
•	Negotiation
•	Hot
•	Warm
•	Cold
•	Converted
•	Lost (Mandate note required to specify reason)
•	Non-Responsive

Automation Required:
•	Auto-reminder for follow-ups
•	Lead response time tracking (15 min SLA)
•	Escalation alert if not contacted within 15 minutes

MODULE 2: QUOTATION MANAGEMENT
Features:
•	Ready Package template system
•	Custom package builder
•	Auto markup calculation
•	PDF quotation generator (branded format)
•	Price validity field
•	Inclusion / Exclusion fields
•	Cancellation policy field
•	Important Notes field

Response Time Tracking:
•	Ready package – 0 - 30 minutes
•	Customized package – within 2 hours
•	Complex itinerary – within 6 working hours
Note - System should log time between: Lead creation → Quote sent



MODULE 3: BOOKING MANAGEMENT
When lead is converted:
Required Fields:
•	Booking reference number (auto generated)
•	Supplier name
•	DMC details
•	Hotel details
•	Flight details
•	Visa requirement
•	Insurance add-on
•	Other Services
Payment Rules:
•	Minimum 50% advance
•	100% for non-refundable bookings
•	Balance before D-2
•	No service confirmation without payment proof

System should:
•	Block services for allowed number of time period (configurable)
•	Alert if supplier deadline approaching
•	Track cancellation deadlines

MODULE 4: VISA MANAGEMENT (Separate visa workflow required)
Visa Stages:
•	Document Collection
•	Application Submitted
•	Biometrics Scheduled
•	Under Process
•	Approved
•	Rejected
•	Delivered


Required Features:
•	Visa checklist per country
•	Document upload (passport, Emirates ID, bank statement, etc)
•	Appointment date tracking
•	Expiry reminder
•	Visa fees tracking
•	SLA monitoring

MODULE 5: DOCUMENT MANAGEMENT
•	Upload passport copies
•	Upload visa copies
•	Upload tickets
•	Upload hotel vouchers
•	Generate final itinerary PDF
•	Secure storage (role-based access)

MODULE 6: PAYMENT & ACCOUNTS
Features:
•	Invoice generation
•	Payment status:
1)	Pending
2)	Partial
3)	Paid
•	Supplier payment tracking
•	Profit calculation
•	Refund management
•	Service charge tracking

MODULE 7: DASHBOARD & KPI REPORTS
Management dashboard must show:
•	Total Leads (Daily / Weekly / Monthly)
•	Conversion Rate %
•	Revenue Generated
•	Profit Generated
•	Consultant-wise performance
•	Destination-wise revenue
•	Visa vs Holiday revenue split
•	Lead source performance
•	Response time average

MODULE 8: FOLLOW-UP SYSTEM
Minimum:
•	4 follow-ups mandatory
•	1 final reminder mandatory
•	Auto-scheduled reminders
•	Auto-mark as “Non-Responsive” after Day 4

MODULE 9: SUPPLIER MANAGEMENT
•	Supplier database
•	Country-wise supplier tagging
•	Contract upload
•	Rate validity tracking
•	Production commitment tracking
•	Payment deadline alerts

MODULE 10: MARKETING INTEGRATION
•	Lead source analytics
•	Campaign performance tracking
•	Cost per lead
•	ROI reporting
•	WhatsApp integration
•	Email integration

MODULE 11: WEBSITE INTEGRATION – PACKAGE PUBLISHING
1. Objective: To allow holiday packages created in CRM to be directly published and synchronized with the company website.
2. Core Requirements
•	Package Name
•	Destination
•	Duration (e.g., 3N/4D)
•	Starting Price
•	Inclusions
•	Exclusions
•	Itinerary (Day-wise)
•	Hotel Details
•	Validity Period
•	Cancellation Policy
•	Package Category:
1)	Budget
2)	Premium
3)	Luxury
4)	Honeymoon
5)	Family
•	Banner Image Upload
•	Gallery Images Upload
•	SEO Fields:
1)	Meta Title
2)	Meta Description
3)	Keywords
•	Package Status:
1)	Draft
2)	Active
3)	Expired
4)	Sold Out
Publish to Website Feature
CRM must have:
•	“Publish to Website” toggle button
•	Auto-sync functionality
•	Edit & auto-update website content
•	Remove/unpublish option
When:
•	Price is changed in CRM → Website auto updates
•	Validity expires → Package auto hides
•	Marked as Sold Out → Display “Sold Out” on website
Website Display Requirements
•	Website should display:
•	Package listing page (grid view)
•	Destination filter
•	Price filter
•	Duration filter
•	“Enquire Now” button
•	“Book Now” button (future payment integration)
•	WhatsApp click-to-chat integration
Lead Capture Flow
When customer clicks Enquire Now → Lead must automatically enter CRM with:
•	Package Name
•	Travel Dates (if selected)
•	No. of Travelers
•	Contact Details
•	Source: Website – Package Page

FUTURE PHASE (OPTIONAL)
•	Hotel API integration
•	Flight API integration
•	Online payment gateway
•	Client login portal
•	Automated WhatsApp reminders
•	Supplier portal access

SUCCESS METRICS
CRM should help achieve:
•	15-minute lead response compliance
•	20–30% conversion ratio
•	Real-time revenue visibility
•	Reduced manual follow-up errors
•	Automated reporting



---
Below is the Frontend Page Feature List (UI Screens) for your Travel Agency CRM.
This is how a real SaaS CRM frontend is structured. Each page represents a route/screen in your React app.
I grouped them by modules so it is easy for you to design and develop.
________________________________________
1. Authentication Module
1. Login Page
Features
•	Email login
•	Password login
•	Forgot password
•	Account lock message
•	Remember me
•	Login audit trigger
2. Forgot Password Page
Features
•	Enter email
•	OTP / reset link verification
•	Password reset form
3. Reset Password Page
Features
•	Enter new password
•	Confirm password
________________________________________
2. Dashboard Module
4. Main Dashboard
Features
•	Total leads
•	Today's leads
•	Monthly revenue
•	Conversion rate
•	Pending follow-ups
•	Pending payments
•	Visa cases in progress
Charts
•	Lead source chart
•	Destination revenue chart
•	Monthly sales graph
Widgets
•	SLA compliance
•	Consultant ranking
•	Revenue split (Visa vs Holidays)
________________________________________
3. Lead Management Module
5. Lead List Page
Features
•	Lead table
•	Search bar
•	Filters:
o	Source
o	Destination
o	Status
o	Consultant
o	Date
•	SLA timer indicator
•	Lead priority colors
•	Quick actions
o	View
o	Assign
o	Quote
o	Mark lost
________________________________________
6. Create Lead Page
Features
•	Manual lead entry
•	Fields
o	Name
o	Phone
o	Email
o	Destination
o	Travel date
o	Pax
o	Budget
o	Visa required
o	Source
Buttons
•	Save lead
•	Save and assign
________________________________________
7. Lead Detail Page
Features
Sections
•	Lead information
•	Lead timeline
•	Activity log
•	Follow-ups
•	Notes
Actions
•	Update status
•	Schedule follow-up
•	Create quotation
•	Convert to booking
•	Mark lost
________________________________________
8. Lead Assignment Page
Features
•	Assign consultant
•	Change consultant
•	View consultant workload
•	Auto assign option
________________________________________
4. Follow-Up Management
9. Follow-Up Dashboard
Features
•	Today's follow-ups
•	Missed follow-ups
•	Upcoming follow-ups
•	Follow-up calendar view
Actions
•	Mark completed
•	Add notes
•	Schedule next follow-up
________________________________________
5. Quotation Module
10. Quotation List Page
Features
•	Quotation table
•	Status filter
o	Draft
o	Sent
o	Approved
o	Rejected
•	Search by customer
•	Quote analytics
________________________________________
11. Create Quotation Page
Features
Sections
Customer info auto-fill
Package builder
•	Select package type
•	Add services
•	Hotel
•	Flights
•	Tours
•	Visa
•	Insurance
Cost calculation
•	Supplier cost
•	Markup
•	Service fee
•	Tax
•	Discount
System auto calculates
•	Total price
•	Profit
•	Margin %
________________________________________
12. Quotation Preview Page
Features
•	Quotation preview
•	PDF view
•	Send via
o	Email
o	WhatsApp
•	Edit quotation
________________________________________
6. Booking Management Module
13. Booking List Page
Features
•	Booking table
•	Filter by
o	Destination
o	Status
o	Consultant
o	Date
Columns
•	Booking ID
•	Customer
•	Travel date
•	Amount
•	Payment status
________________________________________
14. Booking Detail Page
Features
Sections
•	Customer details
•	Package details
•	Supplier details
•	Payment status
•	Documents
Actions
•	Confirm booking
•	Cancel booking
•	Add services
________________________________________
7. Payment & Accounts Module
15. Payment Dashboard
Features
•	Pending payments
•	Partial payments
•	Paid bookings
•	Refund requests
________________________________________
16. Add Payment Page
Features
•	Enter payment
•	Mode
o	Cash
o	Bank
o	Gateway
•	Upload payment proof
•	Verify payment
________________________________________
17. Invoice Page
Features
•	Generate invoice
•	Invoice preview
•	Download PDF
•	Send to customer
________________________________________
18. Refund Management Page
Features
•	Refund request list
•	Refund approval
•	Refund processing
•	Supplier penalty calculation
________________________________________
8. Visa Management Module
19. Visa Cases List Page
Features
•	Visa case table
•	Filter by
o	Country
o	Status
o	Consultant
________________________________________
20. Visa Case Detail Page
Features
•	Visa status pipeline
•	Appointment date
•	Visa fees
•	Supplier details
________________________________________
21. Visa Document Upload Page
Features
Upload documents
•	Passport
•	Bank statement
•	Visa form
•	Photos
Document verification toggle
________________________________________
9. Document Management Module
22. Document Center
Features
Upload and manage
•	Passport copies
•	Visa copies
•	Tickets
•	Hotel vouchers
•	Insurance
Preview documents
________________________________________
23. Travel Checklist Page
Features
Checklist
•	Passport verified
•	Visa verified
•	Hotel confirmed
•	Insurance confirmed
•	Tickets issued
Travel ready indicator
________________________________________
10. Customer Management Module
24. Customer List Page
Features
•	Customer table
•	Search
•	Filters
•	Customer segment
________________________________________
25. Customer Profile Page
Features
Sections
•	Personal details
•	Travel history
•	Visa history
•	Booking history
Actions
•	Send offer
•	Add note
________________________________________
11. Supplier Management Module
26. Supplier List Page
Features
•	Supplier directory
•	Country filter
•	Services filter
________________________________________
27. Supplier Detail Page
Features
•	Contact info
•	Contracts
•	Payment terms
•	Supplier performance
________________________________________
12. Package Management (Website CMS)
28. Package List Page
Features
•	Package grid
•	Filter
•	Category
•	Destination
________________________________________
29. Create Package Page
Features
Fields
•	Package name
•	Destination
•	Duration
•	Starting price
•	Itinerary
•	Inclusions
•	Exclusions
•	Images
•	SEO fields
________________________________________
30. Package Publish Page
Features
•	Publish to website toggle
•	Auto sync
•	Mark sold out
•	Set expiry
________________________________________
13. Marketing Module
31. Campaign Dashboard
Features
•	Campaign list
•	Leads generated
•	Revenue
•	Cost per lead
•	ROI
________________________________________
32. WhatsApp Campaign Page
Features
•	Send bulk messages
•	Template messages
•	Customer segmentation
________________________________________
14. Reports & Analytics Module
33. Reports Dashboard
Features
Quick reports
•	Lead reports
•	Revenue reports
•	Visa reports
•	Marketing reports
________________________________________
34. Conversion Funnel Report Page
Features
Pipeline
Total Leads
Qualified
Quoted
Approved
Converted
Cancelled
Visualization
•	Funnel chart
________________________________________
35. Consultant Performance Page
Features
•	Leads handled
•	Conversions
•	Revenue
•	Ranking
________________________________________
15. Employee Management Module
36. Employee List Page
Features
•	Employee directory
•	Role filter
•	Status
________________________________________
37. Employee Profile Page
Features
•	Targets
•	Attendance
•	Leave history
•	Performance
________________________________________
16. System Settings
38. User Management Page
Features
•	Add user
•	Assign role
•	Disable account
________________________________________
39. Role & Permission Page
Features
•	Create role
•	Assign permissions
________________________________________
40. System Settings Page
Features
•	SLA settings
•	Margin rules
•	Follow-up rules
•	Payment rules
________________________________________
Total Frontend Pages
Your CRM has approximately
40 frontend pages
Grouped into
1.	Authentication
2.	Dashboard
3.	Lead Management
4.	Quotation
5.	Booking
6.	Payments
7.	Visa
8.	Documents
9.	Customers
10.	Suppliers
11.	Packages (Website CMS)
12.	Marketing
13.	Reports
14.	Employee Management
15.	Settings
________________________________________

---

