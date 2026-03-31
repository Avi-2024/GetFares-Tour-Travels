-- PRD completion migration
-- Adds missing entities and fields for packages, documents, supplier mgmt and lead workflow compliance.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'lead_status'
      AND e.enumlabel = 'NON_RESPONSIVE'
  ) THEN
    ALTER TYPE lead_status ADD VALUE 'NON_RESPONSIVE';
  END IF;
END $$;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(80),
  ADD COLUMN IF NOT EXISTS adults_count INT DEFAULT 1 CHECK (adults_count >= 0),
  ADD COLUMN IF NOT EXISTS children_count INT DEFAULT 0 CHECK (children_count >= 0),
  ADD COLUMN IF NOT EXISTS visa_required BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_type VARCHAR(20) DEFAULT 'HOLIDAY',
  ADD COLUMN IF NOT EXISTS travel_purpose VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sub_status VARCHAR(60),
  ADD COLUMN IF NOT EXISTS temperature VARCHAR(10) DEFAULT 'COLD',
  ADD COLUMN IF NOT EXISTS followup_attempts INT DEFAULT 0 CHECK (followup_attempts >= 0),
  ADD COLUMN IF NOT EXISTS final_reminder_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS non_responsive_marked_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'payable_status'
  ) THEN
    CREATE TYPE payable_status AS ENUM ('PENDING','PARTIAL','PAID');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS supplier_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  supplier_id UUID REFERENCES suppliers(id),
  payable_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  due_date DATE,
  status payable_status DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tax_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  tax_type VARCHAR(50),
  amount NUMERIC(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency VARCHAR(10),
  target_currency VARCHAR(10),
  rate NUMERIC(14,6),
  effective_date DATE
);

CREATE TABLE IF NOT EXISTS booking_documents (
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

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contract_url TEXT,
  ADD COLUMN IF NOT EXISTS rate_valid_until DATE,
  ADD COLUMN IF NOT EXISTS production_commitment TEXT,
  ADD COLUMN IF NOT EXISTS payment_deadline_date DATE,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE supplier_payables
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_paid_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS packages (
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

CREATE TABLE IF NOT EXISTS package_enquiries (
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

CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_sub_status ON leads(sub_status);
CREATE INDEX IF NOT EXISTS idx_booking_documents_booking_id ON booking_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payables_supplier_id ON supplier_payables(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payables_status ON supplier_payables(status);
CREATE INDEX IF NOT EXISTS idx_packages_status_publish ON packages(status, publish_to_website);
CREATE INDEX IF NOT EXISTS idx_package_enquiries_package_id ON package_enquiries(package_id);
