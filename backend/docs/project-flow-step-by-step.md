# Getfares CRM - Complete Project Flow (Step-by-Step)

1. User opens the CRM and lands on the login screen.
2. User enters email and password and submits the login form.
3. Backend verifies credentials, role, and account lock status.
4. JWT token is issued and stored on the client.
5. User is redirected to the role-based dashboard.
6. Dashboard loads business KPIs (leads, conversion, revenue, profit).
7. Notifications center loads unread alerts and SLA warnings.
8. Integration services push new leads from Meta, website, and WhatsApp.
9. Each incoming lead is validated, normalized, and stored.
10. Anti-duplication runs based on email and phone.
11. If duplicate found, lead is linked to existing customer.
12. If new, a customer master profile is created.
13. Lead temperature (Hot/Warm/Cold) is calculated.
14. Lead SLA deadline (15 minutes) is assigned.
15. Lead is auto-assigned using round robin and expertise.
16. Assigned consultant receives a real-time notification.
17. Lead appears in the Leads Board and Lead List.
18. Consultant opens Lead Detail page.
19. Lead profile shows customer identity and travel requirements.
20. Consultant updates lead status to CONTACTED after first reachout.
21. System logs first response time and SLA compliance.
22. Consultant adds lead notes and qualification details.
23. Consultant schedules Follow-up 1 with date/time.
24. Follow-up entries are logged and show on follow-up board.
25. System enforces minimum 4 follow-ups + final reminder.
26. If no response, lead auto-marks as NON_RESPONSIVE.
27. Escalation event is emitted to manager.
28. Consultant creates a quotation from the lead.
29. Consultant selects a quotation template.
30. Consultant adds quotation components (hotel, flight, etc).
31. Pricing engine calculates total cost and margin.
32. System enforces minimum margin rule.
33. If margin below threshold, manager approval is required.
34. Quotation is saved as DRAFT with version number.
35. Consultant generates quotation PDF.
36. PDF is stored and linked to the quotation record.
37. Consultant sends quotation via WhatsApp or Email.
38. System logs send event and recipient details.
39. Customer opens quote; view is tracked with timestamp and IP.
40. Quote status updates to VIEWED automatically.
41. Reminder automation triggers if no view within 24 hours.
42. Reminder automation triggers if viewed but no action in 48 hours.
43. Customer approves quotation.
44. System transitions quote to APPROVED state.
45. Approved quote converts into a Booking automatically.
46. Booking number is generated and assigned.
47. Booking captures travel dates, total amount, and cost amount.
48. Profit is auto-calculated from total and cost.
49. Advance payment rule is enforced (50% or 100%).
50. Accounts team records customer payment.
51. Payment mode is captured (Cash/Bank/Gateway).
52. Payment proof is uploaded and verified.
53. Booking payment status recalculates (Pending/Partial/Full).
54. If payment rule satisfied, booking becomes CONFIRMED.
55. Invoice is generated with invoice number and PDF.
56. Invoice is stored and visible in booking detail.
57. Visa case is created if visa is required.
58. Visa executive uploads passport and documents.
59. Document verification flags are updated.
60. Visa appointment and submission dates are tracked.
61. Visa status moves through the defined stages.
62. Documentation checklist is completed before travel.
63. Supplier onboarding captures PAN, GST, bank, and contract info.
64. Supplier payables are created for each booking.
65. Payables track due date and payment status.
66. Refund is initiated if booking is cancelled or visa rejected.
67. Refund amount, penalties, and service charges are recorded.
68. Manager approval is required for high-value refunds.
69. Refund is processed and logged.
70. Complaints module logs customer service issues.
71. Complaint workflow tracks resolution steps and status.
72. Campaign module tracks lead source performance.
73. Reports module aggregates lead, revenue, payment, and visa metrics.
74. Manager dashboards show team conversion and SLA compliance.
75. Admin dashboards show company-wide KPIs and profit trends.
76. Monthly summary is generated for management review.
77. Package publishing module manages website packages.
78. Package published to website updates automatically when edited.
79. Website enquiries create leads with package context.
80. Integration settings manage Meta/WhatsApp/Email credentials.
81. Notifications are pushed for new leads, SLA breaches, and follow-ups.
82. Audit logs capture critical changes for compliance.
83. System ensures role-based access across all pages.
84. Soft-delete flags prevent accidental data loss.
85. APIs remain modular and reusable for microservice extraction.
86. System remains ready for future API integrations.
