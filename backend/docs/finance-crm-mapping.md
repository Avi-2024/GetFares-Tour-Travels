# Finance System to CRM Mapping

## 1. Purpose
This document maps finance-required fields to current database and API modules, and highlights missing service-layer behavior.

## 2. Requirement Mapping

### 2.1 Client Onboarding
Required:
- PAN
- Address
- Email ID
- Contact Number

Current mapping:
- Lead intake validation supports: `panNumber`, `addressLine`, `email`, `phone`.
- Customer table stores: `email`, `phone`.
- Leads are linked to `customers` via `customer_id`.

Status:
- Data capture: available through leads/webhooks payload.
- Customer table PAN/address persistence: not modeled as dedicated columns yet.

### 2.2 Supplier Onboarding
Required:
- Supplier PAN
- GST
- Address
- Invoice/payment details
- Supplier email and phone

Current mapping (`suppliers` table):
- `pan_number`, `gst_number`, `address`
- `bank_name`, `bank_account_number`, `ifsc_code`
- `email`, `phone`, `supplier_currency`

Status:
- DB layer: available.
- Dedicated supplier API module: pending (currently under visa-related schema, no dedicated supplier endpoints).

### 2.3 Cost Break-up
Required:
- Supplier cost (tax breakup)
- Markup
- Service fee
- GST
- TCS
- Total sale value

Current mapping:
- Quotations: `total_cost`, `margin_percent`, `discount`, `tax`, `final_price`.
- Bookings: `cost_amount`, `total_amount`, generated `profit_amount`.
- Refunds: `supplier_penalty`, `service_charge`.
- Tax ledger table exists: `tax_ledger(tax_type, amount)`.

Status:
- Basic commercial math: available.
- Explicit markup/service-fee/GST/TCS line-level persistence in quote items: partially missing in API/service contract.
- Automated accounting posting to `tax_ledger`: pending.

### 2.4 Mode of Payment
Required:
- Cash
- Bank Transfer
- Payment Gateway

Current mapping (`payments` table):
- `payment_mode`
- `gateway_provider`, `gateway_order_id`, `gateway_payment_id`, `gateway_signature`
- `payment_reference`, `proof_url`

Status:
- DB fields: available.
- Policy validations by mode (mandatory proof/reference by mode): pending in service layer.

### 2.5 Currency
Required:
- Client currency
- Supplier currency

Current mapping:
- Leads payload supports `clientCurrency`.
- Bookings table: `client_currency`, `supplier_currency`, `exchange_rate`, `exchange_locked`.
- Suppliers table: `supplier_currency`.
- Exchange rates table: `exchange_rates`.

Status:
- DB structure: available.
- End-to-end currency conversion and lock workflow in booking/payment services: pending.

## 3. Operational Flow (Target)
1. Capture client KYC data at lead creation.
2. Resolve/create customer and link lead.
3. Create quotation with cost breakdown and margin checks.
4. Convert to booking with currency context.
5. Post payment entries and verification.
6. Post tax and payable entries for accounting.
7. Handle refund with charges and approval audit.

## 4. Gap Closure Backlog
1. Add customer PAN/address fields in `customers` table + API contracts.
2. Create dedicated `suppliers` module (controller/service/repository/routes/validation).
3. Add explicit quotation fields for markup/service-fee/GST/TCS breakdown.
4. Implement tax posting service into `tax_ledger`.
5. Add currency conversion service and exchange-rate locking policy.
6. Add finance reconciliation reports (outstanding, margin, tax summary, supplier payable aging).

## 5. Ownership
- Data model: Backend + DBA
- Financial rules: Accounts + Product owner
- API behavior: Backend module owners
