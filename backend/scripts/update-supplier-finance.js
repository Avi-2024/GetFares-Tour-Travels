import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

async function updateSuppliers() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const clientConfig = { connectionString: databaseUrl };
  if (databaseUrl.includes(".rds.") || databaseUrl.includes(".rds-")) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);
  await client.connect();

  try {
    console.log("🔄 Updating supplier financial data...\n");

    const suppliers = [
      {
        email: "contact@balitoursandtravel.com",
        supplier_currency: "IDR",
        address: "Jl. Raya Ubud No. 88, Bali",
        address_line: "Jl. Raya Ubud No. 88",
        invoice_beneficiary_name: "Bali Tours & Travel",
        invoice_bank_name: "Bank Mandiri",
        invoice_account_number: "1370012345678",
        invoice_ifsc_swift: "BMRIIDJA",
        bank_name: "Bank Mandiri",
        bank_account_number: "1370012345678",
        ifsc_code: "BMRIIDJA",
        contract_url: "https://example.com/contracts/bali-tours.pdf",
        rate_valid_until: "2026-12-31",
        payment_deadline_date: "2026-01-15",
        production_commitment: "Confirmed bookings within 48 hours",
      },
      {
        email: "bookings@maldivesresorts.mv",
        supplier_currency: "USD",
        address: "Male, Maldives",
        address_line: "Male",
        invoice_beneficiary_name: "Maldives Resorts Ltd",
        invoice_bank_name: "Bank of Maldives",
        invoice_account_number: "MV29BOMV0000000123456789",
        invoice_ifsc_swift: "BOMVMVMV",
        bank_name: "Bank of Maldives",
        bank_account_number: "MV29BOMV0000000123456789",
        ifsc_code: "BOMVMVMV",
        contract_url: "https://example.com/contracts/maldives-resorts.pdf",
        rate_valid_until: "2026-12-31",
        payment_deadline_date: "2026-01-20",
        production_commitment: "Luxury resort bookings confirmed within 24 hours",
      },
      {
        email: "info@dubaitourism.ae",
        supplier_currency: "AED",
        address: "Sheikh Zayed Road, Dubai",
        address_line: "Sheikh Zayed Road",
        invoice_beneficiary_name: "Dubai Tourism Services LLC",
        invoice_bank_name: "Emirates NBD",
        invoice_account_number: "AE070331234567890123456",
        invoice_ifsc_swift: "EBILAEAD",
        bank_name: "Emirates NBD",
        bank_account_number: "AE070331234567890123456",
        ifsc_code: "EBILAEAD",
        contract_url: "https://example.com/contracts/dubai-tourism.pdf",
        rate_valid_until: "2026-12-31",
        payment_deadline_date: "2026-01-10",
        production_commitment: "All bookings confirmed same day",
      },
      {
        email: "hello@singaporetours.sg",
        name: "Singapore Tours",
        contact_person: "Lee Wei Ming",
        phone: "+65-6737-9110",
        country: "Singapore",
        supplier_currency: "SGD",
        address: "Orchard Road, Singapore",
        address_line: "Orchard Road",
        invoice_beneficiary_name: "Singapore Tours Pte Ltd",
        invoice_bank_name: "DBS Bank",
        invoice_account_number: "SG1234567890",
        invoice_ifsc_swift: "DBSSSGSG",
        bank_name: "DBS Bank",
        bank_account_number: "SG1234567890",
        ifsc_code: "DBSSSGSG",
        contract_url: "https://example.com/contracts/singapore-tours.pdf",
        rate_valid_until: "2026-12-31",
        payment_deadline_date: "2026-01-25",
        production_commitment: "City tours confirmed within 12 hours",
        is_active: true,
      },
      {
        email: "reservations@goabeachresorts.com",
        name: "Goa Beach Resorts",
        contact_person: "Ramesh Naik",
        phone: "+91-832-2435-600",
        country: "India",
        supplier_currency: "INR",
        pan_number: "ABCDE1234F",
        gst_number: "27ABCDE1234F1Z5",
        address: "Calangute Beach Road, Goa 403516",
        address_line: "Calangute Beach Road",
        invoice_beneficiary_name: "Goa Beach Resorts Pvt Ltd",
        invoice_bank_name: "HDFC Bank",
        invoice_account_number: "50200012345678",
        invoice_ifsc_swift: "HDFC0001234",
        invoice_upi_id: "goaresorts@upi",
        bank_name: "HDFC Bank",
        bank_account_number: "50200012345678",
        ifsc_code: "HDFC0001234",
        contract_url: "https://example.com/contracts/goa-resorts.pdf",
        rate_valid_until: "2026-12-31",
        payment_deadline_date: "2026-01-30",
        production_commitment: "Beach resort bookings confirmed within 6 hours",
        is_active: true,
      },
    ];

    for (const supplier of suppliers) {
      const { email, ...updates } = supplier;
      
      // Check if supplier exists
      const existing = await client.query(
        "SELECT id FROM suppliers WHERE email = $1",
        [email]
      );

      if (existing.rows.length > 0) {
        // Update existing supplier
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(", ");
        
        await client.query(
          `UPDATE suppliers SET ${setClause} WHERE email = $1`,
          [email, ...values]
        );
        console.log(`✅ Updated: ${email}`);
      } else if (supplier.name) {
        // Insert new supplier
        const fields = ["email", ...Object.keys(updates)];
        const values = [email, ...Object.values(updates)];
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(", ");
        
        await client.query(
          `INSERT INTO suppliers (${fields.join(", ")}) VALUES (${placeholders})`,
          values
        );
        console.log(`✅ Created: ${email}`);
      }
    }

    // Verify the updates
    const result = await client.query(`
      SELECT 
        name, 
        email,
        supplier_currency, 
        invoice_bank_name, 
        invoice_account_number,
        pan_number,
        gst_number,
        contract_url
      FROM suppliers 
      ORDER BY name
    `);

    console.log("\n📊 Current Supplier Data:");
    console.log("─".repeat(80));
    result.rows.forEach(row => {
      console.log(`\n${row.name} (${row.email})`);
      console.log(`  Currency: ${row.supplier_currency || "Not set"}`);
      console.log(`  Bank: ${row.invoice_bank_name || "Not set"}`);
      console.log(`  Account: ${row.invoice_account_number || "Not set"}`);
      if (row.pan_number) console.log(`  PAN: ${row.pan_number}`);
      if (row.gst_number) console.log(`  GST: ${row.gst_number}`);
      console.log(`  Contract: ${row.contract_url ? "✓" : "✗"}`);
    });

    console.log("\n\n✅ Supplier financial data updated successfully!");
    console.log("\n💡 The finance system should now display complete supplier information.");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    await client.end();
  }
}

updateSuppliers().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
