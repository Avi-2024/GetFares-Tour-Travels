

-- =========================================
-- 1. AUTHENTICATION & RBAC TABLES
-- =========================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),

    password_hash TEXT NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,
    is_on_leave BOOLEAN DEFAULT FALSE,

    failed_login_attempts INT DEFAULT 0 CHECK (failed_login_attempts >= 0),
    account_locked_until TIMESTAMP,

    expertise_destinations TEXT[],

    target_amount NUMERIC(12,2) CHECK (target_amount >= 0),
    incentive_percent NUMERIC(5,2) CHECK (incentive_percent >= 0 AND incentive_percent <= 100),

    last_login TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    ip_address VARCHAR(50),
    device_info TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 2. DESTINATION & PRICING
-- =========================================

CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE destination_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    destination_id UUID REFERENCES destinations(id),
    base_cost NUMERIC(12,2) NOT NULL,
    min_profit_percent NUMERIC(5,2) NOT NULL,
    recommended_profit_percent NUMERIC(5,2),
    tax_percent NUMERIC(5,2) DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_from <= valid_to)
);

-- =========================================
-- 3. MARKETING
-- =========================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150),
    source VARCHAR(100),
    budget NUMERIC(12,2),
    actual_spend NUMERIC(12,2) DEFAULT 0,
    leads_generated INT DEFAULT 0,
    revenue_generated NUMERIC(12,2) DEFAULT 0,
    meta_campaign_id VARCHAR(100),
    meta_adset_id VARCHAR(100),
    meta_ad_id VARCHAR(100),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 8. CUSTOMER MANAGEMENT
-- =========================================

CREATE TYPE customer_segment AS ENUM (
    'PLATINUM',
    'GOLD',
    'SILVER',
    'NEW'
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    preferences TEXT,
    lifetime_value NUMERIC(12,2) DEFAULT 0,
    segment customer_segment DEFAULT 'NEW',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_leads (
    customer_id UUID REFERENCES customers(id),
    lead_id UUID REFERENCES leads(id),
    PRIMARY KEY (customer_id, lead_id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- =========================================
-- 4. LEAD MANAGEMENT
-- =========================================

CREATE TYPE lead_status AS ENUM (
    'OPEN',
    'CONTACTED',
    'WIP',
    'QUOTED',
    'FOLLOW_UP',
    'CONVERTED',
    'LOST'
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID NOT NULL REFERENCES customers(id),

    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,

    travel_date DATE,
    budget NUMERIC(12,2) CHECK (budget >= 0),

    source VARCHAR(100),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    lead_score INT DEFAULT 0 CHECK (lead_score >= 0),

    priority_level INT DEFAULT 0 CHECK (priority_level >= 0),
    is_vip BOOLEAN DEFAULT FALSE,

    status lead_status DEFAULT 'OPEN',

    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,

    response_deadline TIMESTAMP,
    response_at TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,

    reassignment_count INT DEFAULT 0 CHECK (reassignment_count >= 0),

    qualification_completed BOOLEAN DEFAULT FALSE,

    closed_reason TEXT,
    next_followup_date DATE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id),
    user_id UUID REFERENCES users(id),
followup_type INT CHECK (followup_type BETWEEN 1 AND 4),    followup_date TIMESTAMP,
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 5. QUOTATION
-- =========================================

CREATE TYPE quote_status AS ENUM (
    'DRAFT',
    'SENT',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parent_quote_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    pricing_id UUID REFERENCES destination_pricing(id) ON DELETE SET NULL,

    total_cost NUMERIC(12,2) CHECK (total_cost >= 0),
    margin_percent NUMERIC(5,2) CHECK (margin_percent >= 0 AND margin_percent <= 100),
    discount NUMERIC(12,2) DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12,2) DEFAULT 0 CHECK (tax >= 0),
    final_price NUMERIC(12,2) CHECK (final_price >= 0),

    version_number INT DEFAULT 1 CHECK (version_number > 0),

    status quote_status DEFAULT 'DRAFT',

    pdf_url TEXT,
    sent_at TIMESTAMP,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    item_type VARCHAR(50),
    description TEXT,
    cost NUMERIC(12,2)
);

CREATE TABLE quotation_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID REFERENCES quotations(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50)
);

-- =========================================
-- 6. BOOKING & PAYMENT
-- =========================================

CREATE TYPE booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED'
);

CREATE TYPE payment_status AS ENUM (
    'PENDING',
    'PARTIAL',
    'FULL',
    'REFUNDED'
);

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,

    booking_number VARCHAR(50) NOT NULL UNIQUE,

    travel_start_date DATE NOT NULL,
    travel_end_date DATE NOT NULL,

    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    cost_amount NUMERIC(12,2) NOT NULL CHECK (cost_amount >= 0),

    -- Auto calculated profit
    profit_amount NUMERIC(12,2)
        GENERATED ALWAYS AS (total_amount - cost_amount) STORED,

   status booking_status NOT NULL DEFAULT 'PENDING',
payment_status payment_status NOT NULL DEFAULT 'PENDING',

    advance_required NUMERIC(12,2) DEFAULT 0 CHECK (advance_required >= 0),
    advance_received NUMERIC(12,2) DEFAULT 0 CHECK (advance_received >= 0),

client_currency VARCHAR(10) DEFAULT 'INR',
supplier_currency VARCHAR(10) DEFAULT 'INR',
exchange_rate NUMERIC(14,6) CHECK (exchange_rate > 0),
exchange_locked BOOLEAN DEFAULT FALSE,

    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,

    created_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_travel_dates CHECK (travel_start_date <= travel_end_date)
);

CREATE TABLE booking_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    old_status booking_status,
    new_status booking_status,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR',

    -- CASH / UPI / CARD / BANK / GATEWAY
    payment_mode VARCHAR(50) NOT NULL,

    -- Razorpay / Stripe / Manual
    gateway_provider VARCHAR(50),

    -- Gateway tracking
    gateway_order_id VARCHAR(150),
    gateway_payment_id VARCHAR(150),
    gateway_signature TEXT,

    -- Manual reference
    payment_reference VARCHAR(100),
    proof_url TEXT,

    status payment_status DEFAULT 'PENDING',

    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,

    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,    invoice_number VARCHAR(50) UNIQUE,
    pdf_url TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE refund_status AS ENUM (
    'INITIATED',
    'APPROVED',
    'REJECTED',
    'PROCESSED'
);

CREATE TABLE refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID NOT NULL REFERENCES bookings(id),
    payment_id UUID REFERENCES payments(id),

    refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),

    gateway_refund_id VARCHAR(150),

   supplier_penalty NUMERIC(12,2) DEFAULT 0 CHECK (supplier_penalty >= 0),
service_charge NUMERIC(12,2) DEFAULT 0 CHECK (service_charge >= 0),

status refund_status DEFAULT 'INITIATED',
    approved_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 7. VISA MODULE
-- =========================================

CREATE TYPE visa_status AS ENUM (
    'DOCUMENT_PENDING',
    'SUBMITTED',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150),
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
pan_number VARCHAR(20),
gst_number VARCHAR(20),
address TEXT,
bank_name VARCHAR(150),
bank_account_number VARCHAR(50),
ifsc_code VARCHAR(20),
supplier_currency VARCHAR(10),
is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visa_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    supplier_id UUID REFERENCES suppliers(id),
    country VARCHAR(100),
    visa_type VARCHAR(100),
    visa_number VARCHAR(100),
    fees NUMERIC(12,2),
    appointment_date DATE,
    submission_date DATE,
    status visa_status DEFAULT 'DOCUMENT_PENDING',
    rejection_reason TEXT,
    visa_valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visa_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visa_case_id UUID REFERENCES visa_cases(id),
    document_type VARCHAR(100),
    file_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documentation_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    passport_verified BOOLEAN DEFAULT FALSE,
    visa_verified BOOLEAN DEFAULT FALSE,
    insurance_verified BOOLEAN DEFAULT FALSE,
    ticket_verified BOOLEAN DEFAULT FALSE,
    hotel_verified BOOLEAN DEFAULT FALSE,
    transfer_verified BOOLEAN DEFAULT FALSE,
    tour_verified BOOLEAN DEFAULT FALSE,
    final_itinerary_uploaded BOOLEAN DEFAULT FALSE,
    travel_ready BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- =========================================
-- 7.1. Supllier Payables, Tax Ledger & Exchange Rates
-- =========================================

CREATE TYPE payable_status AS ENUM ('PENDING','PARTIAL','PAID');

CREATE TABLE supplier_payables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    supplier_id UUID REFERENCES suppliers(id),

    payable_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0,

    due_date DATE,
    status payable_status DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    tax_type VARCHAR(50), -- GST_OUTPUT / GST_INPUT / TCS
    amount NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency VARCHAR(10),
    target_currency VARCHAR(10),
    rate NUMERIC(14,6),
    effective_date DATE
);


-- =========================================
-- 9. OPERATIONS
-- =========================================

CREATE TYPE complaint_status AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED'
);

CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    assigned_to UUID REFERENCES users(id),
    issue_type VARCHAR(150),
    description TEXT,
    status complaint_status DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID REFERENCES complaints(id),
    user_id UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 10. EMPLOYEE MANAGEMENT
-- =========================================

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    date DATE
);

CREATE TABLE leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50)
);

-- =========================================
-- 11. GLOBAL AUDIT
-- =========================================


CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(100),
    entity_id UUID,
    action VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 12. INDEXES
-- =========================================
-- =============================
-- LEADS INDEXES
-- =============================

CREATE INDEX idx_leads_destination_id ON leads(destination_id);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_response_deadline ON leads(response_deadline);
CREATE INDEX idx_active_leads ON leads(status) WHERE is_deleted = FALSE;
-- For filtering by status + assigned_to (very common CRM query)
CREATE INDEX idx_leads_status_assigned ON leads(status, assigned_to);


-- =============================
-- QUOTATIONS INDEXES
-- =============================

CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);


-- =============================
-- BOOKINGS INDEXES
-- =============================

CREATE INDEX idx_bookings_quotation_id ON bookings(quotation_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);


-- =============================
-- PAYMENTS INDEXES
-- =============================

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- Important for gateway reconciliation
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id);


-- =============================
-- REFUNDS INDEXES
-- =============================

CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);


-- =============================
-- VISA MODULE INDEXES
-- =============================

CREATE INDEX idx_visa_cases_booking_id ON visa_cases(booking_id);
CREATE INDEX idx_visa_cases_status ON visa_cases(status);


-- =============================
-- CAMPAIGNS INDEXES
-- =============================

CREATE INDEX idx_campaigns_source ON campaigns(source);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);