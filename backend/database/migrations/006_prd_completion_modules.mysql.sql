-- PRD completion migration (MySQL)
-- Adds missing entities and fields for packages, documents, supplier mgmt and lead workflow compliance.

-- Add new value to lead status ENUM
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
CREATE INDEX idx_package_enquiries_package_id ON package_enquiries(package_id);
