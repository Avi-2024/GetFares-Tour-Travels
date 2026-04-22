SET time_zone = '+05:30';

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'base_cost') = 0,
  'ALTER TABLE packages ADD COLUMN base_cost DECIMAL(12,2) DEFAULT 0 CHECK (base_cost >= 0)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'markup_percent') = 0,
  'ALTER TABLE packages ADD COLUMN markup_percent DECIMAL(5,2) DEFAULT 0 CHECK (markup_percent >= 0 AND markup_percent <= 100)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'package_kind') = 0,
  'ALTER TABLE packages ADD COLUMN package_kind VARCHAR(20) DEFAULT ''READY'' CHECK (package_kind IN (''READY'', ''CUSTOMIZED''))',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'custom_services') = 0,
  'ALTER TABLE packages ADD COLUMN custom_services JSON DEFAULT (JSON_ARRAY())',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'visa_details') = 0,
  'ALTER TABLE packages ADD COLUMN visa_details TEXT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'payment_terms') = 0,
  'ALTER TABLE packages ADD COLUMN payment_terms TEXT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'package_category') = 0,
  'ALTER TABLE packages ADD COLUMN package_category VARCHAR(30)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'status') = 0,
  'ALTER TABLE packages ADD COLUMN status VARCHAR(20) DEFAULT ''DRAFT'' CHECK (status IN (''DRAFT'', ''ACTIVE'', ''EXPIRED'', ''SOLD_OUT''))',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'keywords') = 0,
  'ALTER TABLE packages ADD COLUMN keywords TEXT',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'website_slug') = 0,
  'ALTER TABLE packages ADD COLUMN website_slug VARCHAR(180) UNIQUE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'packages' AND column_name = 'website_last_synced_at') = 0,
  'ALTER TABLE packages ADD COLUMN website_last_synced_at DATETIME',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'packages' AND index_name = 'idx_packages_published') = 0,
  'CREATE INDEX idx_packages_published ON packages(publish_to_website, is_deleted)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'packages' AND index_name = 'idx_packages_kind') = 0,
  'CREATE INDEX idx_packages_kind ON packages(package_kind)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'packages' AND index_name = 'idx_packages_status') = 0,
  'CREATE INDEX idx_packages_status ON packages(status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'packages') = 1 AND (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'packages' AND index_name = 'idx_packages_website_slug') = 0,
  'CREATE INDEX idx_packages_website_slug ON packages(website_slug)',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
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
);CREATE TABLE IF NOT EXISTS destinations (
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
);CREATE TABLE IF NOT EXISTS campaigns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(150),
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
);CREATE TABLE IF NOT EXISTS leads (
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
);CREATE TABLE IF NOT EXISTS quotations (
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
);CREATE TABLE IF NOT EXISTS bookings (
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
    notes TEXT NULL,
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
    supplier_penalty DECIMAL(12,2) DEFAULT 0 CHECK (supplier_penalty >= 0),
    service_charge DECIMAL(12,2) DEFAULT 0 CHECK (service_charge >= 0),
    status ENUM('INITIATED', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'INITIATED',
    approved_by CHAR(36),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);CREATE TABLE IF NOT EXISTS suppliers (
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
);CREATE TABLE IF NOT EXISTS customers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(150),
    phone VARCHAR(20),
    email VARCHAR(150),
    preferences TEXT,
    lifetime_value DECIMAL(12,2) DEFAULT 0,
    segment ENUM('PLATINUM', 'GOLD', 'SILVER', 'NEW') DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_leads (
    customer_id CHAR(36),
    lead_id CHAR(36),
    is_deleted BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (customer_id, lead_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);CREATE TABLE IF NOT EXISTS complaints (
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
);CREATE TABLE IF NOT EXISTS attendance (
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
);CREATE TABLE IF NOT EXISTS audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    entity_type VARCHAR(100),
    entity_id CHAR(36),
    action VARCHAR(100),
    old_data JSON,
    new_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);CREATE INDEX idx_leads_destination_id ON leads(destination_id);
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
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);CREATE INDEX idx_leads_assigned_at ON leads(assigned_at);
CREATE INDEX idx_leads_sla_breached ON leads(sla_breached);

CREATE INDEX idx_followups_lead_id ON followups(lead_id);
CREATE INDEX idx_followups_due_open ON followups(followup_date, is_completed);

CREATE INDEX idx_lead_activities_lead_user_created
  ON lead_activities(lead_id, user_id, created_at);ALTER TABLE followups
ADD COLUMN is_schedule_only BOOLEAN DEFAULT FALSE;CREATE INDEX idx_followups_is_schedule_only ON followups(is_schedule_only);
CREATE TABLE IF NOT EXISTS quotation_templates (
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
  min_margin_percent DECIMAL(5,2) DEFAULT 0
    CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_by CHAR(36),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

ALTER TABLE quotations
  ADD COLUMN template_id CHAR(36),
  ADD COLUMN template_snapshot JSON,
  ADD COLUMN quote_number VARCHAR(50),
  ADD COLUMN margin_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN min_margin_percent DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN approved_by CHAR(36),
  ADD COLUMN approved_at TIMESTAMP NULL,
  ADD COLUMN approval_note TEXT,
  ADD COLUMN sent_by CHAR(36),
  ADD COLUMN pdf_generated_at TIMESTAMP NULL,
  ADD COLUMN pdf_generated_by CHAR(36),
  ADD COLUMN view_count INT DEFAULT 0,
  ADD COLUMN first_viewed_at TIMESTAMP NULL,
  ADD COLUMN last_viewed_at TIMESTAMP NULL,
  ADD COLUMN expires_at TIMESTAMP NULL,
  ADD COLUMN locked_at TIMESTAMP NULL,
  ADD COLUMN lead_to_quote_minutes INT,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'quotations'
   AND CONSTRAINT_NAME = 'quotations_template_id_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_template_id_fkey FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'quotations'
   AND CONSTRAINT_NAME = 'quotations_approved_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'quotations'
   AND CONSTRAINT_NAME = 'quotations_sent_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @query = IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'quotations'
   AND CONSTRAINT_NAME = 'quotations_pdf_generated_by_fkey') = 0,
  'ALTER TABLE quotations ADD CONSTRAINT quotations_pdf_generated_by_fkey FOREIGN KEY (pdf_generated_by) REFERENCES users(id)',
  'SELECT 1'
);
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_margin_amount_non_negative CHECK (margin_amount >= 0),
  ADD CONSTRAINT chk_quotations_discount_amount_non_negative CHECK (discount_amount >= 0),
  ADD CONSTRAINT chk_quotations_tax_amount_non_negative CHECK (tax_amount >= 0),
  ADD CONSTRAINT chk_quotations_min_margin_percent_range CHECK (min_margin_percent >= 0 AND min_margin_percent <= 100);

UPDATE quotations
SET view_count = 0
WHERE view_count IS NULL;

CREATE TABLE IF NOT EXISTS quotation_version_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  version_number INT NOT NULL,
  editor_id CHAR(36),
  action VARCHAR(60) NOT NULL,
  change_log JSON,
  snapshot JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (editor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotation_send_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  sent_by CHAR(36),
  delivery_channel VARCHAR(30) DEFAULT 'MANUAL',
  recipient_email VARCHAR(150),
  recipient_phone VARCHAR(25),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (sent_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS quotation_reminder_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quotation_id CHAR(36) NOT NULL,
  reminder_type VARCHAR(60) NOT NULL,
  triggered_by CHAR(36),
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSON,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (triggered_by) REFERENCES users(id)
);

ALTER TABLE quotation_views
  ADD COLUMN device_info TEXT,
  ADD COLUMN user_agent TEXT;

CREATE UNIQUE INDEX uq_quotations_quote_number
  ON quotations (quote_number);

CREATE INDEX idx_quotations_template_id
  ON quotations (template_id);

CREATE INDEX idx_quotations_requires_approval
  ON quotations (requires_approval);

CREATE INDEX idx_quotations_status_expires
  ON quotations (status, expires_at);

CREATE INDEX idx_quotation_version_logs_quote
  ON quotation_version_logs (quotation_id, version_number DESC);

CREATE INDEX idx_quotation_send_logs_quote_sent_at
  ON quotation_send_logs (quotation_id, sent_at DESC);

CREATE INDEX idx_quotation_reminders_quote_type
  ON quotation_reminder_logs (quotation_id, reminder_type);

CREATE INDEX idx_quotation_views_quote_viewed
  ON quotation_views (quotation_id, viewed_at DESC);

CREATE INDEX idx_quotation_templates_active_type
  ON quotation_templates (is_active, template_type);CREATE TABLE IF NOT EXISTS notification_events (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    event_name VARCHAR(150) NOT NULL,
    channel VARCHAR(30) NOT NULL DEFAULT 'SOCKET_IO',
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    title VARCHAR(200),
    message TEXT,
    payload JSON NOT NULL DEFAULT (JSON_OBJECT()),
    recipient_user_id CHAR(36),
    recipient_role VARCHAR(100),
    recipient_team_id CHAR(36),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING', 'DELIVERED', 'READ', 'FAILED')),
    delivery_attempts INT NOT NULL DEFAULT 0 CHECK (delivery_attempts >= 0),
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_notification_events_recipient_user
  ON notification_events (recipient_user_id, status, created_at DESC);

CREATE INDEX idx_notification_events_recipient_role
  ON notification_events (recipient_role, status, created_at DESC);

CREATE INDEX idx_notification_events_recipient_team
  ON notification_events (recipient_team_id, status, created_at DESC);

CREATE INDEX idx_notification_events_event_name
  ON notification_events (event_name, created_at DESC);

CREATE INDEX idx_notification_events_status
  ON notification_events (status, created_at DESC);

UPDATE followups
SET is_schedule_only = TRUE
WHERE is_schedule_only IS NULL OR is_schedule_only = FALSE;ALTER TABLE leads
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN address_line TEXT,
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR';ALTER TABLE customers
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN address_line TEXT,
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR';ALTER TABLE suppliers
  ADD COLUMN pan_number VARCHAR(20),
  ADD COLUMN gst_number VARCHAR(30),
  ADD COLUMN address_line TEXT,
  ADD COLUMN invoice_beneficiary_name VARCHAR(200),
  ADD COLUMN invoice_bank_name VARCHAR(200),
  ADD COLUMN invoice_account_number VARCHAR(100),
  ADD COLUMN invoice_ifsc_swift VARCHAR(40),
  ADD COLUMN invoice_upi_id VARCHAR(100),
  ADD COLUMN supplier_currency VARCHAR(10) DEFAULT 'INR';ALTER TABLE quotations
  ADD COLUMN supplier_cost DECIMAL(12,2) DEFAULT 0 CHECK (supplier_cost >= 0),
  ADD COLUMN supplier_tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (supplier_tax_amount >= 0),
  ADD COLUMN markup_amount DECIMAL(12,2) DEFAULT 0 CHECK (markup_amount >= 0),
  ADD COLUMN service_fee_amount DECIMAL(12,2) DEFAULT 0 CHECK (service_fee_amount >= 0),
  ADD COLUMN gst_amount DECIMAL(12,2) DEFAULT 0 CHECK (gst_amount >= 0),
  ADD COLUMN tcs_amount DECIMAL(12,2) DEFAULT 0 CHECK (tcs_amount >= 0),
  ADD COLUMN total_sale_value DECIMAL(12,2) DEFAULT 0 CHECK (total_sale_value >= 0),
  ADD COLUMN cost_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN client_currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN supplier_currency VARCHAR(10) DEFAULT 'INR';ALTER TABLE payments
  ADD CONSTRAINT payments_mode_allowed
  CHECK (
    UPPER(payment_mode) IN (
      'CASH',
      'BANK_TRANSFER',
      'PAYMENT_GATEWAY'
    )
  );CREATE INDEX idx_leads_pan_number ON leads(pan_number);
CREATE INDEX idx_customers_pan_number ON customers(pan_number);
CREATE INDEX idx_suppliers_pan_number ON suppliers(pan_number);
CREATE INDEX idx_quotations_total_sale_value ON quotations(total_sale_value);
CREATE INDEX idx_payments_mode ON payments(payment_mode);
SET time_zone = '+05:30';
ALTER TABLE leads MODIFY COLUMN status ENUM('OPEN', 'CONTACTED', 'WIP', 'QUOTED', 'FOLLOW_UP', 'CONVERTED', 'LOST', 'NON_RESPONSIVE') DEFAULT 'OPEN';

ALTER TABLE leads
  ADD COLUMN nationality VARCHAR(80),
  ADD COLUMN adults_count INT DEFAULT 1 CHECK (adults_count >= 0),
  ADD COLUMN children_count INT DEFAULT 0 CHECK (children_count >= 0),
  ADD COLUMN visa_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN lead_type VARCHAR(20) DEFAULT 'HOLIDAY',
  ADD COLUMN travel_purpose VARCHAR(50),
  ADD COLUMN sub_status VARCHAR(60),
  ADD COLUMN temperature VARCHAR(10) DEFAULT 'COLD',
  ADD COLUMN followup_attempts INT DEFAULT 0 CHECK (followup_attempts >= 0),
  ADD COLUMN final_reminder_at TIMESTAMP NULL,
  ADD COLUMN non_responsive_marked_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS supplier_payables (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36),
  supplier_id CHAR(36),
  payable_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  due_date DATE,
  status ENUM('PENDING','PARTIAL','PAID') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS tax_ledger (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36),
  tax_type VARCHAR(50),
  amount DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  base_currency VARCHAR(10),
  target_currency VARCHAR(10),
  rate DECIMAL(14,6),
  effective_date DATE
);

CREATE TABLE IF NOT EXISTS booking_documents (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  uploaded_by CHAR(36),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_by CHAR(36),
  verified_at TIMESTAMP NULL,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

ALTER TABLE suppliers
  ADD COLUMN country VARCHAR(100),
  ADD COLUMN contract_url TEXT,
  ADD COLUMN rate_valid_until DATE,
  ADD COLUMN production_commitment TEXT,
  ADD COLUMN payment_deadline_date DATE,
  ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE supplier_payables
  ADD COLUMN payment_reference VARCHAR(100),
  ADD COLUMN last_paid_at TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS packages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(200) NOT NULL,
  destination VARCHAR(120) NOT NULL,
  duration VARCHAR(30),
  starting_price DECIMAL(12,2) DEFAULT 0 CHECK (starting_price >= 0),
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
  publish_to_website BOOLEAN DEFAULT FALSE,
  website_slug VARCHAR(180) UNIQUE,
  website_last_synced_at TIMESTAMP NULL,
  is_sold_out BOOLEAN DEFAULT FALSE,
  created_by CHAR(36),
  updated_by CHAR(36),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS package_enquiries (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  package_id CHAR(36),
  lead_id CHAR(36),
  package_name VARCHAR(200),
  travel_date DATE,
  travellers_count INT DEFAULT 1 CHECK (travellers_count > 0),
  full_name VARCHAR(150),
  phone VARCHAR(20),
  email VARCHAR(150),
  source VARCHAR(120) DEFAULT 'Website - Package Page',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
);

CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_sub_status ON leads(sub_status);
CREATE INDEX idx_booking_documents_booking_id ON booking_documents(booking_id);
CREATE INDEX idx_supplier_payables_supplier_id ON supplier_payables(supplier_id);
CREATE INDEX idx_supplier_payables_status ON supplier_payables(status);
CREATE INDEX idx_packages_status_publish ON packages(status, publish_to_website);
CREATE INDEX idx_package_enquiries_package_id ON package_enquiries(package_id);ALTER TABLE leads
  ADD COLUMN meta_lead_id VARCHAR(120);

CREATE UNIQUE INDEX idx_leads_meta_lead_id ON leads(meta_lead_id);CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `key` VARCHAR(80) NOT NULL UNIQUE,
  value JSON NOT NULL DEFAULT (JSON_OBJECT()),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_app_settings_key ON app_settings(`key`);

INSERT INTO app_settings (`key`, value)
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
ON DUPLICATE KEY UPDATE `key` = `key`;ALTER TABLE roles
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE permissions
  ADD COLUMN `key` VARCHAR(120),
  ADD COLUMN description TEXT,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE permissions
SET `key` = name
WHERE `key` IS NULL;

ALTER TABLE permissions
  MODIFY COLUMN `key` VARCHAR(120) NOT NULL;

CREATE UNIQUE INDEX uq_permissions_key ON permissions(`key`);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);

ALTER TABLE role_permissions
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX idx_role_permissions_role_active
  ON role_permissions(role_id, is_active);

CREATE INDEX idx_role_permissions_permission_active
  ON role_permissions(permission_id, is_active);
ALTER TABLE quotations
  ADD COLUMN important_notes TEXT;

ALTER TABLE quotations
  ADD COLUMN lead_to_quote_sent_minutes INT;

ALTER TABLE quotations
  ADD COLUMN response_category VARCHAR(30);

ALTER TABLE quotations
  ADD COLUMN response_sla_minutes INT;

ALTER TABLE quotations
  ADD COLUMN response_sla_breached BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_response_category
  CHECK (
    response_category IS NULL OR
    response_category IN ('READY_PACKAGE', 'CUSTOMIZED', 'COMPLEX_ITINERARY')
  );

ALTER TABLE quotations
  ADD CONSTRAINT chk_quotations_response_sla_minutes
  CHECK (response_sla_minutes IS NULL OR response_sla_minutes > 0);

UPDATE quotations
SET response_category = CASE
  WHEN response_category IS NOT NULL THEN response_category
  WHEN JSON_UNQUOTE(JSON_EXTRACT(template_snapshot, '$.templateType')) = 'READY_PACKAGE' THEN 'READY_PACKAGE'
  WHEN JSON_UNQUOTE(JSON_EXTRACT(template_snapshot, '$.templateType')) = 'CUSTOM_ITINERARY' THEN 'CUSTOMIZED'
  ELSE 'CUSTOMIZED'
END
WHERE response_category IS NULL;

UPDATE quotations
SET response_sla_minutes = CASE response_category
  WHEN 'READY_PACKAGE' THEN 30
  WHEN 'COMPLEX_ITINERARY' THEN 360
  ELSE 120
END
WHERE response_sla_minutes IS NULL;

UPDATE quotations
SET response_sla_breached = CASE
  WHEN lead_to_quote_sent_minutes IS NULL OR response_sla_minutes IS NULL THEN FALSE
  WHEN lead_to_quote_sent_minutes > response_sla_minutes THEN TRUE
  ELSE FALSE
END;

CREATE INDEX idx_quotations_response_category
  ON quotations(response_category);

CREATE INDEX idx_quotations_response_sla_breached
  ON quotations(response_sla_breached, sent_at DESC);
ALTER TABLE leads
  ADD COLUMN preferred_hotel_category VARCHAR(20);

ALTER TABLE followups
  ADD COLUMN cadence_code VARCHAR(50);

CREATE INDEX idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

ALTER TABLE packages
  ADD COLUMN base_cost DECIMAL(12,2) DEFAULT 0 CHECK (base_cost >= 0),
  ADD COLUMN markup_percent DECIMAL(5,2) DEFAULT 0 CHECK (markup_percent >= 0 AND markup_percent <= 100);

ALTER TABLE bookings
  ADD COLUMN supplier_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN dmc_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN hotel_segments JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN flight_segments JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN insurance_details JSON DEFAULT (JSON_OBJECT()),
  ADD COLUMN other_services JSON DEFAULT (JSON_ARRAY()),
  ADD COLUMN blocking_deadline_at TIMESTAMP NULL,
  ADD COLUMN supplier_payment_deadline_at TIMESTAMP NULL,
  ADD COLUMN cancellation_deadline_at TIMESTAMP NULL,
  ADD COLUMN balance_due_by TIMESTAMP NULL,
  ADD COLUMN deadline_risk_level VARCHAR(20) DEFAULT 'SAFE',
  ADD COLUMN deadline_last_evaluated_at TIMESTAMP NULL;

ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_deadline_risk_level
  CHECK (deadline_risk_level IN ('SAFE', 'D2_DUE', 'DEADLINE_DUE', 'OVERDUE'));

CREATE INDEX idx_bookings_supplier_deadline
  ON bookings (supplier_payment_deadline_at);

CREATE INDEX idx_bookings_cancellation_deadline
  ON bookings (cancellation_deadline_at);

CREATE INDEX idx_bookings_deadline_risk_level
  ON bookings (deadline_risk_level);

CREATE TABLE IF NOT EXISTS booking_reminder_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  reminder_type VARCHAR(60) NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_booking_reminder_logs_booking_type_date
  ON booking_reminder_logs (booking_id, reminder_type, scheduled_for);

CREATE INDEX idx_booking_reminder_logs_scheduled_for
  ON booking_reminder_logs (scheduled_for);

CREATE TABLE IF NOT EXISTS booking_deadline_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  alert_type VARCHAR(80) NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_booking_deadline_alert_logs_unique
  ON booking_deadline_alert_logs (booking_id, alert_type, alert_date);

CREATE INDEX idx_booking_deadline_alert_logs_alert_date
  ON booking_deadline_alert_logs (alert_date);

CREATE TABLE IF NOT EXISTS supplier_payable_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payable_id CHAR(36) NOT NULL,
  alert_type VARCHAR(80) NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (payable_id) REFERENCES supplier_payables(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_supplier_payable_alert_logs_unique
  ON supplier_payable_alert_logs (payable_id, alert_type, alert_date);

CREATE INDEX idx_supplier_payable_alert_logs_alert_date
  ON supplier_payable_alert_logs (alert_date);

CREATE INDEX idx_supplier_payables_due_date
  ON supplier_payables (due_date);

CREATE TABLE IF NOT EXISTS automation_job_runs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_name VARCHAR(120) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
  records_processed INT NOT NULL DEFAULT 0,
  details JSON DEFAULT (JSON_OBJECT()),
  lock_owner VARCHAR(120),
  error_message TEXT
);

ALTER TABLE automation_job_runs
  ADD CONSTRAINT chk_automation_job_runs_status
  CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED'));

CREATE INDEX idx_automation_job_runs_job_started
  ON automation_job_runs (job_name, started_at DESC);CREATE TABLE IF NOT EXISTS lead_followup_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  followup_id CHAR(36) NOT NULL,
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_lead_followup_alert_logs_unique
  ON lead_followup_alert_logs (followup_id, alert_type(100), alert_date);

CREATE INDEX idx_lead_followup_alert_logs_alert_date
  ON lead_followup_alert_logs (alert_date);ALTER TABLE visa_cases
  ADD COLUMN workflow_stage VARCHAR(50),
  ADD COLUMN delivered_at DATE,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

UPDATE visa_cases
SET workflow_stage = CASE COALESCE(status, 'DOCUMENT_PENDING')
  WHEN 'DOCUMENT_PENDING' THEN 'DOCUMENT_COLLECTION'
  WHEN 'SUBMITTED' THEN CASE
    WHEN appointment_date IS NOT NULL THEN 'BIOMETRICS_SCHEDULED'
    WHEN submission_date IS NOT NULL THEN 'APPLICATION_SUBMITTED'
    ELSE 'UNDER_PROCESS'
  END
  WHEN 'APPROVED' THEN 'APPROVED'
  WHEN 'REJECTED' THEN 'REJECTED'
  ELSE 'DOCUMENT_COLLECTION'
END
WHERE workflow_stage IS NULL;

UPDATE visa_cases
SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE updated_at IS NULL;

ALTER TABLE visa_cases
  MODIFY COLUMN workflow_stage VARCHAR(50) DEFAULT 'DOCUMENT_COLLECTION';

CREATE INDEX idx_visa_cases_workflow_stage
  ON visa_cases (workflow_stage);

CREATE INDEX idx_visa_cases_appointment_date
  ON visa_cases (appointment_date);

CREATE INDEX idx_visa_cases_visa_valid_until
  ON visa_cases (visa_valid_until);UPDATE leads
SET sla_breached = (response_at > response_deadline)
WHERE response_at IS NOT NULL
  AND response_deadline IS NOT NULL
  AND sla_breached != (response_at > response_deadline);
ALTER TABLE users
ADD COLUMN active BOOLEAN DEFAULT TRUE;

UPDATE users
SET active = TRUE
WHERE active IS NULL;

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

CREATE INDEX idx_users_active
  ON users(active, is_active);

CREATE INDEX idx_queued_leads_pending
  ON queued_leads(queued_at ASC, processed_at);

CREATE INDEX idx_queued_leads_lead_id
  ON queued_leads(lead_id);
ALTER TABLE roles ADD COLUMN country VARCHAR(100);

CREATE INDEX idx_roles_country
  ON roles(country);
ALTER TABLE leads ADD COLUMN child_ages JSON;
ALTER TABLE users ADD COLUMN agent_country VARCHAR(100);
ALTER TABLE users ADD COLUMN agent_type VARCHAR(50);

CREATE INDEX idx_users_agent_country
  ON users(agent_country);

CREATE INDEX idx_users_agent_type
  ON users(agent_type);
ALTER TABLE leads ADD COLUMN calls_disabled BOOLEAN DEFAULT FALSE;ALTER TABLE packages ADD COLUMN package_kind VARCHAR(20) DEFAULT 'READY';ALTER TABLE packages ADD COLUMN custom_services JSON DEFAULT (JSON_ARRAY());ALTER TABLE packages ADD COLUMN visa_details TEXT;
ALTER TABLE packages ADD COLUMN payment_terms TEXT;

CREATE INDEX idx_packages_kind ON packages(package_kind, is_deleted);ALTER TABLE quotations
  ADD COLUMN source_package_id CHAR(36),
  ADD COLUMN quotation_title VARCHAR(200),
  ADD COLUMN trip_destination VARCHAR(200),
  ADD COLUMN duration_nights INT CHECK (duration_nights >= 0),
  ADD COLUMN duration_days INT CHECK (duration_days >= 0),
  ADD COLUMN duration_label VARCHAR(50),
  ADD COLUMN travel_start_date DATE,
  ADD COLUMN itinerary JSON,
  ADD COLUMN inclusions TEXT,
  ADD COLUMN exclusions TEXT,
  ADD COLUMN hotel_details TEXT,
  ADD COLUMN visa_details TEXT,
  ADD COLUMN payment_terms TEXT,
  ADD COLUMN cancellation_policy TEXT;

ALTER TABLE quotations
  ADD CONSTRAINT fk_quotations_source_package
  FOREIGN KEY (source_package_id) REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE users
  ADD COLUMN manager_id CHAR(36);

ALTER TABLE users
  ADD CONSTRAINT fk_users_manager
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE TABLE IF NOT EXISTS countries (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by CHAR(36),
    updated_by CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_countries_is_active ON countries(is_active);
CREATE INDEX idx_countries_name ON countries(name);

CREATE TABLE IF NOT EXISTS user_countries (
    user_id CHAR(36) NOT NULL,
    country_id CHAR(36) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_by CHAR(36),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, country_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_user_primary_country
  ON user_countries(user_id, is_primary);

ALTER TABLE users
  ADD COLUMN parent_id CHAR(36);

ALTER TABLE users
  ADD CONSTRAINT fk_users_parent
  FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE leads
  ADD COLUMN country_id CHAR(36);

ALTER TABLE leads
  ADD CONSTRAINT fk_leads_country
  FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE SET NULL;

CREATE INDEX idx_users_parent_id ON users(parent_id);
CREATE INDEX idx_leads_country_id ON leads(country_id);

CREATE TABLE IF NOT EXISTS lead_assignment_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    lead_id CHAR(36) NOT NULL,
    previous_assignee_id CHAR(36),
    new_assignee_id CHAR(36),
    assigned_by CHAR(36),
    mode VARCHAR(50),
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (previous_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (new_assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_lead_assignment_history_lead_id
  ON lead_assignment_history(lead_id, created_at DESC);
CREATE INDEX idx_lead_assignment_history_new_assignee
  ON lead_assignment_history(new_assignee_id, created_at DESC);INSERT INTO countries (code, name)
VALUES
  ('IN', 'India'),
  ('AE', 'UAE')
ON DUPLICATE KEY UPDATE code = code;UPDATE users
SET parent_id = manager_id
WHERE parent_id IS NULL
  AND manager_id IS NOT NULL;UPDATE leads l
JOIN countries c ON LOWER(TRIM(l.lead_country)) = LOWER(TRIM(c.name))
SET l.country_id = c.id
WHERE l.country_id IS NULL
  AND l.lead_country IS NOT NULL;INSERT INTO user_countries (user_id, country_id, is_primary)
SELECT u.id, c.id, TRUE
FROM users u
JOIN countries c ON LOWER(TRIM(u.agent_country)) = LOWER(TRIM(c.name))
ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary);

CREATE INDEX idx_leads_active_created_at_desc
  ON leads(created_at DESC, is_deleted);

CREATE INDEX idx_leads_country_lower
  ON leads(lead_country);ALTER TABLE leads ADD FULLTEXT INDEX idx_leads_full_name_ft (full_name);
ALTER TABLE leads ADD FULLTEXT INDEX idx_leads_email_ft (email);

ALTER TABLE customers ADD FULLTEXT INDEX idx_customers_full_name_ft (full_name);
ALTER TABLE customers ADD FULLTEXT INDEX idx_customers_email_ft (email);CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_customers_phone ON customers(phone);
ALTER TABLE bookings ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;CREATE INDEX idx_bookings_is_approved ON bookings(is_approved);CREATE TABLE IF NOT EXISTS token_blacklist (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id CHAR(36),
    expires_at TIMESTAMP NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(100) DEFAULT 'USER_LOGOUT',
    ip_address VARCHAR(50),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);CREATE INDEX idx_token_blacklist_jti ON token_blacklist(token_jti);CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);CREATE INDEX idx_token_blacklist_cleanup
    ON token_blacklist(expires_at);CREATE INDEX idx_token_blacklist_user ON token_blacklist(user_id);

CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  `key` VARCHAR(80) NOT NULL UNIQUE,
  value JSON NOT NULL DEFAULT (JSON_OBJECT()),
  updated_by CHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_settings_key ON app_settings(`key`);

INSERT INTO app_settings (`key`, value)
VALUES (
  'system',
  JSON_OBJECT(
    'companyName', 'Get2Vacation Travel CRM',
    'supportEmail', 'support@Get2Vacation.com',
    'supportPhone', '',
    'timezone', 'Asia/Kolkata',
    'locale', 'en-IN',
    'currency', 'INR',
    'dateFormat', 'DD/MM/YYYY',
    'websiteUrl', ''
  )
)
ON DUPLICATE KEY UPDATE `key` = `key`;

UPDATE app_settings
SET
  value = JSON_MERGE_PATCH(
    COALESCE(value, JSON_OBJECT()),
    JSON_OBJECT(
      'timezone', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.timezone')), ''), 'Asia/Kolkata'),
      'locale', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.locale')), ''), 'en-IN'),
      'dateFormat', COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(value, '$.dateFormat')), ''), 'DD/MM/YYYY')
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE `key` = 'system';
START TRANSACTION;

ALTER TABLE followups
  ADD COLUMN cadence_code VARCHAR(50);

ALTER TABLE followups
  ADD COLUMN is_schedule_only BOOLEAN DEFAULT FALSE;

UPDATE followups
SET is_schedule_only = FALSE
WHERE is_schedule_only IS NULL;

CREATE INDEX idx_followups_lead_cadence_code
  ON followups(lead_id, cadence_code);

CREATE INDEX idx_followups_is_schedule_only
  ON followups(is_schedule_only);

CREATE TABLE IF NOT EXISTS lead_followup_alert_logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  followup_id CHAR(36) NOT NULL,
  alert_type TEXT NOT NULL,
  alert_date DATE NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  FOREIGN KEY (followup_id) REFERENCES followups(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX uq_lead_followup_alert_logs_unique
  ON lead_followup_alert_logs (followup_id, alert_type(100), alert_date);

CREATE INDEX idx_lead_followup_alert_logs_alert_date
  ON lead_followup_alert_logs (alert_date);

COMMIT;

--START TRANSACTION;

ALTER TABLE followups
  ADD COLUMN status_snapshot VARCHAR(60);

ALTER TABLE followups
  ADD COLUMN counts_toward_compliance BOOLEAN DEFAULT TRUE;

UPDATE followups
SET counts_toward_compliance = TRUE
WHERE counts_toward_compliance IS NULL;

COMMIT;START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN travel_from VARCHAR(150),
  ADD COLUMN travel_to VARCHAR(150);

UPDATE leads l
JOIN destinations d ON l.destination_id = d.id
SET l.travel_to = d.name
WHERE l.travel_to IS NULL OR TRIM(l.travel_to) = '';

CREATE INDEX idx_leads_travel_to ON leads (travel_to);
CREATE INDEX idx_leads_travel_from ON leads (travel_from);

COMMIT;START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN travel_end_date DATE;

ALTER TABLE leads
  ADD CONSTRAINT chk_leads_travel_date_range
  CHECK (
    travel_end_date IS NULL
    OR travel_date IS NULL
    OR travel_end_date >= travel_date
  );

CREATE INDEX idx_leads_travel_end_date ON leads (travel_end_date);

COMMIT;START TRANSACTION;

ALTER TABLE leads
  ADD COLUMN lead_code VARCHAR(20);

SET @rownum := 0;
UPDATE leads l
JOIN (
  SELECT id, (@rownum := @rownum + 1) AS rn
  FROM leads
  WHERE lead_code IS NULL OR lead_code NOT REGEXP '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$'
  ORDER BY created_at, id
) seq ON seq.id = l.id
SET l.lead_code = CONCAT(
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 6760), 26)),
  MOD(FLOOR((seq.rn - 1) / 676), 10),
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 260), 26)),
  MOD(FLOOR((seq.rn - 1) / 26), 10),
  CHAR(65 + MOD(FLOOR((seq.rn - 1) / 10), 26)),
  MOD((seq.rn - 1), 10)
);

ALTER TABLE leads
  ADD CONSTRAINT chk_leads_lead_code_format
  CHECK (lead_code REGEXP '^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$');

CREATE UNIQUE INDEX idx_leads_lead_code_unique
  ON leads(lead_code);

ALTER TABLE leads
  MODIFY COLUMN lead_code VARCHAR(20) NOT NULL;

COMMIT;START TRANSACTION;

CREATE TABLE IF NOT EXISTS supplier_payable_settlements (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  payable_id CHAR(36) NOT NULL,
  supplier_id CHAR(36) NOT NULL,
  booking_id CHAR(36),
  settlement_amount DECIMAL(12,2) NOT NULL CHECK (settlement_amount > 0),
  payment_mode VARCHAR(30) NOT NULL DEFAULT 'BANK_TRANSFER',
  settlement_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference VARCHAR(120),
  notes TEXT,
  created_by CHAR(36),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payable_id) REFERENCES supplier_payables(id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_supplier_payable_settlements_payable_id
  ON supplier_payable_settlements(payable_id);

CREATE INDEX idx_supplier_payable_settlements_supplier_id
  ON supplier_payable_settlements(supplier_id);

CREATE INDEX idx_supplier_payable_settlements_booking_id
  ON supplier_payable_settlements(booking_id);

CREATE INDEX idx_supplier_payable_settlements_settlement_date
  ON supplier_payable_settlements(settlement_date DESC);

COMMIT;START TRANSACTION;

ALTER TABLE payments
  ADD COLUMN invoice_url TEXT;

COMMIT;
