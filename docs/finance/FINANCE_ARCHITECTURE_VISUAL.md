# Finance System Architecture - Visual Guide

## Current System Architecture (BROKEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUOTATION BUILDER UI                         │
│                 (QuotationBuilderPage.tsx)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Basic Info: Title, Destination, Duration                   │
│  ✅ Traveler Info: Adults, Children, Ages                      │
│  ✅ Service Rows: Accommodation, Flights, Tours                │
│  ✅ Itinerary: Day-by-day breakdown                            │
│  ✅ Content: Inclusions, Exclusions, T&C                       │
│                                                                 │
│  ❌ MISSING: Finance Fields (Commented Out!)                   │
│     - Supplier Cost                                             │
│     - Markup %                                                  │
│     - Service Fee                                               │
│     - GST, TCS                                                  │
│     - Total Sale Value                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    API POST /api/quotations
                            ↓
                    Payload Structure:
                    {
                      leadId: "uuid",
                      quotationTitle: "Bali Package",
                      components: [...],
                      ❌ supplierCost: MISSING
                      ❌ markupAmount: MISSING
                      ❌ gstAmount: MISSING
                      ❌ tcsAmount: MISSING
                    }
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE                              │
│              (quotations.service.js)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  function calculateFinanceBreakdown(payload, pricing) {        │
│    const supplierCost = payload.supplierCost ?? pricing.totalCost; │
│    const markupAmount = payload.markupAmount ?? pricing.marginAmount; │
│    const gstAmount = payload.gstAmount ?? pricing.taxAmount;   │
│    const tcsAmount = payload.tcsAmount ?? 0; ← DEFAULTS TO 0! │
│    ...                                                          │
│  }                                                              │
│                                                                 │
│  ⚠️ Since payload doesn't have finance fields,                 │
│     everything defaults to 0 or basic totalCost                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Database INSERT
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
│                    quotations table                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  id: uuid                                                       │
│  quote_number: "QT-20240101-123456"                            │
│  total_cost: 10000                                              │
│  final_price: 12000                                             │
│                                                                 │
│  ❌ supplier_cost: 0                                            │
│  ❌ supplier_tax_amount: 0                                      │
│  ❌ markup_amount: 0                                            │
│  ❌ service_fee_amount: 0                                       │
│  ❌ gst_amount: 0                                               │
│  ❌ tcs_amount: 0                                               │
│  ❌ total_sale_value: 0                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Finance Report Query
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FINANCE SYSTEM UI                            │
│                    Cost Breakup Report                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Summary Cards:                                                 │
│  ❌ Supplier Cost: ₹0                                           │
│  ❌ Markup: ₹0                                                  │
│  ❌ GST: ₹0                                                     │
│  ❌ TCS: ₹0                                                     │
│  ❌ Total Sale Value: ₹0                                        │
│                                                                 │
│  ⚠️ Finance team sees all zeros - UNUSABLE!                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Target System Architecture (FIXED)

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUOTATION BUILDER UI                         │
│                 (QuotationBuilderPage.tsx)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Basic Info: Title, Destination, Duration                   │
│  ✅ Traveler Info: Adults, Children, Ages                      │
│  ✅ Service Rows: Accommodation, Flights, Tours                │
│  ✅ Itinerary: Day-by-day breakdown                            │
│  ✅ Content: Inclusions, Exclusions, T&C                       │
│                                                                 │
│  ✅ NEW: Finance & Profit Section                              │
│     ┌───────────────────────────────────────────────┐          │
│     │ Currency Selection:                           │          │
│     │ [Client: INR ▼] [Cost: INR ▼] [Supplier: INR ▼] │       │
│     │                                               │          │
│     │ Supplier Cost: ₹10,000 (auto-calculated)     │          │
│     │ Supplier Tax %: [5%] → ₹500                  │          │
│     │ Markup % (Profit): [20%] → ₹2,000            │          │
│     │ Service Fee: [₹500]                          │          │
│     │                                               │          │
│     │ GST %: [18%] → ₹2,340                        │          │
│     │ TCS %: [5%] → ₹650                           │          │
│     │ Discount: [₹0]                               │          │
│     │                                               │          │
│     │ Total Sale Value: ₹15,990                    │          │
│     │                                               │          │
│     │ Summary:                                      │          │
│     │ 💰 Supplier Cost: ₹10,000                    │          │
│     │ 💚 Profit: ₹2,000 (20% margin)               │          │
│     │ 📊 Total Tax: ₹3,490                         │          │
│     │ 🎯 Final Price: ₹15,990                      │          │
│     └───────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    API POST /api/quotations
                            ↓
                    Payload Structure:
                    {
                      leadId: "uuid",
                      quotationTitle: "Bali Package",
                      components: [...],
                      ✅ supplierCost: 10000,
                      ✅ supplierTaxAmount: 500,
                      ✅ markupAmount: 2000,
                      ✅ marginPercent: 20,
                      ✅ serviceFeeAmount: 500,
                      ✅ gstAmount: 2340,
                      ✅ tcsAmount: 650,
                      ✅ totalSaleValue: 15990,
                      ✅ costCurrency: "INR",
                      ✅ clientCurrency: "INR",
                      ✅ supplierCurrency: "INR"
                    }
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICE                              │
│              (quotations.service.js)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  function calculateFinanceBreakdown(payload, pricing) {        │
│    const supplierCost = payload.supplierCost ?? pricing.totalCost; │
│    const markupAmount = payload.markupAmount ?? pricing.marginAmount; │
│    const gstAmount = payload.gstAmount ?? pricing.taxAmount;   │
│    const tcsAmount = payload.tcsAmount ?? 0;                   │
│    ...                                                          │
│  }                                                              │
│                                                                 │
│  ✅ Payload has all finance fields, uses provided values!      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Database INSERT
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                        │
│                    quotations table                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  id: uuid                                                       │
│  quote_number: "QT-20240101-123456"                            │
│  total_cost: 10000                                              │
│  final_price: 15990                                             │
│                                                                 │
│  ✅ supplier_cost: 10000                                        │
│  ✅ supplier_tax_amount: 500                                    │
│  ✅ markup_amount: 2000                                         │
│  ✅ service_fee_amount: 500                                     │
│  ✅ gst_amount: 2340                                            │
│  ✅ tcs_amount: 650                                             │
│  ✅ total_sale_value: 15990                                     │
│  ✅ cost_currency: INR                                          │
│  ✅ client_currency: INR                                        │
│  ✅ supplier_currency: INR                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Finance Report Query
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FINANCE SYSTEM UI                            │
│                    Cost Breakup Report                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Summary Cards:                                                 │
│  ✅ Supplier Cost: ₹10,000                                      │
│  ✅ Markup: ₹2,000                                              │
│  ✅ GST: ₹2,340                                                 │
│  ✅ TCS: ₹650                                                   │
│  ✅ Total Sale Value: ₹15,990                                   │
│                                                                 │
│  Currency Breakdown:                                            │
│  ┌─────────────────────────────────────────────┐               │
│  │ INR: 25 quotes, ₹3,99,750 total            │               │
│  │ USD: 10 quotes, $45,000 total               │               │
│  │ EUR: 5 quotes, €20,000 total                │               │
│  └─────────────────────────────────────────────┘               │
│                                                                 │
│  ✅ Finance team has full visibility!                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Comparison

### BEFORE (Broken)
```
User Input → Service Rows → Components → Backend Defaults → Database Zeros → Report Empty
```

### AFTER (Fixed)
```
User Input → Finance Fields → Complete Payload → Backend Calculates → Database Populated → Report Accurate
```

---

## Component Hierarchy

```
QuotationBuilderPage
├── Basic Information Section
│   ├── Quotation Title
│   ├── Destination
│   └── Duration (Nights/Days)
│
├── Traveler Information Section
│   ├── Adults Count
│   ├── Children Count
│   └── Child Ages
│
├── Service Rows Section
│   ├── Accommodation Row
│   ├── Flights Row
│   ├── Tours & Activities Row
│   └── Insurance Row
│
├── ✅ NEW: Finance & Profit Section
│   ├── Currency Selection
│   │   ├── Client Currency
│   │   ├── Cost Currency
│   │   └── Supplier Currency
│   │
│   ├── Cost Inputs
│   │   ├── Supplier Cost (auto-calculated)
│   │   ├── Supplier Tax %
│   │   ├── Markup % (Profit)
│   │   └── Service Fee
│   │
│   ├── Tax Inputs
│   │   ├── GST %
│   │   ├── TCS %
│   │   └── Discount
│   │
│   └── Summary Cards
│       ├── Supplier Cost Card
│       ├── Profit Card
│       ├── Total Tax Card
│       └── Final Price Card
│
├── Itinerary Section
│   └── Day-by-day items
│
└── Content Section
    ├── Inclusions
    ├── Exclusions
    ├── Hotel Details
    ├── Visa Details
    ├── Payment Terms
    └── Cancellation Policy
```

---

## State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React State                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  const [form, setForm] = useState({                        │
│    quotationTitle: '',                                      │
│    destination: '',                                         │
│    nights: 0,                                               │
│    durationDays: 0,                                         │
│    adults: 1,                                               │
│    children: 0,                                             │
│    ...                                                      │
│  });                                                        │
│                                                             │
│  const [serviceRows, setServiceRows] = useState([...]);    │
│                                                             │
│  ✅ NEW: const [finance, setFinance] = useState({          │
│    supplierCost: 0,                                         │
│    supplierTaxPercent: 5,                                   │
│    supplierTaxAmount: 0,                                    │
│    markupPercent: 20,                                       │
│    markupAmount: 0,                                         │
│    serviceFeeAmount: 0,                                     │
│    gstPercent: 18,                                          │
│    gstAmount: 0,                                            │
│    tcsPercent: 5,                                           │
│    tcsAmount: 0,                                            │
│    discount: 0,                                             │
│    totalSaleValue: 0                                        │
│  });                                                        │
│                                                             │
│  ✅ NEW: const [currencies, setCurrencies] = useState({    │
│    clientCurrency: 'INR',                                   │
│    costCurrency: 'INR',                                     │
│    supplierCurrency: 'INR'                                  │
│  });                                                        │
│                                                             │
│  const [itineraryItems, setItineraryItems] = useState([...]); │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    useEffect Hook
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Auto-Calculation Logic                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  useEffect(() => {                                          │
│    // 1. Calculate supplier cost from service rows         │
│    const totalSupplierCost = serviceRows.reduce(           │
│      (sum, row) => sum + (row.baseCost || 0), 0            │
│    );                                                       │
│                                                             │
│    // 2. Calculate taxes and fees                          │
│    const supplierTaxAmount =                                │
│      (totalSupplierCost * finance.supplierTaxPercent) / 100; │
│    const markupAmount =                                     │
│      (totalSupplierCost * finance.markupPercent) / 100;    │
│    const subtotal = totalSupplierCost +                    │
│      supplierTaxAmount + markupAmount +                    │
│      finance.serviceFeeAmount;                             │
│    const gstAmount = (subtotal * finance.gstPercent) / 100; │
│    const tcsAmount = (subtotal * finance.tcsPercent) / 100; │
│                                                             │
│    // 3. Calculate final total                             │
│    const totalSaleValue = subtotal + gstAmount +           │
│      tcsAmount - finance.discount;                         │
│                                                             │
│    // 4. Update state                                      │
│    setFinance(prev => ({                                   │
│      ...prev,                                              │
│      supplierCost: totalSupplierCost,                      │
│      supplierTaxAmount,                                    │
│      markupAmount,                                         │
│      gstAmount,                                            │
│      tcsAmount,                                            │
│      totalSaleValue                                        │
│    }));                                                    │
│  }, [serviceRows, finance.supplierTaxPercent, ...]);      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    User Clicks Save
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Payload Builder                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  const payload = {                                          │
│    // Basic fields                                          │
│    leadId: leadId,                                          │
│    quotationTitle: form.quotationTitle,                    │
│    destination: form.destination,                          │
│    ...                                                      │
│                                                             │
│    // ✅ NEW: Finance fields                               │
│    supplierCost: finance.supplierCost,                     │
│    supplierTaxAmount: finance.supplierTaxAmount,           │
│    markupAmount: finance.markupAmount,                     │
│    marginPercent: finance.markupPercent,                   │
│    serviceFeeAmount: finance.serviceFeeAmount,             │
│    gstAmount: finance.gstAmount,                           │
│    tcsAmount: finance.tcsAmount,                           │
│    totalSaleValue: finance.totalSaleValue,                 │
│    discount: finance.discount,                             │
│                                                             │
│    // ✅ NEW: Currency fields                              │
│    costCurrency: currencies.costCurrency,                  │
│    clientCurrency: currencies.clientCurrency,              │
│    supplierCurrency: currencies.supplierCurrency,          │
│                                                             │
│    // Other fields                                          │
│    components: serviceRows.map(...),                       │
│    builderSnapshot: {...}                                  │
│  };                                                         │
│                                                             │
│  await api.post('/api/quotations', payload);               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema (Existing - Already Ready!)

```sql
CREATE TABLE quotations (
    id UUID PRIMARY KEY,
    quote_number VARCHAR(50),
    lead_id UUID REFERENCES leads(id),
    
    -- Basic fields
    quotation_title VARCHAR(200),
    trip_destination VARCHAR(200),
    duration_nights INT,
    duration_days INT,
    
    -- ✅ Finance fields (ALREADY EXIST!)
    supplier_cost NUMERIC(12,2) DEFAULT 0,
    supplier_tax_amount NUMERIC(12,2) DEFAULT 0,
    markup_amount NUMERIC(12,2) DEFAULT 0,
    service_fee_amount NUMERIC(12,2) DEFAULT 0,
    gst_amount NUMERIC(12,2) DEFAULT 0,
    tcs_amount NUMERIC(12,2) DEFAULT 0,
    total_sale_value NUMERIC(12,2) DEFAULT 0,
    
    -- ✅ Currency fields (ALREADY EXIST!)
    cost_currency VARCHAR(10) DEFAULT 'INR',
    client_currency VARCHAR(10) DEFAULT 'INR',
    supplier_currency VARCHAR(10) DEFAULT 'INR',
    
    -- Legacy fields (still used)
    total_cost NUMERIC(12,2),
    margin_percent NUMERIC(5,2),
    margin_amount NUMERIC(12,2),
    discount NUMERIC(12,2),
    tax NUMERIC(12,2),
    final_price NUMERIC(12,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Contract (Existing - Already Ready!)

### POST /api/quotations

**Request Body:**
```json
{
  "leadId": "uuid",
  "quotationTitle": "Bali 5N/6D Package",
  "destination": "Bali, Indonesia",
  "durationNights": 5,
  "durationDays": 6,
  
  "supplierCost": 10000,
  "supplierTaxAmount": 500,
  "markupAmount": 2000,
  "marginPercent": 20,
  "serviceFeeAmount": 500,
  "gstAmount": 2340,
  "tcsAmount": 650,
  "totalSaleValue": 15990,
  "discount": 0,
  
  "costCurrency": "INR",
  "clientCurrency": "INR",
  "supplierCurrency": "INR",
  
  "components": [
    {
      "itemType": "ACCOMMODATION",
      "description": "5-star hotel",
      "cost": 5000
    },
    {
      "itemType": "FLIGHT",
      "description": "Round trip flights",
      "cost": 3000
    }
  ]
}
```

**Response:**
```json
{
  "id": "uuid",
  "quoteNumber": "QT-20240101-123456",
  "supplierCost": 10000,
  "markupAmount": 2000,
  "gstAmount": 2340,
  "tcsAmount": 650,
  "totalSaleValue": 15990,
  "status": "DRAFT",
  "createdAt": "2024-01-01T10:00:00Z"
}
```

---

## Testing Flow

```
1. Open Quotation Builder
   ↓
2. Fill Basic Info
   ↓
3. Add Service Rows
   ├── Accommodation: ₹5,000
   ├── Flights: ₹3,000
   └── Tours: ₹2,000
   ↓
4. ✅ Finance Section Auto-Calculates
   ├── Supplier Cost: ₹10,000 (auto)
   ├── Supplier Tax (5%): ₹500
   ├── Markup (20%): ₹2,000
   ├── Service Fee: ₹500
   ├── Subtotal: ₹13,000
   ├── GST (18%): ₹2,340
   ├── TCS (5%): ₹650
   └── Total: ₹15,990
   ↓
5. Click Save
   ↓
6. API Call with Finance Data
   ↓
7. Backend Saves to Database
   ↓
8. Verify in Finance Report
   ├── Open Finance System
   ├── Go to Cost Breakup tab
   └── ✅ See quotation with accurate values
```

---

## Success Metrics Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│              Finance System Health Dashboard                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Quotations with Finance Data:                             │
│  ████████████████████████████████████████ 100% (250/250)   │
│                                                             │
│  Average Profit Margin:                                     │
│  ████████████████████ 22.5%                                 │
│                                                             │
│  Total Revenue Tracked:                                     │
│  ₹45,67,890                                                 │
│                                                             │
│  Total Profit:                                              │
│  ₹10,27,650 (22.5% margin)                                  │
│                                                             │
│  Tax Collected (GST):                                       │
│  ₹8,22,220                                                  │
│                                                             │
│  Tax Collected (TCS):                                       │
│  ₹2,28,395                                                  │
│                                                             │
│  Currency Breakdown:                                        │
│  ├── INR: 180 quotes (₹32,45,000)                          │
│  ├── USD: 50 quotes ($150,000)                             │
│  └── EUR: 20 quotes (€45,000)                              │
│                                                             │
│  ✅ System Status: OPERATIONAL                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**This visual guide shows exactly what's broken and how to fix it.**

**The solution is simple: Add the missing UI fields that connect to the already-working backend.**
