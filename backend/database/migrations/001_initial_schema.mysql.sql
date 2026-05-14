-- =========================================
-- 1. AUTHENTICATION & RBAC TABLES (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS roles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id CHAR(36),
    permission_id CHAR(36),
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    role_id CHAR(36),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_on_leave BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    failed_login_attempts INT DEFAULT 0 CHECK (failed_login_attempts >= 0),
    account_locked_until TIMESTAMP NULL,
    expertise_destinations JSON,
    target_amount DECIMAL(12,2) CHECK (target_amount >= 0),
    incentive_percent DECIMAL(5,2) CHECK (incentive_percent >= 0 AND incentive_percent <= 100),
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS login_audit (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    ip_address VARCHAR(50),
    device_info TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================
-- 2. DESTINATION & PRICING (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS destinations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(150) UNIQUE NOT NULL,
    country VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS destination_pricing (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    destination_id CHAR(36),
    base_cost DECIMAL(12,2) NOT NULL,
    min_profit_percent DECIMAL(5,2) NOT NULL,
    recommended_profit_percent DECIMAL(5,2),
    tax_percent DECIMAL(5,2) DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (valid_from <= valid_to)
);

-- =========================================
-- 3. MARKETING (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS campaigns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(150),
    country VARCHAR(100),
    source VARCHAR(100),
    budget DECIMAL(12,2),
    actual_spend DECIMAL(12,2) DEFAULT 0,
    leads_generated INT DEFAULT 0,
    revenue_generated DECIMAL(12,2) DEFAULT 0,
    meta_campaign_id VARCHAR(100),
    meta_adset_id VARCHAR(100),
    meta_ad_id VARCHAR(100),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- 4. LEAD MANAGEMENT (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS leads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(150),
    destination_id CHAR(36),
    travel_date DATE,
    budget DECIMAL(12,2) CHECK (budget >= 0),
    source VARCHAR(100),
    campaign_id CHAR(36),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    lead_score INT DEFAULT 0 CHECK (lead_score >= 0),
    priority_level INT DEFAULT 0 CHECK (priority_level >= 0),
    is_vip BOOLEAN DEFAULT FALSE,
    status ENUM('OPEN', 'CONTACTED', 'WIP', 'QUOTED', 'FOLLOW_UP', 'CONVERTED', 'LOST') DEFAULT 'OPEN',
    assigned_to CHAR(36),
    assigned_at TIMESTAMP NULL,
    response_deadline TIMESTAMP NULL,
    response_at TIMESTAMP NULL,
    sla_breached BOOLEAN DEFAULT FALSE,
    reassignment_count INT DEFAULT 0 CHECK (reassignment_count >= 0),
    qualification_completed BOOLEAN DEFAULT FALSE,
    closed_reason TEXT,
    next_followup_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE SET NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS queued_leads (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL,
    reason VARCHAR(100),
    queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE (lead_id),
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lead_activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36),
    user_id CHAR(36),
    activity_type VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS followups (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36),
    user_id CHAR(36),
    followup_type VARCHAR(50),
    followup_date TIMESTAMP,
    notes TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================
-- 5. QUOTATION (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS quotations (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_quote_id CHAR(36),
    lead_id CHAR(36),
    created_by CHAR(36),
    pricing_id CHAR(36),
    total_cost DECIMAL(12,2) CHECK (total_cost >= 0),
    margin_percent DECIMAL(5,2) CHECK (margin_percent >= 0 AND margin_percent <= 100),
    discount DECIMAL(12,2) DEFAULT 0 CHECK (discount >= 0),
    tax DECIMAL(12,2) DEFAULT 0 CHECK (tax >= 0),
    final_price DECIMAL(12,2) CHECK (final_price >= 0),
    version_number INT DEFAULT 1 CHECK (version_number > 0),
    status ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED') DEFAULT 'DRAFT',
    pdf_url TEXT,
    sent_at TIMESTAMP NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_quote_id) REFERENCES quotations(id) ON DELETE SET NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (pricing_id) REFERENCES destination_pricing(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36),
    item_type VARCHAR(50),
    description TEXT,
    cost DECIMAL(12,2),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quotation_views (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id)
);

-- =========================================
-- 6. BOOKING & PAYMENT (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS bookings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    quotation_id CHAR(36) NOT NULL,
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    travel_start_date DATE NOT NULL,
    travel_end_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    cost_amount DECIMAL(12,2) NOT NULL CHECK (cost_amount >= 0),
    profit_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - cost_amount) STORED,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    payment_status ENUM('PENDING', 'PARTIAL', 'FULL', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    advance_required DECIMAL(12,2) DEFAULT 0 CHECK (advance_required >= 0),
    advance_received DECIMAL(12,2) DEFAULT 0 CHECK (advance_received >= 0),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP NULL,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT chk_travel_dates CHECK (travel_start_date <= travel_end_date)
);

CREATE TABLE IF NOT EXISTS payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR',
    payment_mode VARCHAR(50) NOT NULL,
    gateway_provider VARCHAR(50),
    gateway_order_id VARCHAR(150),
    gateway_payment_id VARCHAR(150),
    gateway_signature TEXT,
    payment_reference VARCHAR(100),
    proof_url TEXT,
    status ENUM('PENDING', 'PARTIAL', 'FULL', 'REFUNDED') DEFAULT 'PENDING',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by CHAR(36),
    verified_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invoices (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    invoice_number VARCHAR(50),
    pdf_url TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS refunds (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36) NOT NULL,
    payment_id CHAR(36),
    refund_amount DECIMAL(12,2) NOT NULL CHECK (refund_amount > 0),
    gateway_refund_id VARCHAR(150),
    proof_url TEXT,
    notes TEXT,
    supplier_penalty DECIMAL(12,2) DEFAULT 0 CHECK (supplier_penalty >= 0),
    service_charge DECIMAL(12,2) DEFAULT 0 CHECK (service_charge >= 0),
    status ENUM('INITIATED', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'INITIATED',
    approved_by CHAR(36),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- =========================================
-- 7. VISA MODULE (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS suppliers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(150),
    contact_person VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visa_cases (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36),
    supplier_id CHAR(36),
    country VARCHAR(100),
    visa_type VARCHAR(100),
    visa_number VARCHAR(100),
    fees DECIMAL(12,2),
    appointment_date DATE,
    submission_date DATE,
    status ENUM('DOCUMENT_PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED') DEFAULT 'DOCUMENT_PENDING',
    rejection_reason TEXT,
    visa_valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS visa_documents (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    visa_case_id CHAR(36),
    document_type VARCHAR(100),
    file_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visa_case_id) REFERENCES visa_cases(id)
);

CREATE TABLE IF NOT EXISTS documentation_checklist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36),
    passport_verified BOOLEAN DEFAULT FALSE,
    visa_verified BOOLEAN DEFAULT FALSE,
    insurance_verified BOOLEAN DEFAULT FALSE,
    ticket_verified BOOLEAN DEFAULT FALSE,
    hotel_verified BOOLEAN DEFAULT FALSE,
    transfer_verified BOOLEAN DEFAULT FALSE,
    tour_verified BOOLEAN DEFAULT FALSE,
    final_itinerary_uploaded BOOLEAN DEFAULT FALSE,
    travel_ready BOOLEAN DEFAULT FALSE,
    verified_by CHAR(36),
    verified_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- =========================================
-- 8. CUSTOMER MANAGEMENT (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS customers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    preferences TEXT,
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    segment ENUM('PLATINUM', 'GOLD', 'SILVER', 'NEW') DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_customers_is_deleted ON customers(is_deleted);
CREATE INDEX idx_customers_is_deleted_segment ON customers(is_deleted, segment);

CREATE TABLE IF NOT EXISTS customer_leads (
    customer_id CHAR(36),
    lead_id CHAR(36),
    is_deleted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (customer_id, lead_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- =========================================
-- 9. OPERATIONS (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS complaints (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    booking_id CHAR(36),
    assigned_to CHAR(36),
    issue_type VARCHAR(150),
    description TEXT,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaint_activities (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    complaint_id CHAR(36),
    user_id CHAR(36),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (complaint_id) REFERENCES complaints(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================
-- 10. EMPLOYEE MANAGEMENT (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS attendance (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    check_in TIMESTAMP NULL,
    check_out TIMESTAMP NULL,
    date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS leaves (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    start_date DATE,
    end_date DATE,
    reason TEXT,
    status VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================
-- 11. GLOBAL AUDIT (MySQL)
-- =========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    entity_type VARCHAR(100),
    entity_id CHAR(36),
    action VARCHAR(100),
    old_data JSON,
    new_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =========================================
-- 12. INDEXES (MySQL)
-- =========================================

CREATE INDEX idx_leads_destination_id ON leads(destination_id);
CREATE INDEX idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_response_deadline ON leads(response_deadline);
CREATE INDEX idx_leads_status_assigned ON leads(status, assigned_to);
CREATE INDEX idx_quotations_lead_id ON quotations(lead_id);
CREATE INDEX idx_quotations_status ON quotations(status);
CREATE INDEX idx_quotations_created_at ON quotations(created_at);
CREATE INDEX idx_bookings_quotation_id ON bookings(quotation_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
CREATE INDEX idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX idx_refunds_booking_id ON refunds(booking_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX idx_visa_cases_booking_id ON visa_cases(booking_id);
CREATE INDEX idx_visa_cases_status ON visa_cases(status);
CREATE INDEX idx_campaigns_source ON campaigns(source);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
