-- Add is_approved column to bookings table (MySQL)
ALTER TABLE bookings ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX idx_bookings_is_approved ON bookings(is_approved);
