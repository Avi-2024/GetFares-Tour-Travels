-- AUTO-GENERATED MYSQL SCHEMA
-- Source: backend/database/migrations/database.sql
-- IMPORTANT: Review manually before production use.




-- =========================================
-- 1. AUTHENTICATION & RBAC TABLES
-- =========================================

CREATE TABLE roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    country VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `key` VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id CHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id CHAR(36) REFERENCES permissions(id) ON DELETE CASCADE,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    role_id CHAR(36) REFERENCES roles(id) ON DELETE SET NULL,

    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),

    password_hash TEXT NOT NULL,

    is_active TINYINT(1) DEFAULT 1,
    is_on_leave TINYINT(1) DEFAULT 0,
    active TINYINT(1) DEFAULT 1,

    failed_login_attempts INT DEFAULT 0 CHECK (failed_login_attempts >= 0),
    account_locked_until TIMESTAMP,

    expertise_destinations JSON,
    agent_country VARCHAR(100),
    agent_type VARCHAR(40),
    manager_id CHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    target_amount NUMERIC(12,2) CHECK (target_amount >= 0),
    incentive_percent NUMERIC(5,2) CHECK (incentive_percent >= 0 AND incentive_percent <= 100),

    last_login TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_manager_id ON users(manager_id);

CREATE TABLE login_audit (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) REFERENCES users(id),
    ip_address VARCHAR(50),
    device_info TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 2. DESTINATION & PRICING
-- =========================================

CREATE TABLE destinations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(150) UNIQUE NOT NULL,
    country VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE destination_pricing (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    destination_id CHAR(36) REFERENCES destinations(id),
    base_cost NUMERIC(12,2) NOT NULL,
    min_profit_percent NUMERIC(5,2) NOT NULL,
    recommended_profit_percent NUMERIC(5,2),
    tax_percent NUMERIC(5,2) DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_by CHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_from <= valid_to)
);

-- =========================================
-- 3. MARKETING
-- =========================================

CREATE TABLE campaigns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    title VARCHAR(200),
    message TEXT,
    payload JSON NOT NULL,
    recipient_user_id CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    recipient_role VARCHAR(100),
    recipient_team_id CHAR(36),
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
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    `key` VARCHAR(80) NOT NULL UNIQUE,
    value JSON NOT NULL,
    updated_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_settings_key ON app_settings(`key`);

INSERT IGNORE INTO app_settings (`key`, value)
VALUES
  (
    'system',
    JSON_OBJECT(
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
    JSON_OBJECT(
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
;

-- =========================================
-- 4. CUSTOMER MANAGEMENT (MOVED BEFORE LEADS)
-- =========================================

-- removed enum type customer_segment

CREATE TABLE customers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    pan_number VARCHAR(20),
    address_line TEXT,
    client_currency VARCHAR(10) DEFAULT 'INR',
    preferences TEXT,
    lifetime_value NUMERIC(12,2) DEFAULT 0,
    segment ENUM('PLATINUM', 'GOLD', 'SILVER', 'NEW') DEFAULT 'NEW',
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 5. LEAD MANAGEMENT
-- =========================================

-- removed enum type lead_status

CREATE TABLE leads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    customer_id CHAR(36) NOT NULL REFERENCES customers(id),

    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    pan_number VARCHAR(20),
    address_line TEXT,
    client_currency VARCHAR(10) DEFAULT 'INR',

    destination_id CHAR(36) REFERENCES destinations(id) ON DELETE SET NULL,

    nationality VARCHAR(80),
    lead_country VARCHAR(100),
    travel_from VARCHAR(150),
    travel_to VARCHAR(150),
    travel_date DATE,
    travel_end_date DATE,
    budget NUMERIC(12,2) CHECK (budget >= 0),
    adults_count INT DEFAULT 1 CHECK (adults_count >= 0),
    children_count INT DEFAULT 0 CHECK (children_count >= 0),
    child_ages JSON,
    visa_required TINYINT(1) DEFAULT 0,
    lead_type VARCHAR(20) DEFAULT 'HOLIDAY',
    travel_purpose VARCHAR(50),
    sub_status VARCHAR(60),
    temperature VARCHAR(10) DEFAULT 'COLD',

    source VARCHAR(100),
    campaign_id CHAR(36) REFERENCES campaigns(id) ON DELETE SET NULL,

    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    meta_lead_id VARCHAR(120),
    lead_code VARCHAR(20),

    lead_score INT DEFAULT 0 CHECK (lead_score >= 0),

    priority_level INT DEFAULT 0 CHECK (priority_level >= 0),
    is_vip TINYINT(1) DEFAULT 0,

    status ENUM('OPEN', 'CONTACTED', 'WIP', 'QUOTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'NON_RESPONSIVE') DEFAULT 'OPEN',

    assigned_to CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP,

    response_deadline TIMESTAMP,
    response_at TIMESTAMP,
    sla_breached TINYINT(1) DEFAULT 0,

    reassignment_count INT DEFAULT 0 CHECK (reassignment_count >= 0),

    qualification_completed TINYINT(1) DEFAULT 0,

    closed_reason TEXT,
    next_followup_date DATE,
    followup_attempts INT DEFAULT 0 CHECK (followup_attempts >= 0),
    final_reminder_at TIMESTAMP,
    non_responsive_marked_at TIMESTAMP,
    calls_disabled TINYINT(1) DEFAULT 0,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE queued_leads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (lead_id)
);

CREATE TABLE lead_activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) REFERENCES leads(id) ON DELETE CASCADE,
    user_id CHAR(36) REFERENCES users(id),
    activity_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE followups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) REFERENCES leads(id),
    user_id CHAR(36) REFERENCES users(id),
    followup_type INT CHECK (followup_type BETWEEN 1 AND 4),
    followup_date TIMESTAMP,
    cadence_code VARCHAR(50),
    status_snapshot VARCHAR(60),
    notes TEXT,
    is_completed TINYINT(1) DEFAULT 0,
    is_schedule_only TINYINT(1) DEFAULT 0,
    counts_toward_compliance TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lead_followup_alert_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    followup_id CHAR(36) NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL,
    alert_date DATE NOT NULL,
    triggered_at DATETIME NOT NULL DEFAULT NOW(),
    metadata JSON
);

CREATE TABLE customer_leads (
    customer_id CHAR(36) REFERENCES customers(id),
    lead_id CHAR(36) REFERENCES leads(id),
    PRIMARY KEY (customer_id, lead_id),
    is_deleted TINYINT(1) DEFAULT 0
);

-- =========================================
-- 6. QUOTATION
-- =========================================

-- removed enum type quote_status

CREATE TABLE quotation_templates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    is_active TINYINT(1) DEFAULT 1,
    created_by CHAR(36) REFERENCES users(id),
    updated_by CHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    parent_quote_id CHAR(36) REFERENCES quotations(id) ON DELETE SET NULL,
    lead_id CHAR(36) REFERENCES leads(id) ON DELETE SET NULL,
    created_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    pricing_id CHAR(36) REFERENCES destination_pricing(id) ON DELETE SET NULL,
    template_id CHAR(36) REFERENCES quotation_templates(id) ON DELETE SET NULL,
    template_snapshot JSON,
    source_package_id CHAR(36) REFERENCES packages(id) ON DELETE SET NULL,
    quotation_title VARCHAR(200),
    trip_destination VARCHAR(200),
    duration_nights INT CHECK (duration_nights >= 0),
    duration_days INT CHECK (duration_days >= 0),
    duration_label VARCHAR(50),
    travel_start_date DATE,
    itinerary JSON,
    inclusions TEXT,
    exclusions TEXT,
    hotel_details TEXT,
    visa_details TEXT,
    payment_terms TEXT,
    cancellation_policy TEXT,
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
    requires_approval TINYINT(1) DEFAULT 0,
    approved_by CHAR(36) REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_note TEXT,
    important_notes TEXT,

    version_number INT DEFAULT 1 CHECK (version_number > 0),

    status ENUM('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'EXPIRED', 'PENDING') DEFAULT 'DRAFT',

    pdf_url TEXT,
    sent_by CHAR(36) REFERENCES users(id),
    sent_at TIMESTAMP,
    pdf_generated_at TIMESTAMP,
    pdf_generated_by CHAR(36) REFERENCES users(id),
    view_count INT DEFAULT 0,
    first_viewed_at TIMESTAMP,
    last_viewed_at TIMESTAMP,
    expires_at TIMESTAMP,
    locked_at TIMESTAMP,
    lead_to_quote_minutes INT,
    lead_to_quote_sent_minutes INT,
    response_category VARCHAR(30) CHECK (response_category IN ('READY_PACKAGE', 'CUSTOMIZED', 'COMPLEX_ITINERARY')),
    response_sla_minutes INT CHECK (response_sla_minutes > 0),
    response_sla_breached TINYINT(1) DEFAULT 0,

    is_deleted TINYINT(1) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) REFERENCES quotations(id) ON DELETE CASCADE,
    item_type VARCHAR(50),
    description TEXT,
    cost NUMERIC(12,2)
);

CREATE TABLE quotation_views (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) REFERENCES quotations(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    device_info TEXT,
    user_agent TEXT
);

CREATE TABLE quotation_version_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    editor_id CHAR(36) REFERENCES users(id),
    action VARCHAR(60) NOT NULL,
    change_log JSON,
    snapshot JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotation_send_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    sent_by CHAR(36) REFERENCES users(id),
    delivery_channel VARCHAR(30) DEFAULT 'MANUAL',
    recipient_email VARCHAR(150),
    recipient_phone VARCHAR(25),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

CREATE TABLE quotation_reminder_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    reminder_type VARCHAR(60) NOT NULL,
    triggered_by CHAR(36) REFERENCES users(id),
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- =========================================
-- 6. BOOKING & PAYMENT
-- =========================================

-- removed enum type booking_status

-- removed enum type payment_status

CREATE TABLE bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    quotation_id CHAR(36) NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,

    booking_number VARCHAR(50) NOT NULL UNIQUE,

    travel_start_date DATE NOT NULL,
    travel_end_date DATE NOT NULL,

    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    cost_amount NUMERIC(12,2) NOT NULL CHECK (cost_amount >= 0),

    -- Auto calculated profit
    profit_amount NUMERIC(12,2)
        GENERATED ALWAYS AS (total_amount - cost_amount) STORED,

   status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
payment_status ENUM('PENDING', 'PARTIAL', 'FULL', 'REFUNDED') NOT NULL DEFAULT 'PENDING',

    advance_required NUMERIC(12,2) DEFAULT 0 CHECK (advance_required >= 0),
    advance_received NUMERIC(12,2) DEFAULT 0 CHECK (advance_received >= 0),

client_currency VARCHAR(10) DEFAULT 'INR',
supplier_currency VARCHAR(10) DEFAULT 'INR',
exchange_rate NUMERIC(14,6) CHECK (exchange_rate > 0),
exchange_locked TINYINT(1) DEFAULT 0,

    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,

    created_by CHAR(36) REFERENCES users(id),
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_travel_dates CHECK (travel_start_date <= travel_end_date)
);

CREATE TABLE booking_status_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    old_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
    new_status ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
    changed_by CHAR(36) REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    booking_id CHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

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
    invoice_url TEXT,

    status ENUM('PENDING', 'PARTIAL', 'FULL', 'REFUNDED') DEFAULT 'PENDING',

    is_verified TINYINT(1) DEFAULT 0,
    verified_by CHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP,

    paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
booking_id CHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,    invoice_number VARCHAR(50) UNIQUE,
    pdf_url TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- removed enum type refund_status

CREATE TABLE refunds (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),

    booking_id CHAR(36) NOT NULL REFERENCES bookings(id),
    payment_id CHAR(36) REFERENCES payments(id),

    refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount > 0),

    gateway_refund_id VARCHAR(150),

   supplier_penalty NUMERIC(12,2) DEFAULT 0 CHECK (supplier_penalty >= 0),
service_charge NUMERIC(12,2) DEFAULT 0 CHECK (service_charge >= 0),

status ENUM('INITIATED', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'INITIATED',
    approved_by CHAR(36) REFERENCES users(id),
    processed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- 7. VISA MODULE
-- =========================================

-- removed enum type visa_status

CREATE TABLE suppliers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
    is_active TINYINT(1) DEFAULT 1,
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visa_cases (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    supplier_id CHAR(36) REFERENCES suppliers(id),
    country VARCHAR(100),
    visa_type VARCHAR(100),
    visa_number VARCHAR(100),
    fees NUMERIC(12,2),
    appointment_date DATE,
    submission_date DATE,
    status ENUM('DOCUMENT_PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') DEFAULT 'DOCUMENT_PENDING',
    rejection_reason TEXT,
    visa_valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visa_documents (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    visa_case_id CHAR(36) REFERENCES visa_cases(id),
    document_type VARCHAR(100),
    file_url TEXT,
    is_verified TINYINT(1) DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documentation_checklist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    passport_verified TINYINT(1) DEFAULT 0,
    visa_verified TINYINT(1) DEFAULT 0,
    insurance_verified TINYINT(1) DEFAULT 0,
    ticket_verified TINYINT(1) DEFAULT 0,
    hotel_verified TINYINT(1) DEFAULT 0,
    transfer_verified TINYINT(1) DEFAULT 0,
    tour_verified TINYINT(1) DEFAULT 0,
    final_itinerary_uploaded TINYINT(1) DEFAULT 0,
    travel_ready TINYINT(1) DEFAULT 0,
    verified_by CHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE booking_documents (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    uploaded_by CHAR(36) REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by CHAR(36) REFERENCES users(id),
    verified_at TIMESTAMP
);

-- =========================================
-- 7.1. Supllier Payables, Tax Ledger & Exchange Rates
-- =========================================

-- removed enum type payable_status

CREATE TABLE supplier_payables (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    supplier_id CHAR(36) REFERENCES suppliers(id),

    payable_amount NUMERIC(12,2) NOT NULL,
    paid_amount NUMERIC(12,2) DEFAULT 0,

    due_date DATE,
    status ENUM('PENDING', 'PARTIAL', 'PAID') DEFAULT 'PENDING',
    payment_reference VARCHAR(100),
    last_paid_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tax_ledger (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    tax_type VARCHAR(50), -- GST_OUTPUT / GST_INPUT / TCS
    amount NUMERIC(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exchange_rates (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    base_currency VARCHAR(10),
    target_currency VARCHAR(10),
    rate NUMERIC(14,6),
    effective_date DATE
);

-- =========================================
-- 8.1. WEBSITE PACKAGES
-- =========================================

CREATE TABLE packages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(200) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    duration VARCHAR(30),
    starting_price NUMERIC(12,2) DEFAULT 0 CHECK (starting_price >= 0),
    inclusions TEXT,
    exclusions TEXT,
    itinerary JSON,
    hotel_details TEXT,
    valid_from DATE,
    valid_to DATE,
    cancellation_policy TEXT,
    package_category VARCHAR(30),
    status VARCHAR(20) DEFAULT 'DRAFT',
    banner_image_url TEXT,
    gallery_image_urls JSON,
    meta_title VARCHAR(180),
    meta_description TEXT,
    keywords TEXT,
    publish_to_website TINYINT(1) DEFAULT 0,
    website_slug VARCHAR(180) UNIQUE,
    website_last_synced_at TIMESTAMP,
    is_sold_out TINYINT(1) DEFAULT 0,
    created_by CHAR(36) REFERENCES users(id),
    updated_by CHAR(36) REFERENCES users(id),
    is_deleted TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE package_enquiries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    package_id CHAR(36) REFERENCES packages(id) ON DELETE SET NULL,
    lead_id CHAR(36) REFERENCES leads(id) ON DELETE SET NULL,
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

-- removed enum type complaint_status

CREATE TABLE complaints (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) REFERENCES bookings(id),
    assigned_to CHAR(36) REFERENCES users(id),
    issue_type VARCHAR(150),
    description TEXT,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaint_activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    complaint_id CHAR(36) REFERENCES complaints(id),
    user_id CHAR(36) REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 10. EMPLOYEE MANAGEMENT
-- =========================================

CREATE TABLE attendance (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) REFERENCES users(id),
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    date DATE
);

CREATE TABLE leaves (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50)
);

-- =========================================
-- 11. GLOBAL AUDIT
-- =========================================


CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) REFERENCES users(id),
    entity_type VARCHAR(100),
    entity_id CHAR(36),
    action VARCHAR(100),
    old_data JSON,
    new_data JSON,
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
-- removed partial index: idx_active_leads
-- For filtering by status + assigned_to (very common CRM query)
CREATE INDEX idx_leads_status_assigned ON leads(status, assigned_to);
CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_sub_status ON leads(sub_status);
CREATE INDEX idx_leads_pan_number ON leads(pan_number);
CREATE UNIQUE INDEX idx_leads_meta_lead_id ON leads(meta_lead_id);
CREATE UNIQUE INDEX idx_leads_lead_code_unique ON leads(lead_code);
CREATE INDEX idx_followups_lead_id ON followups(lead_id);
CREATE INDEX idx_followups_due_open ON followups(followup_date, is_completed);
CREATE INDEX idx_followups_is_schedule_only ON followups(is_schedule_only);
CREATE INDEX idx_followups_lead_cadence_code ON followups(lead_id, cadence_code);
CREATE INDEX idx_lead_activities_lead_user_created
  ON lead_activities(lead_id, user_id, created_at);
ALTER TABLE lead_followup_alert_logs
  MODIFY COLUMN alert_type VARCHAR(50) NOT NULL;
CREATE UNIQUE INDEX uq_lead_followup_alert_logs_unique
  ON lead_followup_alert_logs (followup_id, alert_type, alert_date);
CREATE INDEX idx_lead_followup_alert_logs_alert_date
  ON lead_followup_alert_logs (alert_date);


-- =============================
-- QUOTATIONS INDEXES
-- =============================

CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);
-- removed partial index: uq_quotations_quote_number
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

-- =============================
-- USERS INDEXES (active status)
-- =============================

-- removed partial index: idx_users_active

-- =============================
-- ROLES INDEXES (country)
-- =============================

-- removed partial index: idx_roles_country

-- =============================
-- QUEUED LEADS INDEXES
-- =============================

-- removed partial index: idx_queued_leads_pending
CREATE INDEX idx_queued_leads_lead_id ON queued_leads(lead_id);

-- =============================
-- HIERARCHY & COUNTRY MASTER
-- =============================

CREATE TABLE IF NOT EXISTS countries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    updated_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_countries (
    user_id CHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    country_id CHAR(36) NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_id)
);

ALTER TABLE users
  ADD COLUMN parent_id CHAR(36) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN country_id CHAR(36) REFERENCES countries(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS lead_assignment_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    previous_assignee_id CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    new_assignee_id CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    assigned_by CHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    mode VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_countries_is_active ON countries(is_active);
CREATE INDEX idx_countries_name ON countries(name);
-- removed partial index: uq_user_primary_country
CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_leads_country_id ON leads(country_id);
CREATE INDEX idx_lead_assignment_history_lead_id
  ON lead_assignment_history(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS supplier_payable_settlements (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    payable_id CHAR(36) NOT NULL REFERENCES supplier_payables(id) ON DELETE CASCADE,
    supplier_id CHAR(36) NOT NULL REFERENCES suppliers(id),
    booking_id CHAR(36) REFERENCES bookings(id),
    settlement_amount NUMERIC(12,2) NOT NULL CHECK (settlement_amount > 0),
    payment_mode VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
    settlement_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(120),
    notes TEXT,
    created_by CHAR(36) REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_supplier_payable_settlements_payable_id
  ON supplier_payable_settlements(payable_id);
CREATE INDEX idx_supplier_payable_settlements_supplier_id
  ON supplier_payable_settlements(supplier_id);
CREATE INDEX idx_supplier_payable_settlements_booking_id
  ON supplier_payable_settlements(booking_id);
CREATE INDEX idx_supplier_payable_settlements_settlement_date
  ON supplier_payable_settlements(settlement_date DESC);

INSERT IGNORE INTO countries (code, name)
VALUES
  ('IN', 'India'),
  ('AE', 'UAE')
;
