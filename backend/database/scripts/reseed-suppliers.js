import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function reseedSuppliers() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting supplier data reseed...\n');
    
    await client.query('BEGIN');
    
    // Delete existing supplier payables first (due to foreign key constraints)
    console.log('🗑️  Clearing existing supplier payables...');
    await client.query('DELETE FROM supplier_payables');
    
    // Delete existing suppliers
    console.log('🗑️  Clearing existing suppliers...');
    await client.query('DELETE FROM suppliers');
    
    // Insert suppliers with complete financial data
    console.log('📝 Inserting suppliers with financial data...');
    await client.query(`
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
      ON CONFLICT(email) DO UPDATE SET
        pan_number = EXCLUDED.pan_number,
        gst_number = EXCLUDED.gst_number,
        address = EXCLUDED.address,
        address_line = EXCLUDED.address_line,
        invoice_beneficiary_name = EXCLUDED.invoice_beneficiary_name,
        invoice_bank_name = EXCLUDED.invoice_bank_name,
        invoice_account_number = EXCLUDED.invoice_account_number,
        invoice_ifsc_swift = EXCLUDED.invoice_ifsc_swift,
        invoice_upi_id = EXCLUDED.invoice_upi_id,
        bank_name = EXCLUDED.bank_name,
        bank_account_number = EXCLUDED.bank_account_number,
        ifsc_code = EXCLUDED.ifsc_code,
        supplier_currency = EXCLUDED.supplier_currency,
        contract_url = EXCLUDED.contract_url,
        rate_valid_until = EXCLUDED.rate_valid_until,
        payment_deadline_date = EXCLUDED.payment_deadline_date,
        production_commitment = EXCLUDED.production_commitment
    `);
    
    // Insert supplier payables
    console.log('💰 Inserting supplier payables...');
    await client.query(`
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
      ON CONFLICT DO NOTHING
    `);
    
    await client.query(`
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
      ON CONFLICT DO NOTHING
    `);
    
    await client.query(`
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
      ON CONFLICT DO NOTHING
    `);
    
    await client.query('COMMIT');
    
    // Verify the data
    const supplierCount = await client.query('SELECT COUNT(*) FROM suppliers');
    const payableCount = await client.query('SELECT COUNT(*) FROM supplier_payables');
    
    console.log('\n✅ Supplier data reseed completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   ✓ Suppliers: ${supplierCount.rows[0].count}`);
    console.log(`   ✓ Supplier Payables: ${payableCount.rows[0].count}`);
    console.log('\n💡 All suppliers now have complete financial information including:');
    console.log('   • Bank account details');
    console.log('   • Invoice information');
    console.log('   • PAN/GST numbers (for Indian suppliers)');
    console.log('   • Contract URLs and validity dates');
    console.log('   • Payment deadlines and production commitments\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reseeding suppliers:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

reseedSuppliers()
  .then(() => {
    console.log('🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
