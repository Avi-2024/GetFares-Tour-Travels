ALTER TABLE quotations
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
