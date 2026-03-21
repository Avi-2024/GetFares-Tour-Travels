


-- =========================================
-- 1. AUTHENTICATION & RBAC TABLES
-- =========================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
-- 3.1 NOTIFICATIONS
-- =========================================

CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    title VARCHAR(200),
    message TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_role VARCHAR(100),
    recipient_team_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'FAILED')),
    delivery_attempts INT NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 3.2 SETTINGS
-- =========================================

CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(80) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_settings_key ON app_settings(key);

INSERT INTO app_settings (key, value)
VALUES
  (
    'system',
    jsonb_build_object(
      'companyName', 'Get2Vacation Travel CRM',
      'supportEmail', 'support@Get2Vacation.com',
      'supportPhone', '',
      'timezone', 'Asia/Kolkata',
      'currency', 'INR',
      'dateFormat', 'DD/MM/YYYY',
      'websiteUrl', ''
    )
  ),
  (
    'integrations',
    jsonb_build_object(
      'metaAppId', '',
      'metaAccessToken', '',
      'whatsappApiToken', '',
      'smtpHost', '',
      'smtpPort', 587,
      'smtpUser', '',
      'smtpPassword', '',
      'smtpFromEmail', '',
      'webhookUrl', ''
    )
  )
ON CONFLICT (key) DO NOTHING;

-- =========================================
-- 4. CUSTOMER MANAGEMENT (MOVED BEFORE LEADS)
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
    pan_number VARCHAR(20),
    address_line TEXT,
    client_currency VARCHAR(10) DEFAULT 'INR',
    preferences TEXT,
    lifetime_value NUMERIC(12,2) DEFAULT 0,
    segment customer_segment DEFAULT 'NEW',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 5. LEAD MANAGEMENT
-- =========================================

CREATE TYPE lead_status AS ENUM (
    'OPEN',
    'CONTACTED',
    'WIP',
    'QUOTED',
    'FOLLOW_UP',
    'CONVERTED',
    'LOST',
    'NON_RESPONSIVE'
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    customer_id UUID NOT NULL REFERENCES customers(id),

    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    pan_number VARCHAR(20),
    address_line TEXT,
    client_currency VARCHAR(10) DEFAULT 'INR',

    destination_id UUID REFERENCES destinations(id) ON DELETE SET NULL,

    nationality VARCHAR(80),
    travel_date DATE,
    budget NUMERIC(12,2) CHECK (budget >= 0),
    adults_count INT DEFAULT 1 CHECK (adults_count >= 0),
    children_count INT DEFAULT 0 CHECK (children_count >= 0),
    visa_required BOOLEAN DEFAULT FALSE,
    lead_type VARCHAR(20) DEFAULT 'HOLIDAY',
    travel_purpose VARCHAR(50),
    sub_status VARCHAR(60),
    temperature VARCHAR(10) DEFAULT 'COLD',

    source VARCHAR(100),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    meta_lead_id VARCHAR(120),

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
    followup_attempts INT DEFAULT 0 CHECK (followup_attempts >= 0),
    final_reminder_at TIMESTAMP,
    non_responsive_marked_at TIMESTAMP,
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

CREATE TABLE customer_leads (
    customer_id UUID REFERENCES customers(id),
    lead_id UUID REFERENCES leads(id),
    PRIMARY KEY (customer_id, lead_id),
    is_deleted BOOLEAN DEFAULT FALSE
);

-- =========================================
-- 6. QUOTATION
-- =========================================

CREATE TYPE quote_status AS ENUM (
    'DRAFT',
    'SENT',
    'VIEWED',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'PENDING'
);

CREATE TABLE quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    template_type VARCHAR(40) NOT NULL
        CHECK (template_type IN ('READY_PACKAGE', 'VISA', 'CUSTOM_ITINERARY')),
    header_branding TEXT,
    inclusions TEXT,
    exclusions TEXT,
    payment_terms TEXT,
    cancellation_policy TEXT,
    footer_disclaimer TEXT,
    min_margin_percent NUMERIC(5,2) DEFAULT 0
        CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    parent_quote_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    pricing_id UUID REFERENCES destination_pricing(id) ON DELETE SET NULL,
    template_id UUID REFERENCES quotation_templates(id) ON DELETE SET NULL,
    template_snapshot JSONB,
    quote_number VARCHAR(50),

    total_cost NUMERIC(12,2) CHECK (total_cost >= 0),
    margin_percent NUMERIC(5,2) CHECK (margin_percent >= 0 AND margin_percent <= 100),
    margin_amount NUMERIC(12,2) DEFAULT 0 CHECK (margin_amount >= 0),
    discount NUMERIC(12,2) DEFAULT 0 CHECK (discount >= 0),
    discount_amount NUMERIC(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    tax NUMERIC(12,2) DEFAULT 0 CHECK (tax >= 0),
    tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
    final_price NUMERIC(12,2) CHECK (final_price >= 0),

    supplier_cost NUMERIC(12,2) DEFAULT 0 CHECK (supplier_cost >= 0),
    supplier_tax_amount NUMERIC(12,2) DEFAULT 0 CHECK (supplier_tax_amount >= 0),
    markup_amount NUMERIC(12,2) DEFAULT 0 CHECK (markup_amount >= 0),
    service_fee_amount NUMERIC(12,2) DEFAULT 0 CHECK (service_fee_amount >= 0),
    gst_amount NUMERIC(12,2) DEFAULT 0 CHECK (gst_amount >= 0),
    tcs_amount NUMERIC(12,2) DEFAULT 0 CHECK (tcs_amount >= 0),
    total_sale_value NUMERIC(12,2) DEFAULT 0 CHECK (total_sale_value >= 0),
    cost_currency VARCHAR(10) DEFAULT 'INR',
    client_currency VARCHAR(10) DEFAULT 'INR',
    supplier_currency VARCHAR(10) DEFAULT 'INR',

    min_margin_percent NUMERIC(5,2) DEFAULT 0 CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_note TEXT,
    important_notes TEXT,

    version_number INT DEFAULT 1 CHECK (version_number > 0),

    status quote_status DEFAULT 'DRAFT',

    pdf_url TEXT,
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMP,
    pdf_generated_at TIMESTAMP,
    pdf_generated_by UUID REFERENCES users(id),
    view_count INT DEFAULT 0,
    first_viewed_at TIMESTAMP,
    last_viewed_at TIMESTAMP,
    expires_at TIMESTAMP,
    locked_at TIMESTAMP,
    lead_to_quote_minutes INT,
    lead_to_quote_sent_minutes INT,
    response_category VARCHAR(30) CHECK (response_category IN ('READY_PACKAGE', 'CUSTOMIZED', 'COMPLEX_ITINERARY')),
    response_sla_minutes INT CHECK (response_sla_minutes > 0),
    response_sla_breached BOOLEAN DEFAULT FALSE,

    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    ip_address VARCHAR(50),
    device_info TEXT,
    user_agent TEXT
);

CREATE TABLE quotation_version_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    editor_id UUID REFERENCES users(id),
    action VARCHAR(60) NOT NULL,
    change_log JSONB,
    snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_send_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(id),
    delivery_channel VARCHAR(30) DEFAULT 'MANUAL',
    recipient_email VARCHAR(150),
    recipient_phone VARCHAR(25),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE TABLE quotation_reminder_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    reminder_type VARCHAR(60) NOT NULL,
    triggered_by UUID REFERENCES users(id),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
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

    -- CASH / BANK_TRANSFER / PAYMENT_GATEWAY
    payment_mode VARCHAR(50) NOT NULL
        CHECK (
            UPPER(payment_mode) IN (
                'CASH',
                'BANK_TRANSFER',
                'PAYMENT_GATEWAY'
            )
        ),

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
    gst_number VARCHAR(30),
    address TEXT,
    address_line TEXT,
    country VARCHAR(100),
    invoice_beneficiary_name VARCHAR(200),
    invoice_bank_name VARCHAR(200),
    invoice_account_number VARCHAR(100),
    invoice_ifsc_swift VARCHAR(40),
    invoice_upi_id VARCHAR(100),
    bank_name VARCHAR(150),
    bank_account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    supplier_currency VARCHAR(10) DEFAULT 'INR',
    contract_url TEXT,
    rate_valid_until DATE,
    production_commitment TEXT,
    payment_deadline_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
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

CREATE TABLE booking_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP
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
    payment_reference VARCHAR(100),
    last_paid_at TIMESTAMP,

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
-- 8.1. WEBSITE PACKAGES
-- =========================================

CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    duration VARCHAR(30),
    starting_price NUMERIC(12,2) DEFAULT 0 CHECK (starting_price >= 0),
    inclusions TEXT,
    exclusions TEXT,
    itinerary JSONB,
    hotel_details TEXT,
    valid_from DATE,
    valid_to DATE,
    cancellation_policy TEXT,
    package_category VARCHAR(30),
    status VARCHAR(20) DEFAULT 'DRAFT',
    banner_image_url TEXT,
    gallery_image_urls TEXT[],
    meta_title VARCHAR(180),
    meta_description TEXT,
    keywords TEXT,
    publish_to_website BOOLEAN DEFAULT FALSE,
    website_slug VARCHAR(180) UNIQUE,
    website_last_synced_at TIMESTAMP,
    is_sold_out BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE package_enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    package_name VARCHAR(200),
    travel_date DATE,
    travellers_count INT DEFAULT 1 CHECK (travellers_count > 0),
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    source VARCHAR(120) DEFAULT 'Website - Package Page',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_leads_assigned_at ON leads(assigned_at);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_response_deadline ON leads(response_deadline);
CREATE INDEX idx_leads_sla_breached ON leads(sla_breached);
CREATE INDEX idx_active_leads ON leads(status) WHERE is_deleted = FALSE;
-- For filtering by status + assigned_to (very common CRM query)
CREATE INDEX idx_leads_status_assigned ON leads(status, assigned_to);
CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_sub_status ON leads(sub_status);
CREATE INDEX idx_leads_pan_number ON leads(pan_number);
CREATE UNIQUE INDEX idx_leads_meta_lead_id ON leads(meta_lead_id);
CREATE INDEX idx_followups_lead_id ON followups(lead_id);
CREATE INDEX idx_followups_due_open ON followups(followup_date, is_completed);
CREATE INDEX idx_lead_activities_lead_user_created
  ON lead_activities(lead_id, user_id, created_at);


-- =============================
-- QUOTATIONS INDEXES
-- =============================

CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);
CREATE UNIQUE INDEX uq_quotations_quote_number ON quotations(quote_number) WHERE quote_number IS NOT NULL;
CREATE INDEX idx_quotations_template_id ON quotations(template_id);
CREATE INDEX idx_quotations_requires_approval ON quotations(requires_approval);
CREATE INDEX idx_quotations_status_expires ON quotations(status, expires_at);
CREATE INDEX idx_quotation_version_logs_quote ON quotation_version_logs(quotation_id, version_number DESC);
CREATE INDEX idx_quotation_send_logs_quote_sent_at ON quotation_send_logs(quotation_id, sent_at DESC);
CREATE INDEX idx_quotation_reminders_quote_type ON quotation_reminder_logs(quotation_id, reminder_type);
CREATE INDEX idx_quotation_views_quote_viewed ON quotation_views(quotation_id, viewed_at DESC);
CREATE INDEX idx_quotation_templates_active_type ON quotation_templates(is_active, template_type);
CREATE INDEX idx_quotations_total_sale_value ON quotations(total_sale_value);


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
CREATE INDEX idx_payments_mode ON payments(payment_mode);

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
-- SUPPLIERS INDEXES
-- =============================

CREATE INDEX idx_suppliers_pan_number ON suppliers(pan_number);
CREATE INDEX idx_supplier_payables_supplier_id ON supplier_payables(supplier_id);
CREATE INDEX idx_supplier_payables_status ON supplier_payables(status);
CREATE INDEX idx_booking_documents_booking_id ON booking_documents(booking_id);

-- =============================
-- NOTIFICATIONS INDEXES
-- =============================

CREATE INDEX idx_notification_events_recipient_user ON notification_events (recipient_user_id, status, created_at DESC);
CREATE INDEX idx_notification_events_recipient_role ON notification_events (recipient_role, status, created_at DESC);
CREATE INDEX idx_notification_events_recipient_team ON notification_events (recipient_team_id, status, created_at DESC);
CREATE INDEX idx_notification_events_event_name ON notification_events (event_name, created_at DESC);
CREATE INDEX idx_notification_events_status ON notification_events (status, created_at DESC);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);
CREATE INDEX idx_role_permissions_role_active ON role_permissions(role_id, is_active);
CREATE INDEX idx_role_permissions_permission_active ON role_permissions(permission_id, is_active);

-- =============================
-- PACKAGES INDEXES
-- =============================

CREATE INDEX idx_packages_status_publish ON packages(status, publish_to_website);
CREATE INDEX idx_package_enquiries_package_id ON package_enquiries(package_id);


-- =============================
-- CAMPAIGNS INDEXES
-- =============================

CREATE INDEX idx_campaigns_source ON campaigns(source);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);

-- =============================
-- CUSTOMERS INDEXES
-- =============================

CREATE INDEX idx_customers_pan_number ON customers(pan_number);
