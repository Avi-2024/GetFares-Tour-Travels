# Finance Fields - Visual Location Guide

## 📍 Where to Find Finance Fields

The finance fields are integrated into the **existing right sidebar** in the Quotation Builder.

```
┌─────────────────────────────────────────────────────────────────┐
│                    QUOTATION BUILDER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐  ┌──────────────────────────┐    │
│  │                         │  │                          │    │
│  │   LEFT COLUMN           │  │   RIGHT SIDEBAR          │    │
│  │   (Main Content)        │  │   (Finance Summary)      │    │
│  │                         │  │                          │    │
│  │  • Customer & Trip      │  │  ┌────────────────────┐  │    │
│  │  • Itinerary Items      │  │  │  Trip Snapshot     │  │    │
│  │  • Pricing Breakdown    │  │  │  - Destination     │  │    │
│  │  • Service Rows         │  │  │  - Travel Date     │  │    │
│  │  • Add-on Services      │  │  │  - Duration        │  │    │
│  │  • Inclusions           │  │  │  - Travellers      │  │    │
│  │  • Exclusions           │  │  └────────────────────┘  │    │
│  │  • Template Content     │  │                          │    │
│  │                         │  │  ┌────────────────────┐  │    │
│  │                         │  │  │ FINANCIAL SUMMARY  │  │    │
│  │                         │  │  │ ← FINANCE FIELDS   │  │    │
│  │                         │  │  │    ARE HERE!       │  │    │
│  │                         │  │  │                    │  │    │
│  │                         │  │  │ Supplier Cost: [  ]│  │    │
│  │                         │  │  │ Service Fee:   [  ]│  │    │
│  │                         │  │  │ Tax %:         [  ]│  │    │
│  │                         │  │  │ Markup %:      [  ]│  │    │
│  │                         │  │  │ Discount:      [  ]│  │    │
│  │                         │  │  │                    │  │    │
│  │                         │  │  │ Profit: ₹2,000    │  │    │
│  │                         │  │  │                    │  │    │
│  │                         │  │  │ Breakdown:         │  │    │
│  │                         │  │  │ - Total Markup     │  │    │
│  │                         │  │  │ - Add-ons          │  │    │
│  │                         │  │  │ - Subtotal         │  │    │
│  │                         │  │  │ - Tax Amount       │  │    │
│  │                         │  │  │                    │  │    │
│  │                         │  │  │ TOTAL SALE VALUE   │  │    │
│  │                         │  │  │    ₹15,990         │  │    │
│  │                         │  │  └────────────────────┘  │    │
│  │                         │  │                          │    │
│  │                         │  │  ┌────────────────────┐  │    │
│  │                         │  │  │ Itinerary Summary  │  │    │
│  │                         │  │  │ - Itinerary Days   │  │    │
│  │                         │  │  │ - Active Services  │  │    │
│  │                         │  │  └────────────────────┘  │    │
│  │                         │  │                          │    │
│  └─────────────────────────┘  └──────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Finance Fields in Detail

### Financial Summary Panel (Right Sidebar)

```
┌──────────────────────────────────────┐
│      FINANCIAL SUMMARY               │
├──────────────────────────────────────┤
│                                      │
│  Supplier Cost        [  10,000.00 ] │ ← Enter base cost
│  Service Fee          [     500.00 ] │ ← Enter service fee
│  Tax %                [       18.0 ] │ ← Tax percentage
│  Markup %             [       20.0 ] │ ← Your profit %
│  Discount             [       0.00 ] │ ← Discount amount
│                                      │
│  Profit (Auto)        ₹2,000.00      │ ← Auto-calculated
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Breakdown:                     │  │
│  │ Total Markup      ₹2,000.00    │  │
│  │ Add-ons           ₹0.00        │  │
│  │ Subtotal          ₹13,000.00   │  │
│  │ Tax Amount        ₹2,340.00    │  │ ← Includes GST, TCS
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   TOTAL SALE VALUE             │  │
│  │      ₹15,990.00                │  │ ← Final customer price
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

## 📊 What Gets Calculated Automatically

```
USER ENTERS:                    AUTO-CALCULATED:
─────────────                   ────────────────

Supplier Cost: ₹10,000    →    Supplier Tax: ₹500 (5%)
Markup %: 20%             →    Markup Amount: ₹2,000
Service Fee: ₹500         →    (Added to subtotal)
                          →    Subtotal: ₹13,000
                          →    GST: ₹2,340 (18%)
                          →    TCS: ₹650 (5%)
Discount: ₹0              →    (Subtracted from total)
                          →    
                          →    TOTAL SALE VALUE: ₹15,990
```

## 🔄 Data Flow

```
1. User opens Quotation Builder
   ↓
2. Fills customer and trip details (left column)
   ↓
3. Looks at right sidebar "Financial Summary"
   ↓
4. Enters Supplier Cost: ₹10,000
   ↓
5. Enters Markup %: 20
   ↓
6. Auto-calculation triggers immediately
   ↓
7. Total Sale Value updates: ₹15,990
   ↓
8. User clicks "Save Quotation"
   ↓
9. All finance fields saved to database
   ↓
10. Available in Finance System reports
```

## 📱 Responsive Behavior

### Desktop View:
- Left column: Main content (wide)
- Right sidebar: Finance summary (fixed width)
- Both visible side-by-side

### Mobile View:
- Stacked vertically
- Finance summary appears after main content
- Full width on mobile

## 🎨 Visual Indicators

### Input Fields:
- White background
- Border on focus
- Right-aligned numbers
- Currency symbol shown

### Auto-Calculated Fields:
- Green background (Profit)
- Blue background (Total Sale Value)
- Read-only
- Bold text

### Breakdown Section:
- Gray background
- Smaller text
- Shows calculation details

## ✅ User Experience

### What Users See:
1. **Clean Interface**: No clutter, finance fields in logical location
2. **Real-time Updates**: Values update as you type
3. **Clear Labels**: Each field clearly labeled
4. **Visual Hierarchy**: Important values (Total Sale Value) stand out
5. **Helpful Hints**: Tooltips and helper text where needed

### What Users Don't See:
- Complex calculations (handled automatically)
- Technical field names (user-friendly labels)
- Backend complexity (seamless integration)

## 🎯 Key Benefits

1. **No Learning Curve**: Uses existing sidebar layout
2. **Intuitive**: Finance fields where users expect them
3. **Efficient**: All inputs in one place
4. **Clear**: Auto-calculated values clearly marked
5. **Professional**: Clean, modern design

---

**Location**: Right Sidebar → Financial Summary Panel

**Access**: Always visible when creating/editing quotations

**Updates**: Real-time as you type

**Saves**: Automatically when you save the quotation
