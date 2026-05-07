# Auto-Currency Selection Feature

## ✅ Feature Implemented

When creating a lead, the **Client Currency** field now **automatically populates** based on the selected **Lead Country**, with the option to manually change it.

---

## 🎯 How It Works

### **Step 1: Select Country**
User selects a country from the "Lead Country" dropdown.

### **Step 2: Auto-Select Currency**
System automatically selects the appropriate currency for that country.

### **Step 3: Manual Override (Optional)**
User can manually change the currency if needed.

---

## 📋 Supported Country-Currency Mappings

### **Asia**
| Country | Currency |
|---------|----------|
| India | INR - Indian Rupee |
| United Arab Emirates | AED - UAE Dirham |
| Saudi Arabia | SAR - Saudi Riyal |
| Qatar | QAR - Qatari Riyal |
| Kuwait | KWD - Kuwaiti Dinar |
| Oman | OMR - Omani Rial |
| Bahrain | BHD - Bahraini Dinar |
| Singapore | SGD - Singapore Dollar |
| Malaysia | MYR - Malaysian Ringgit |
| Thailand | THB - Thai Baht |
| Indonesia | IDR - Indonesian Rupiah |
| Japan | JPY - Japanese Yen |
| China | CNY - Chinese Yuan |
| South Korea | KRW - South Korean Won |
| Hong Kong | HKD - Hong Kong Dollar |
| Philippines | PHP - Philippine Peso |
| Vietnam | VND - Vietnamese Dong |
| Bangladesh | BDT - Bangladeshi Taka |
| Pakistan | PKR - Pakistani Rupee |
| Sri Lanka | LKR - Sri Lankan Rupee |
| Nepal | NPR - Nepalese Rupee |
| Maldives | MVR - Maldivian Rufiyaa |

### **Europe (Euro Zone)**
| Countries | Currency |
|-----------|----------|
| Germany, France, Italy, Spain, Portugal | EUR - Euro |
| Netherlands, Belgium, Austria, Greece | EUR - Euro |
| Ireland, Finland, Luxembourg, Slovenia | EUR - Euro |
| Cyprus, Malta, Slovakia, Estonia | EUR - Euro |
| Latvia, Lithuania, Croatia | EUR - Euro |

### **Europe (Non-Euro)**
| Country | Currency |
|---------|----------|
| United Kingdom | GBP - British Pound |
| Switzerland | CHF - Swiss Franc |
| Sweden | SEK - Swedish Krona |
| Norway | NOK - Norwegian Krone |
| Denmark | DKK - Danish Krone |
| Poland | PLN - Polish Zloty |
| Czech Republic | CZK - Czech Koruna |
| Hungary | HUF - Hungarian Forint |
| Russia | RUB - Russian Ruble |
| Turkey | TRY - Turkish Lira |

### **Americas**
| Country | Currency |
|---------|----------|
| United States | USD - US Dollar |
| Canada | CAD - Canadian Dollar |
| Brazil | BRL - Brazilian Real |
| Mexico | MXN - Mexican Peso |
| Argentina | ARS - Argentine Peso |
| Chile | CLP - Chilean Peso |
| Colombia | COP - Colombian Peso |
| Peru | PEN - Peruvian Sol |

### **Oceania**
| Country | Currency |
|---------|----------|
| Australia | AUD - Australian Dollar |
| New Zealand | NZD - New Zealand Dollar |

### **Africa**
| Country | Currency |
|---------|----------|
| South Africa | ZAR - South African Rand |
| Egypt | EGP - Egyptian Pound |
| Nigeria | NGN - Nigerian Naira |
| Kenya | KES - Kenyan Shilling |
| Mauritius | MUR - Mauritian Rupee |
| Seychelles | SCR - Seychellois Rupee |

### **Middle East**
| Country | Currency |
|---------|----------|
| Israel | ILS - Israeli Shekel |

---

## 🎬 User Experience Flow

### **Example 1: India**
```
1. User selects: Lead Country = "India"
   ↓
2. System auto-fills: Client Currency = "INR - Indian Rupee"
   ↓
3. Helper text appears: "💡 Auto-selected based on India. You can change it manually."
   ↓
4. User can keep INR or manually change to USD, EUR, etc.
```

### **Example 2: United Arab Emirates**
```
1. User selects: Lead Country = "United Arab Emirates"
   ↓
2. System auto-fills: Client Currency = "AED - UAE Dirham"
   ↓
3. Helper text appears: "💡 Auto-selected based on United Arab Emirates. You can change it manually."
   ↓
4. User can keep AED or manually change to another currency
```

### **Example 3: Germany (Euro Zone)**
```
1. User selects: Lead Country = "Germany"
   ↓
2. System auto-fills: Client Currency = "EUR - Euro"
   ↓
3. Helper text appears: "💡 Auto-selected based on Germany. You can change it manually."
   ↓
4. User can keep EUR or manually change
```

---

## 📊 Visual Example

### **Before Selection:**
```
┌─────────────────────────────────┐
│ Lead Country *                  │
│ [Select country ▼            ]  │
│                                 │
│ Client Currency *               │
│ [INR ▼                       ]  │ ← Default: INR
└─────────────────────────────────┘
```

### **After Selecting "United Arab Emirates":**
```
┌─────────────────────────────────┐
│ Lead Country *                  │
│ [United Arab Emirates ▼      ]  │
│                                 │
│ Client Currency *               │
│ [AED - UAE Dirham ▼          ]  │ ← Auto-selected!
│ 💡 Auto-selected based on       │
│    United Arab Emirates.        │
│    You can change it manually.  │
└─────────────────────────────────┘
```

### **Manual Override:**
```
┌─────────────────────────────────┐
│ Lead Country *                  │
│ [United Arab Emirates ▼      ]  │
│                                 │
│ Client Currency *               │
│ [USD - US Dollar ▼           ]  │ ← User changed manually
│ 💡 Auto-selected based on       │
│    United Arab Emirates.        │
│    You can change it manually.  │
└─────────────────────────────────┘
```

---

## 🔧 Technical Details

### **Implementation:**

```typescript
// Currency mapping
const countryCurrencyMap = {
  'India': 'INR',
  'United Arab Emirates': 'AED',
  'United States': 'USD',
  'Germany': 'EUR',
  // ... 50+ countries mapped
}

// Auto-select on country change
onChange={value => {
  setForm(prev => ({ ...prev, leadCountry: value }))
  const currency = countryCurrencyMap[value]
  if (currency) {
    setForm(prev => ({ ...prev, clientCurrency: currency }))
  }
}}
```

### **Features:**
1. ✅ **Auto-selection** - Currency fills automatically
2. ✅ **Manual override** - User can change anytime
3. ✅ **Helper text** - Shows which country triggered auto-selection
4. ✅ **50+ countries** - Comprehensive mapping
5. ✅ **Fallback** - If country not mapped, user selects manually

---

## 💡 Benefits

1. **Faster Data Entry** - No need to manually select currency for common countries
2. **Reduced Errors** - Correct currency auto-selected based on country
3. **Flexibility** - Can still manually override if needed
4. **User-Friendly** - Clear feedback with helper text
5. **Comprehensive** - Covers 50+ countries across all continents

---

## 🎯 Use Cases

### **Use Case 1: Standard Flow**
- Agent creates lead for Indian customer
- Selects "India" → INR auto-fills
- Continues with form

### **Use Case 2: Manual Override**
- Agent creates lead for UAE customer
- Selects "United Arab Emirates" → AED auto-fills
- Customer prefers USD → Agent manually changes to USD
- System allows override

### **Use Case 3: Unmapped Country**
- Agent selects a country not in mapping
- Currency stays at default (INR) or previous selection
- Agent manually selects appropriate currency

---

## ✅ Available Currencies

The dropdown includes **24 major currencies**:

1. INR - Indian Rupee
2. USD - US Dollar
3. EUR - Euro
4. GBP - British Pound
5. AED - UAE Dirham
6. SAR - Saudi Riyal
7. QAR - Qatari Riyal
8. KWD - Kuwaiti Dinar
9. OMR - Omani Rial
10. BHD - Bahraini Dinar
11. CAD - Canadian Dollar
12. AUD - Australian Dollar
13. SGD - Singapore Dollar
14. MYR - Malaysian Ringgit
15. THB - Thai Baht
16. JPY - Japanese Yen
17. CNY - Chinese Yuan
18. CHF - Swiss Franc
19. ZAR - South African Rand
20. BRL - Brazilian Real
21. MXN - Mexican Peso
22. TRY - Turkish Lira
23. RUB - Russian Ruble
24. (More can be added as needed)

---

## 📝 Summary

The auto-currency selection feature makes lead creation **faster and more accurate** by automatically selecting the appropriate currency based on the customer's country, while still allowing manual override for special cases. This reduces data entry time and minimizes currency selection errors! 🎉
