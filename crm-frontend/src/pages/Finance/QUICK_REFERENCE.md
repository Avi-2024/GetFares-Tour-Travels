# Finance System - Quick Reference Guide

## 🚀 Quick Start

### Access Finance System
```
URL: /finance-system
Permission Required: reports:read
```

---

## 📋 5 Main Tabs

### 1️⃣ Client Onboarding
**Purpose**: Manage client KYC data  
**Key Fields**: PAN, Name, Email, Phone, Address, Currency  
**Actions**: Add, Edit, Delete, Search, Export

### 2️⃣ Supplier Onboarding
**Purpose**: Manage supplier payment details  
**Key Fields**: PAN, GST, Name, Email, Phone, Address, Bank Details, Currency  
**Actions**: Add, Edit, Deactivate, Search, Export

### 3️⃣ Supplier Services ⭐ NEW
**Purpose**: Track supplier-wise service allocation  
**Shows**: Which supplier provides which service (Hotel/Flight/Tour) with cost breakdown  
**Status**: UI Ready, API Pending

### 4️⃣ Cost Break-up
**Purpose**: Financial analysis from quotations  
**Shows**: Supplier Cost, Tax, Markup, Service Fee, GST, TCS, Total Sale Value  
**Features**: Currency breakdown, Date filters, Export

### 5️⃣ Payments
**Purpose**: Record and verify customer payments  
**Modes**: Cash, Bank Transfer, Payment Gateway  
**Actions**: Record, Verify, Search, Export

---

## 🔑 Key Features

### Search
- Real-time search across all fields
- Works on all tabs (except Cost Break-up)

### Filters
- **Cost Break-up**: Date range, Currency, Rows per page
- **Supplier Services**: Supplier, Service Type, Currency, Status

### Export
- CSV export available on all tabs
- Includes all visible data
- Timestamped filenames

### Responsive
- **Mobile**: Card layout + Hamburger menu
- **Desktop**: Full table views
- **Dark Mode**: Fully supported

---

## 📊 Data Sources

| Tab | Data Source | API Endpoint |
|-----|-------------|--------------|
| Clients | Customers table | `/api/customers` |
| Suppliers | Suppliers table | `/api/suppliers` |
| Supplier Services | Quotations + Suppliers | `/api/reports/supplier-service-breakdown` ⏳ |
| Cost Break-up | Quotations (aggregated) | `/api/reports/finance-cost-breakup` |
| Payments | Payments table | `/api/payments` |

---

## 🎯 Common Tasks

### Add New Client
1. Click "Client Onboarding" tab
2. Click "Add Client" button
3. Fill required fields (marked with *)
4. Click "Add Client"

### Add New Supplier
1. Click "Supplier Onboarding" tab
2. Click "Add Supplier" button
3. Fill all fields including invoice details
4. Click "Add Supplier"

### Record Payment
1. Click "Payments" tab
2. Click "Record Payment" button
3. Enter Booking ID (UUID from bookings page)
4. Select payment mode
5. Enter amount, date, and reference
6. Click "Record Payment"

### Verify Payment (Admin Only)
1. Find payment with "pending" status
2. Click "Verify" button
3. Payment status changes to "completed"
4. Booking payment status auto-updates

### View Cost Breakdown
1. Click "Cost Break-up" tab
2. Set filters (optional): Date range, Currency
3. Click "Apply Filters" or "Refresh"
4. Review summary cards and tables
5. Export if needed

### Track Supplier Services (Coming Soon)
1. Click "Supplier Services" tab
2. Filter by supplier or service type
3. Expand supplier row to see details
4. Review base cost, markup, sell value
5. Export for reconciliation

---

## 💰 Financial Formulas

### Cost Break-up Calculation
```
Total Sale Value = Supplier Cost + Supplier Tax + Markup + Service Fee + GST + TCS - Discount
```

### Supplier Service Calculation
```
Final Sell Value = Base Cost + (Base Cost × Markup %)
Markup Amount = Base Cost × Markup %
```

### Payment Status Logic
```
PENDING: No verified payments
PARTIAL: 0 < Paid < Total
FULL: Paid >= Total
REFUNDED: All payments refunded
```

---

## 🔐 Permissions Matrix

| Action | Permission Required |
|--------|-------------------|
| View Clients | `customers:read` |
| Add Client | `customers:create` |
| Edit Client | `customers:update` |
| Delete Client | `customers:delete` |
| View Suppliers | `suppliers:read` |
| Add Supplier | `suppliers:create` |
| Edit Supplier | `suppliers:update` |
| View Payments | `payments:read` |
| Record Payment | `payments:create` |
| Verify Payment | `payments:verify` (Admin) |
| View Cost Break-up | `reports:finance` |
| View Supplier Services | `reports:finance` |

---

## 📱 Mobile Navigation

### Access Tabs on Mobile
1. Click hamburger menu (☰) icon
2. Select desired tab
3. Menu closes automatically

### Mobile-Specific Features
- Card-based data display
- Touch-friendly buttons (44x44px)
- Swipe-friendly tables
- Optimized spacing

---

## 🎨 UI Elements

### Status Badges
- 🟢 **Green**: Active, Completed, Approved
- 🟡 **Yellow**: Pending, Sent
- 🔴 **Red**: Failed, Rejected, Inactive
- ⚪ **Gray**: Draft, Neutral

### Currency Display
- Formatted with currency symbol
- 2 decimal places
- Locale-aware (INR: ₹, USD: $, EUR: €)

### Date/Time Display
- Localized format
- Includes time for payments
- Date only for filters

---

## 🐛 Troubleshooting

### Data Not Loading
- Check internet connection
- Verify user permissions
- Check browser console for errors
- Try refreshing the page

### Export Not Working
- Ensure data is loaded
- Check browser download permissions
- Try different browser

### Search Not Working
- Clear search input and try again
- Check if data is loaded
- Verify search term spelling

### Payment Verification Failed
- Ensure you have `payments:verify` permission
- Check if payment is already verified
- Verify booking exists

---

## 📈 Reports Available

### Cost Break-up Report
- **Summary**: Total quotations, costs, markup, taxes
- **Currency Breakdown**: Grouped by currency
- **Detailed Rows**: Quotation-level breakdown
- **Export**: CSV with all fields

### Supplier Services Report (Coming Soon)
- **Supplier Summary**: Total services, costs, markup per supplier
- **Service Breakdown**: Service-wise costs per supplier
- **Detailed Rows**: Quotation-level service allocation
- **Export**: CSV with supplier and service details

---

## 🔄 Auto-Sync Features

### Payment → Booking Sync
When payment is verified:
1. Payment status → "completed"
2. Booking payment summary recalculated
3. Booking payment status updated (PENDING/PARTIAL/FULL)

### Quotation → Cost Break-up Sync
When quotation is created/updated:
1. Financial fields saved
2. Cost break-up report auto-updates
3. Currency breakdown recalculated

---

## 💡 Pro Tips

### For Finance Team
1. **Use Filters**: Apply date and currency filters for accurate reports
2. **Export Regularly**: Export data for offline analysis
3. **Verify Payments Daily**: Keep payment status up-to-date
4. **Check Multi-Currency**: Apply currency filter when dealing with multiple currencies

### For Admins
1. **Monitor Pending Payments**: Verify payments promptly
2. **Review Cost Breakdown**: Check margin and markup regularly
3. **Track Supplier Services**: Use supplier services tab for reconciliation
4. **Audit Trail**: All actions are logged for compliance

### For Developers
1. **API Integration**: Ensure all endpoints are working
2. **Error Handling**: Check error messages in console
3. **Performance**: Monitor API response times
4. **Data Validation**: Verify data integrity

---

## 📞 Quick Help

### Need Help?
- **User Guide**: See `FINANCE_SYSTEM_DOCUMENTATION.md`
- **Technical Details**: See `IMPLEMENTATION_SUMMARY.md`
- **API Docs**: Check backend API documentation
- **Support**: Contact development team

### Keyboard Shortcuts
- **Tab**: Navigate between fields
- **Enter**: Submit forms
- **Esc**: Close modals
- **Ctrl/Cmd + F**: Browser search (works on tables)

---

## 🎯 Success Metrics

### What to Track
- ✅ Client KYC completion rate
- ✅ Supplier payment details accuracy
- ✅ Payment verification turnaround time
- ✅ Cost breakdown accuracy
- ✅ Supplier service allocation coverage

### Goals
- 100% client KYC data captured
- All suppliers with complete payment details
- Payments verified within 24 hours
- Monthly cost breakdown review
- Supplier service tracking for all quotations

---

## 🔮 Coming Soon

1. **Tax Ledger Automation** - Auto-post GST/TCS entries
2. **TDS Tracking** - Track TDS on supplier payments
3. **Payment Reconciliation** - Match with bank statements
4. **Revenue Recognition** - Track revenue by rules
5. **Financial Approvals** - Workflow for margin exceptions
6. **Advanced Reports** - Profit margin, cash flow, aging

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Quick Reference**: Keep this handy for daily use!
