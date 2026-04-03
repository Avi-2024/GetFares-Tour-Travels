-- =====================================================
-- TRAVEL CRM - DUMMY DATA SEEDING SCRIPT
-- =====================================================
-- This script populates the database with test data for development and testing
-- Run this AFTER running migrations: npm run db:migrate && npm run db:seed:rbac

-- =====================================================
-- 1. INSERT TEST USERS
-- =====================================================

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, expertise_destinations, target_amount, incentive_percent)
SELECT 
    'Rajesh Kumar',
    'rajesh@travel-crm.com',
    '+91-9876543211',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true,
    ARRAY['Bali', 'Maldives', 'Thailand'],
    500000,
    5
FROM roles WHERE name = 'sales_consultant'
ON CONFLICT(email) DO NOTHING;

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, expertise_destinations, target_amount, incentive_percent)
SELECT 
    'Priya Singh',
    'priya@travel-crm.com',
    '+91-9876543212',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true,
    ARRAY['Dubai', 'Singapore', 'Malaysia'],
    600000,
    6
FROM roles WHERE name = 'sales_consultant'
ON CONFLICT(email) DO NOTHING;

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active, expertise_destinations, target_amount, incentive_percent)
SELECT 
    'Anand Patel',
    'anand@travel-crm.com',
    '+91-9876543213',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true,
    ARRAY['Europe', 'Canada', 'USA'],
    750000,
    7
FROM roles WHERE name = 'sales_consultant'
ON CONFLICT(email) DO NOTHING;

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active)
SELECT 
    'Visa Officer',
    'visa@travel-crm.com',
    '+91-9876543214',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true
FROM roles WHERE name = 'visa_executive'
ON CONFLICT(email) DO NOTHING;

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active)
SELECT 
    'Finance Manager',
    'finance@travel-crm.com',
    '+91-9876543215',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true
FROM roles WHERE name = 'accounts'
ON CONFLICT(email) DO NOTHING;

INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active)
SELECT 
    'Marketing Head',
    'marketing@travel-crm.com',
    '+91-9876543216',
    '$2b$10$5VpA7D9vK8xL2mN1pQ6rXuxZ2kL8yM7vN5oP2qR3sT4uV5wX6yZ7a', -- user@123
    id,
    true
FROM roles WHERE name = 'marketing'
ON CONFLICT(email) DO NOTHING;

-- =====================================================
-- 2. INSERT DESTINATIONS
-- =====================================================

INSERT INTO destinations (name, country, is_active) VALUES
('Bali, Indonesia', 'Indonesia', true),
('Maldives', 'Maldives', true),
('Dubai, UAE', 'UAE', true),
('Singapore', 'Singapore', true),
('Thailand', 'Thailand', true),
('Malaysia', 'Malaysia', true),
('Spain', 'Spain', true),
('France', 'France', true),
('Germany', 'Germany', true),
('USA', 'USA', true),
('Canada', 'Canada', true),
('Goa, India', 'India', true),
('Shimla, India', 'India', true),
('Ooty, India', 'India', true),
('Jaipur, India', 'India', true)
ON CONFLICT(name) DO NOTHING;

-- =====================================================
-- 3. INSERT DESTINATION PRICING
-- =====================================================

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 25000, 15, 20, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Bali, Indonesia' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 60000, 18, 25, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Maldives' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 35000, 16, 22, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Dubai, UAE' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 40000, 15, 20, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Singapore' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 20000, 15, 20, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Thailand' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 8000, 20, 30, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Goa, India' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO destination_pricing (destination_id, base_cost, min_profit_percent, recommended_profit_percent, tax_percent, created_by)
SELECT d.id, 5000, 25, 35, 5, u.id
FROM destinations d, users u
WHERE d.name = 'Shimla, India' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. INSERT CAMPAIGNS
-- =====================================================

INSERT INTO campaigns (name, source, budget, actual_spend, leads_generated, revenue_generated, start_date, end_date) VALUES
('Summer Bali Getaway 2026', 'Meta', 50000, 25500, 45, 180000, '2026-01-01', '2026-03-31'),
('Maldives Honeymoon Special', 'Google Ads', 75000, 68300, 32, 350000, '2026-01-01', '2026-03-31'),
('Winter Dubai Escape', 'Facebook', 40000, 35200, 28, 120000, '2026-01-01', '2026-03-31'),
('Singapore City Break', 'Instagram', 30000, 28500, 22, 90000, '2026-01-01', '2026-03-31'),
('Domestic Holiday Packages', 'Google Ads', 20000, 15800, 85, 45000, '2026-01-01', '2026-03-31')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. INSERT CUSTOMERS
-- =====================================================

INSERT INTO customers (full_name, email, phone, is_active) VALUES
('Amit Kumar', 'amit.kumar@email.com', '+91-9876543220', true),
('Neha Sharma', 'neha.sharma@email.com', '+91-9876543221', true),
('Vikram Singh', 'vikram.singh@email.com', '+91-9876543222', true),
('Priya Patel', 'priya.patel@email.com', '+91-9876543223', true),
('Arjun Verma', 'arjun.verma@email.com', '+91-9876543224', true),
('Sunita Desai', 'sunita.desai@email.com', '+91-9876543225', true),
('Rohan Gupta', 'rohan.gupta@email.com', '+91-9876543226', true),
('Divya Nair', 'divya.nair@email.com', '+91-9876543227', true)
ON CONFLICT(email) DO NOTHING;

-- =====================================================
-- 6. INSERT LEADS
-- =====================================================

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Amit Kumar',
    '+91-9876543220',
    'amit.kumar@email.com',
    d.id,
    '2026-05-15',
    150000,
    'CONVERTED',
    u.id,
    95,
    false,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Bali, Indonesia' AND u.email = 'rajesh@travel-crm.com' AND c.name = 'Summer Bali Getaway 2026'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Neha Sharma',
    '+91-9876543221',
    'neha.sharma@email.com',
    d.id,
    '2026-06-10',
    350000,
    'WIP',
    u.id,
    88,
    false,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Maldives' AND u.email = 'priya@travel-crm.com' AND c.name = 'Maldives Honeymoon Special'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Vikram Singh',
    '+91-9876543222',
    'vikram.singh@email.com',
    d.id,
    '2026-04-20',
    120000,
    'QUOTED',
    u.id,
    75,
    false,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Dubai, UAE' AND u.email = 'anand@travel-crm.com' AND c.name = 'Winter Dubai Escape'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Priya Patel',
    '+91-9876543223',
    'priya.patel@email.com',
    d.id,
    '2026-05-05',
    90000,
    'CONTACTED',
    u.id,
    60,
    false,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Singapore' AND u.email = 'rajesh@travel-crm.com' AND c.name = 'Singapore City Break'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Arjun Verma',
    '+91-9876543224',
    'arjun.verma@email.com',
    d.id,
    '2026-04-10',
    45000,
    'OPEN',
    u.id,
    45,
    false,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Goa, India' AND u.email = 'priya@travel-crm.com' AND c.name = 'Domestic Holiday Packages'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Sunita Desai',
    '+91-9876543225',
    'sunita.desai@email.com',
    d.id,
    '2026-05-20',
    75000,
    'FOLLOW_UP',
    u.id,
    70,
    false,
    NULL
FROM destinations d, users u
WHERE d.name = 'Thailand' AND u.email = 'anand@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Rohan Gupta',
    '+91-9876543226',
    'rohan.gupta@email.com',
    d.id,
    '2026-07-15',
    25000,
    'OPEN',
    NULL,
    35,
    false,
    c.id
FROM destinations d, campaigns c
WHERE d.name = 'Shimla, India' AND c.name = 'Domestic Holiday Packages'
ON CONFLICT DO NOTHING;

INSERT INTO leads (full_name, phone, email, destination_id, travel_date, budget, status, assigned_to, lead_score, is_vip, campaign_id)
SELECT 
    'Divya Nair',
    '+91-9876543227',
    'divya.nair@email.com',
    d.id,
    '2026-06-25',
    400000,
    'CONVERTED',
    u.id,
    92,
    true,
    c.id
FROM destinations d, users u, campaigns c
WHERE d.name = 'Maldives' AND u.email = 'priya@travel-crm.com' AND c.name = 'Maldives Honeymoon Special'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. INSERT QUOTATIONS
-- =====================================================

INSERT INTO quotations (lead_id, destination_id, days, nights, pax, base_cost, quoted_price, profit_percent, status, created_by)
SELECT l.id, d.id, 5, 4, 2, 25000, 75000, 20, 'ACCEPTED', u.id
FROM leads l, destinations d, users u
WHERE l.email = 'amit.kumar@email.com' AND d.name = 'Bali, Indonesia' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO quotations (lead_id, destination_id, days, nights, pax, base_cost, quoted_price, profit_percent, status, created_by)
SELECT l.id, d.id, 7, 6, 2, 60000, 175000, 20, 'PENDING', u.id
FROM leads l, destinations d, users u
WHERE l.email = 'neha.sharma@email.com' AND d.name = 'Maldives' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO quotations (lead_id, destination_id, days, nights, pax, base_cost, quoted_price, profit_percent, status, created_by)
SELECT l.id, d.id, 4, 3, 3, 35000, 105000, 20, 'ACCEPTED', u.id
FROM leads l, destinations d, users u
WHERE l.email = 'vikram.singh@email.com' AND d.name = 'Dubai, UAE' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO quotations (lead_id, destination_id, days, nights, pax, base_cost, quoted_price, profit_percent, status, created_by)
SELECT l.id, d.id, 3, 2, 2, 40000, 96000, 20, 'PENDING', u.id
FROM leads l, destinations d, users u
WHERE l.email = 'priya.patel@email.com' AND d.name = 'Singapore' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

INSERT INTO quotations (lead_id, destination_id, days, nights, pax, base_cost, quoted_price, profit_percent, status, created_by)
SELECT l.id, d.id, 8, 7, 2, 60000, 175000, 20, 'ACCEPTED', u.id
FROM leads l, destinations d, users u
WHERE l.email = 'divya.nair@email.com' AND d.name = 'Maldives' AND u.email = 'admin@travel-crm.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. INSERT BOOKINGS
-- =====================================================

INSERT INTO bookings (lead_id, destination_id, pax_count, total_amount, status)
SELECT l.id, d.id, 2, 180000, 'CONFIRMED'
FROM leads l, destinations d
WHERE l.email = 'amit.kumar@email.com' AND d.name = 'Bali, Indonesia'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (lead_id, destination_id, pax_count, total_amount, status)
SELECT l.id, d.id, 2, 420000, 'CONFIRMED'
FROM leads l, destinations d
WHERE l.email = 'divya.nair@email.com' AND d.name = 'Maldives'
ON CONFLICT DO NOTHING;

INSERT INTO bookings (lead_id, destination_id, pax_count, total_amount, status)
SELECT l.id, d.id, 3, 145000, 'CONFIRMED'
FROM leads l, destinations d
WHERE l.email = 'vikram.singh@email.com' AND d.name = 'Dubai, UAE'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. INSERT PAYMENTS  
-- =====================================================

INSERT INTO payments (booking_id, amount, status, payment_method, transaction_date)
SELECT b.id, 90000, 'COMPLETED', 'BANK_TRANSFER', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'amit.kumar@email.com')
ON CONFLICT DO NOTHING;

INSERT INTO payments (booking_id, amount, status, payment_method, transaction_date)
SELECT b.id, 90000, 'COMPLETED', 'BANK_TRANSFER', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'amit.kumar@email.com')
ON CONFLICT DO NOTHING;

INSERT INTO payments (booking_id, amount, status, payment_method, transaction_date)
SELECT b.id, 420000, 'COMPLETED', 'BANK_TRANSFER', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'divya.nair@email.com')
ON CONFLICT DO NOTHING;

INSERT INTO payments (booking_id, amount, status, payment_method, transaction_date)
SELECT b.id, 72500, 'COMPLETED', 'BANK_TRANSFER', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'vikram.singh@email.com')
ON CONFLICT DO NOTHING;

INSERT INTO payments (booking_id, amount, status, payment_method, transaction_date)
SELECT b.id, 72500, 'PENDING', 'BANK_TRANSFER', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'vikram.singh@email.com')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. INSERT PACKAGES
-- =====================================================

INSERT INTO packages (name, destination, duration, starting_price, package_category, status, publish_to_website) VALUES
('Bali Beach Paradise', 'Bali, Indonesia', '5 Days / 4 Nights', 35000, 'BEACH', 'PUBLISHED', true),
('Maldives Luxury Retreat', 'Maldives', '7 Days / 6 Nights', 85000, 'LUXURY', 'PUBLISHED', true),
('Dubai City Explorer', 'Dubai, UAE', '4 Days / 3 Nights', 45000, 'CITY', 'PUBLISHED', true),
('Singapore Modern Adventure', 'Singapore', '3 Days / 2 Nights', 40000, 'CITY', 'PUBLISHED', true),
('Goa Beach Bliss', 'Goa, India', '3 Days / 2 Nights', 12000, 'BEACH', 'PUBLISHED', true),
('Shimla Mountain Escape', 'Shimla, India', '4 Days / 3 Nights', 8000, 'ADVENTURE', 'PUBLISHED', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. INSERT SUPPLIERS
-- =====================================================

INSERT INTO suppliers (
  name, email, phone, country, supplier_currency, 
  pan_number, gst_number, address, address_line,
  invoice_beneficiary_name, invoice_bank_name, invoice_account_number, invoice_ifsc_swift, invoice_upi_id,
  bank_name, bank_account_number, ifsc_code,
  contract_url, rate_valid_until, payment_deadline_date, production_commitment, is_active
) VALUES
(
  'Bali Tours & Travel', 'contact@balitoursandtravel.com', '+62-274-555-123', 'Indonesia', 'IDR',
  NULL, NULL, 'Jl. Raya Ubud No. 88, Bali', 'Jl. Raya Ubud No. 88',
  'Bali Tours & Travel', 'Bank Mandiri', '1370012345678', 'BMRIIDJA', NULL,
  'Bank Mandiri', '1370012345678', 'BMRIIDJA',
  'https://example.com/contracts/bali-tours.pdf', '2026-12-31', '2026-01-15', 'Confirmed bookings within 48 hours', true
),
(
  'Maldives Resorts Ltd', 'bookings@maldivesresorts.mv', '+960-330-5000', 'Maldives', 'USD',
  NULL, NULL, 'Male, Maldives', 'Male',
  'Maldives Resorts Ltd', 'Bank of Maldives', 'MV29BOMV0000000123456789', 'BOMVMVMV', NULL,
  'Bank of Maldives', 'MV29BOMV0000000123456789', 'BOMVMVMV',
  'https://example.com/contracts/maldives-resorts.pdf', '2026-12-31', '2026-01-20', 'Luxury resort bookings confirmed within 24 hours', true
),
(
  'Dubai Tourism Services', 'info@dubaytourism.ae', '+971-4-308-1111', 'UAE', 'AED',
  NULL, NULL, 'Sheikh Zayed Road, Dubai', 'Sheikh Zayed Road',
  'Dubai Tourism Services LLC', 'Emirates NBD', 'AE070331234567890123456', 'EBILAEAD', NULL,
  'Emirates NBD', 'AE070331234567890123456', 'EBILAEAD',
  'https://example.com/contracts/dubai-tourism.pdf', '2026-12-31', '2026-01-10', 'All bookings confirmed same day', true
),
(
  'Singapore Tours', 'hello@singaporetours.sg', '+65-6737-9110', 'Singapore', 'SGD',
  NULL, NULL, 'Orchard Road, Singapore', 'Orchard Road',
  'Singapore Tours Pte Ltd', 'DBS Bank', 'SG1234567890', 'DBSSSGSG', NULL,
  'DBS Bank', 'SG1234567890', 'DBSSSGSG',
  'https://example.com/contracts/singapore-tours.pdf', '2026-12-31', '2026-01-25', 'City tours confirmed within 12 hours', true
),
(
  'Goa Beach Resorts', 'reservations@goabeachresorts.com', '+91-832-2435-600', 'India', 'INR',
  'ABCDE1234F', '27ABCDE1234F1Z5', 'Calangute Beach Road, Goa 403516', 'Calangute Beach Road',
  'Goa Beach Resorts Pvt Ltd', 'HDFC Bank', '50200012345678', 'HDFC0001234', 'goaresorts@upi',
  'HDFC Bank', '50200012345678', 'HDFC0001234',
  'https://example.com/contracts/goa-resorts.pdf', '2026-12-31', '2026-01-30', 'Beach resort bookings confirmed within 6 hours', true
)
ON CONFLICT(email) DO NOTHING;

-- =====================================================
-- 12. INSERT SUPPLIER PAYABLES
-- =====================================================

INSERT INTO supplier_payables (booking_id, supplier_id, payable_amount, paid_amount, due_date, status, payment_reference)
SELECT 
  b.id, 
  s.id, 
  150000, 
  150000, 
  CURRENT_DATE - INTERVAL '5 days', 
  'PAID', 
  'PAY-2026-001'
FROM bookings b, suppliers s
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'amit.kumar@email.com')
  AND s.email = 'contact@balitoursandtravel.com'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO supplier_payables (booking_id, supplier_id, payable_amount, paid_amount, due_date, status, payment_reference)
SELECT 
  b.id, 
  s.id, 
  350000, 
  175000, 
  CURRENT_DATE + INTERVAL '2 days', 
  'PARTIAL', 
  'PAY-2026-002'
FROM bookings b, suppliers s
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'divya.nair@email.com')
  AND s.email = 'bookings@maldivesresorts.mv'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO supplier_payables (booking_id, supplier_id, payable_amount, paid_amount, due_date, status, payment_reference)
SELECT 
  b.id, 
  s.id, 
  120000, 
  0, 
  CURRENT_DATE + INTERVAL '7 days', 
  'PENDING', 
  'PAY-2026-003'
FROM bookings b, suppliers s
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'vikram.singh@email.com')
  AND s.email = 'info@dubaytourism.ae'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- 13. INSERT COMPLAINTS
-- =====================================================

INSERT INTO complaints (customer_id, subject, description, status, created_at)
SELECT c.id, 'Hotel quality issue', 'The hotel was not as per the pictures shown', 'RESOLVED', CURRENT_TIMESTAMP
FROM customers c
WHERE c.email = 'amit.kumar@email.com'
ON CONFLICT DO NOTHING;

INSERT INTO complaints (customer_id, subject, description, status, created_at)
SELECT c.id, 'Flight delay problem', 'Flight was delayed by 4 hours', 'PENDING', CURRENT_TIMESTAMP
FROM customers c
WHERE c.email = 'vikram.singh@email.com'
ON CONFLICT DO NOTHING;

-- =====================================================
-- 14. INSERT REFUNDS
-- =====================================================

INSERT INTO refunds (booking_id, amount, status, refund_date)
SELECT b.id, 10000, 'APPROVED', CURRENT_DATE
FROM bookings b
WHERE EXISTS (SELECT 1 FROM leads l WHERE l.id = b.lead_id AND l.email = 'vikram.singh@email.com')
LIMIT 1
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
\echo '✅ Dummy data seeding completed successfully!'
\echo ''
\echo '📚 Test Users Created:'
\echo '   Sales Consultant: rajesh@travel-crm.com / user@123'
\echo '   Sales Consultant: priya@travel-crm.com / user@123'
\echo '   Sales Consultant: anand@travel-crm.com / user@123'
\echo '   Visa Executive: visa@travel-crm.com / user@123'
\echo '   Accounts: finance@travel-crm.com / user@123'
\echo '   Marketing: marketing@travel-crm.com / user@123'
\echo ''
\echo '🎯 Test Data Summary:'
\echo '   ✓ Users: 6 test users'
\echo '   ✓ Destinations: 15 worldwide locations'
\echo '   ✓ Campaigns: 5 marketing campaigns'
\echo '   ✓ Leads: 8 leads in various stages'
\echo '   ✓ Quotations: 5 quotations'
\echo '   ✓ Bookings: 3 confirmed bookings'
\echo '   ✓ Payments: 5 payment transactions'
\echo '   ✓ Packages: 6 tour packages'
\echo '   ✓ Customers: 8 customers'
\echo '   ✓ Suppliers: 5 suppliers with complete financial data'
\echo '   ✓ Supplier Payables: 3 payables (paid, partial, pending)'
