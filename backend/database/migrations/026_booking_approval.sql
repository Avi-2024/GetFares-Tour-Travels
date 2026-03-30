-- Add is_approved column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_bookings_is_approved ON bookings(is_approved);
