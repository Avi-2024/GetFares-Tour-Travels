import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import { randomUUID } from "node:crypto";
import { createDatabaseConnection } from "../crm/core/database/index.js";
import { config } from "../crm/core/config/index.js";
import { logger } from "../crm/core/logger/logger.js";

dotenv.config();

const SALT_ROUNDS = 10;
const DATE_SUFFIX = "T00:00:00.000Z";

function toDateString(input) {
  if (!input) return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

function addDays(dateString, days) {
  const base = new Date(`${dateString}${DATE_SUFFIX}`);
  base.setDate(base.getDate() + days);
  return base.toISOString().split("T")[0];
}

async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed data.");
  }
  const normalizedUrl = String(databaseUrl).toLowerCase();
  const explicitClient = String(process.env.DATABASE_CLIENT || "")
    .trim()
    .toLowerCase();
  const isMySql =
    explicitClient === "mysql" ||
    explicitClient === "mariadb" ||
    normalizedUrl.startsWith("mysql://") ||
    normalizedUrl.startsWith("mysql2://");
  const schemaFilter = isMySql ? "table_schema = DATABASE()" : "table_schema = 'public'";

  const client = createDatabaseConnection({ config, logger });

  const columnsCache = new Map();

  async function getTableColumns(tableName) {
    if (columnsCache.has(tableName)) {
      return columnsCache.get(tableName);
    }

    const result = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE ${schemaFilter} AND table_name=$1`,
      [tableName],
    );

    const columns = new Set(
      result.rows
        .map((row) => row.column_name || row.COLUMN_NAME || row.Column_name)
        .map((column) => String(column || "").trim().toLowerCase())
        .filter(Boolean),
    );
    columnsCache.set(tableName, columns);
    return columns;
  }

  async function hasTable(tableName) {
    const result = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE ${schemaFilter} AND table_name=$1 LIMIT 1`,
      [tableName],
    );
    return result.rowCount > 0;
  }

  async function hasColumn(tableName, columnName) {
    const columns = await getTableColumns(tableName);
    return columns.has(String(columnName || "").toLowerCase());
  }

  async function insertRow(tableName, payload, options = {}) {
    const columns = await getTableColumns(tableName);
    const normalizedPayload = { ...payload };
    if (columns.has("id") && normalizedPayload.id === undefined) {
      normalizedPayload.id = randomUUID();
    }

    const entries = Object.entries(normalizedPayload).filter(
      ([, value]) => value !== undefined,
    );
    const filtered = entries.filter(([key]) =>
      columns.has(String(key || "").toLowerCase()),
    );

    if (!filtered.length) {
      return null;
    }

    const keys = filtered.map(([key]) => key);
    const values = filtered.map(([, value]) => {
      if (Array.isArray(value)) return JSON.stringify(value);
      if (value && typeof value === "object" && !(value instanceof Date)) {
        return JSON.stringify(value);
      }
      return value;
    });
    const params = keys.map((_, index) => `$${index + 1}`);

    const shouldIgnoreConflicts =
      isMySql && (options.conflictTarget || options.onConflict);
    let sql = `${shouldIgnoreConflicts ? "INSERT IGNORE INTO" : "INSERT INTO"} ${tableName} (${keys.join(", ")}) VALUES (${params.join(", ")})`;

    if (!isMySql && options.conflictTarget) {
      sql += ` ON CONFLICT (${options.conflictTarget}) DO NOTHING`;
    } else if (!isMySql && options.onConflict) {
      sql += ` ON CONFLICT ${options.onConflict}`;
    }

    if (!isMySql && options.returning !== false) {
      const returningColumns = Array.isArray(options.returning)
        ? options.returning.join(", ")
        : options.returning || "*";
      sql += ` RETURNING ${returningColumns}`;
    }

    let result;
    try {
      result = await client.query(sql, values);
    } catch (error) {
      throw new Error(
        `insertRow failed for ${tableName}: ${error.message}. SQL=${sql}. keys=${keys.join(",")}`,
      );
    }
    if (isMySql || options.returning === false) {
      return null;
    }
    return result.rows[0] || null;
  }

  async function getRowByUnique(tableName, columnName, value) {
    const result = await client.query(
      `SELECT * FROM ${tableName} WHERE ${columnName} = $1 LIMIT 1`,
      [value],
    );
    return result.rows[0] || null;
  }

  async function upsertByUnique(tableName, columnName, payload) {
    const uniqueValue = payload[columnName];
    const existing = await getRowByUnique(tableName, columnName, uniqueValue);
    if (existing) {
      return existing;
    }

    const inserted = await insertRow(tableName, payload, { onConflict: "DO NOTHING" });
    if (inserted) {
      return inserted;
    }

    const resolved = await getRowByUnique(tableName, columnName, uniqueValue);
    if (resolved) {
      return resolved;
    }

    throw new Error(
      `upsertByUnique failed for ${tableName}.${columnName}=${String(uniqueValue)}`,
    );
  }

  try {
    await client.query("BEGIN");

    console.log("Starting database seeding...");

    const roleRows = await client.query("SELECT id, name FROM roles");
    const roles = new Map(roleRows.rows.map((row) => [row.name, row.id]));

    const requiredRoles = [
      "admin",
      "sales_consultant",
      "visa_executive",
      "accounts",
      "marketing",
    ];
    requiredRoles.forEach((role) => {
      if (!roles.has(role)) {
        throw new Error(`Missing role: ${role}. Run db:seed:rbac first.`);
      }
    });

    console.log("Creating users...");

    const adminPassword = await bcryptjs.hash("admin@123", SALT_ROUNDS);
    const userPassword = await bcryptjs.hash("user@123", SALT_ROUNDS);

    const users = [
      {
        full_name: "Admin User",
        email: "admin@travel-crm.com",
        password_hash: adminPassword,
        role_id: roles.get("admin"),
        phone: "+91-9876543210",
        is_active: true,
      },
      {
        full_name: "Rajesh Kumar",
        email: "rajesh@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("sales_consultant"),
        phone: "+91-9876543211",
        expertise_destinations: ["Bali", "Maldives", "Thailand"],
        target_amount: 500000,
        incentive_percent: 5,
        is_active: true,
      },
      {
        full_name: "Priya Singh",
        email: "priya@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("sales_consultant"),
        phone: "+91-9876543212",
        expertise_destinations: ["Dubai", "Singapore", "Malaysia"],
        target_amount: 600000,
        incentive_percent: 6,
        is_active: true,
      },
      {
        full_name: "Anand Patel",
        email: "anand@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("sales_consultant"),
        phone: "+91-9876543213",
        expertise_destinations: ["Europe", "Canada", "USA"],
        target_amount: 750000,
        incentive_percent: 7,
        is_active: true,
      },
      {
        full_name: "Visa Officer",
        email: "visa@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("visa_executive"),
        phone: "+91-9876543214",
        is_active: true,
      },
      {
        full_name: "Finance Manager",
        email: "finance@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("accounts"),
        phone: "+91-9876543215",
        is_active: true,
      },
      {
        full_name: "Marketing Head",
        email: "marketing@travel-crm.com",
        password_hash: userPassword,
        role_id: roles.get("marketing"),
        phone: "+91-9876543216",
        is_active: true,
      },
    ];

    const userIds = new Map();
    for (const user of users) {
      const row = await upsertByUnique("users", "email", user);
      userIds.set(user.email, row.id);
      console.log(`  Created/updated user: ${user.email}`);
    }

    console.log("Creating destinations...");

    const destinations = [
      { name: "Bali, Indonesia", country: "Indonesia" },
      { name: "Maldives", country: "Maldives" },
      { name: "Dubai, UAE", country: "UAE" },
      { name: "Singapore", country: "Singapore" },
      { name: "Thailand", country: "Thailand" },
      { name: "Malaysia", country: "Malaysia" },
      { name: "Spain", country: "Spain" },
      { name: "France", country: "France" },
      { name: "Germany", country: "Germany" },
      { name: "USA", country: "USA" },
      { name: "Canada", country: "Canada" },
      { name: "Goa, India", country: "India" },
      { name: "Shimla, India", country: "India" },
      { name: "Ooty, India", country: "India" },
      { name: "Jaipur, India", country: "India" },
    ];

    const destinationIds = new Map();
    for (const destination of destinations) {
      const row = await upsertByUnique("destinations", "name", {
        name: destination.name,
        country: destination.country,
        is_active: true,
      });
      destinationIds.set(destination.name, row.id);
      console.log(`  Created/updated destination: ${destination.name}`);
    }

    console.log("Creating destination pricing...");

    const pricingConfigs = [
      {
        name: "Bali, Indonesia",
        base_cost: 25000,
        min_profit_percent: 15,
        recommended_profit_percent: 20,
      },
      {
        name: "Maldives",
        base_cost: 60000,
        min_profit_percent: 18,
        recommended_profit_percent: 25,
      },
      {
        name: "Dubai, UAE",
        base_cost: 35000,
        min_profit_percent: 16,
        recommended_profit_percent: 22,
      },
      {
        name: "Singapore",
        base_cost: 40000,
        min_profit_percent: 15,
        recommended_profit_percent: 20,
      },
      {
        name: "Thailand",
        base_cost: 20000,
        min_profit_percent: 15,
        recommended_profit_percent: 20,
      },
      {
        name: "Goa, India",
        base_cost: 8000,
        min_profit_percent: 20,
        recommended_profit_percent: 30,
      },
      {
        name: "Shimla, India",
        base_cost: 5000,
        min_profit_percent: 25,
        recommended_profit_percent: 35,
      },
    ];

    for (const pricing of pricingConfigs) {
      const destinationId = destinationIds.get(pricing.name);
      if (!destinationId) {
        continue;
      }

      const existing = await client.query(
        "SELECT id FROM destination_pricing WHERE destination_id = $1 LIMIT 1",
        [destinationId],
      );
      if (existing.rowCount) {
        continue;
      }

      await insertRow("destination_pricing", {
        destination_id: destinationId,
        base_cost: pricing.base_cost,
        min_profit_percent: pricing.min_profit_percent,
        recommended_profit_percent: pricing.recommended_profit_percent,
        tax_percent: 5,
        created_by: userIds.get("admin@travel-crm.com"),
      });

      console.log(`  Created pricing for: ${pricing.name}`);
    }

    console.log("Creating campaigns...");

    const campaigns = [
      {
        name: "Summer Bali Getaway 2026",
        source: "Meta",
        budget: 50000,
        actual_spend: 25500,
        leads_generated: 45,
        revenue_generated: 180000,
      },
      {
        name: "Maldives Honeymoon Special",
        source: "Google Ads",
        budget: 75000,
        actual_spend: 68300,
        leads_generated: 32,
        revenue_generated: 350000,
      },
      {
        name: "Winter Dubai Escape",
        source: "Facebook",
        budget: 40000,
        actual_spend: 35200,
        leads_generated: 28,
        revenue_generated: 120000,
      },
      {
        name: "Singapore City Break",
        source: "Instagram",
        budget: 30000,
        actual_spend: 28500,
        leads_generated: 22,
        revenue_generated: 90000,
      },
      {
        name: "Domestic Holiday Packages",
        source: "Google Ads",
        budget: 20000,
        actual_spend: 15800,
        leads_generated: 85,
        revenue_generated: 45000,
      },
    ];

    const campaignIds = new Map();
    for (const campaign of campaigns) {
      const row = await upsertByUnique("campaigns", "name", {
        ...campaign,
        start_date: "2026-01-01",
        end_date: "2026-03-31",
      });
      if (row) {
        campaignIds.set(campaign.name, row.id);
        console.log(`  Created/updated campaign: ${campaign.name}`);
      }
    }

    console.log("Creating customers...");

    const customers = [
      {
        full_name: "Amit Kumar",
        email: "amit.kumar@email.com",
        phone: "+91-9876543220",
      },
      {
        full_name: "Neha Sharma",
        email: "neha.sharma@email.com",
        phone: "+91-9876543221",
      },
      {
        full_name: "Vikram Singh",
        email: "vikram.singh@email.com",
        phone: "+91-9876543222",
      },
      {
        full_name: "Priya Patel",
        email: "priya.patel@email.com",
        phone: "+91-9876543223",
      },
      {
        full_name: "Arjun Verma",
        email: "arjun.verma@email.com",
        phone: "+91-9876543224",
      },
      {
        full_name: "Sunita Desai",
        email: "sunita.desai@email.com",
        phone: "+91-9876543225",
      },
      {
        full_name: "Rohan Gupta",
        email: "rohan.gupta@email.com",
        phone: "+91-9876543226",
      },
      {
        full_name: "Divya Nair",
        email: "divya.nair@email.com",
        phone: "+91-9876543227",
      },
    ];

    const customerIds = new Map();
    for (const customer of customers) {
      const row = await upsertByUnique("customers", "email", {
        ...customer,
        pan_number: "ABCDE1234F",
        address_line: "Sample Address Line, India",
        client_currency: "INR",
        segment: "NEW",
      });
      if (row) {
        customerIds.set(customer.email, row.id);
        console.log(`  Created/updated customer: ${customer.email}`);
      }
    }

    console.log("Creating leads...");

    const leads = [
      {
        full_name: "Amit Kumar",
        phone: "+91-9876543220",
        email: "amit.kumar@email.com",
        destination: "Bali, Indonesia",
        campaign: "Summer Bali Getaway 2026",
        travel_date: "2026-05-15",
        budget: 150000,
        status: "CONVERTED",
        assigned_to: "rajesh@travel-crm.com",
        lead_score: 95,
        temperature: "HOT",
        lead_type: "HOLIDAY",
        travel_purpose: "HONEYMOON",
        nationality: "Indian",
        adults_count: 2,
        children_count: 0,
      },
      {
        full_name: "Neha Sharma",
        phone: "+91-9876543221",
        email: "neha.sharma@email.com",
        destination: "Maldives",
        campaign: "Maldives Honeymoon Special",
        travel_date: "2026-06-10",
        budget: 350000,
        status: "WIP",
        assigned_to: "priya@travel-crm.com",
        lead_score: 88,
        temperature: "WARM",
        lead_type: "HOLIDAY",
        travel_purpose: "HOLIDAY",
        adults_count: 2,
        children_count: 0,
      },
      {
        full_name: "Vikram Singh",
        phone: "+91-9876543222",
        email: "vikram.singh@email.com",
        destination: "Dubai, UAE",
        campaign: "Winter Dubai Escape",
        travel_date: "2026-04-20",
        budget: 120000,
        status: "QUOTED",
        assigned_to: "anand@travel-crm.com",
        lead_score: 75,
        temperature: "WARM",
        lead_type: "HOLIDAY",
        travel_purpose: "BUSINESS",
        adults_count: 3,
        children_count: 0,
      },
      {
        full_name: "Priya Patel",
        phone: "+91-9876543223",
        email: "priya.patel@email.com",
        destination: "Singapore",
        campaign: "Singapore City Break",
        travel_date: "2026-05-05",
        budget: 90000,
        status: "CONTACTED",
        assigned_to: "rajesh@travel-crm.com",
        lead_score: 60,
        temperature: "WARM",
        lead_type: "HOLIDAY",
        travel_purpose: "HOLIDAY",
        adults_count: 2,
        children_count: 0,
      },
      {
        full_name: "Arjun Verma",
        phone: "+91-9876543224",
        email: "arjun.verma@email.com",
        destination: "Goa, India",
        campaign: "Domestic Holiday Packages",
        travel_date: "2026-04-10",
        budget: 45000,
        status: "OPEN",
        assigned_to: "priya@travel-crm.com",
        lead_score: 45,
        temperature: "COLD",
        lead_type: "HOLIDAY",
        travel_purpose: "HOLIDAY",
        adults_count: 2,
        children_count: 1,
      },
      {
        full_name: "Sunita Desai",
        phone: "+91-9876543225",
        email: "sunita.desai@email.com",
        destination: "Thailand",
        campaign: null,
        travel_date: "2026-05-20",
        budget: 75000,
        status: "FOLLOW_UP",
        assigned_to: "anand@travel-crm.com",
        lead_score: 70,
        temperature: "WARM",
        lead_type: "HOLIDAY",
        travel_purpose: "HOLIDAY",
        adults_count: 2,
        children_count: 0,
      },
      {
        full_name: "Rohan Gupta",
        phone: "+91-9876543226",
        email: "rohan.gupta@email.com",
        destination: "Shimla, India",
        campaign: "Domestic Holiday Packages",
        travel_date: "2026-07-15",
        budget: 25000,
        status: "OPEN",
        assigned_to: null,
        lead_score: 35,
        temperature: "COLD",
        lead_type: "HOLIDAY",
        travel_purpose: "HOLIDAY",
        adults_count: 2,
        children_count: 0,
      },
      {
        full_name: "Divya Nair",
        phone: "+91-9876543227",
        email: "divya.nair@email.com",
        destination: "Maldives",
        campaign: "Maldives Honeymoon Special",
        travel_date: "2026-06-25",
        budget: 400000,
        status: "CONVERTED",
        assigned_to: "priya@travel-crm.com",
        lead_score: 92,
        temperature: "HOT",
        lead_type: "HOLIDAY",
        travel_purpose: "HONEYMOON",
        adults_count: 2,
        children_count: 0,
      },
    ];

    const leadIds = new Map();
    const hasLeadCustomerId = await hasColumn("leads", "customer_id");

    for (const lead of leads) {
      const existing = await client.query(
        "SELECT id FROM leads WHERE email = $1 LIMIT 1",
        [lead.email],
      );
      if (existing.rowCount) {
        leadIds.set(lead.email, existing.rows[0].id);
        continue;
      }

      const destinationId = destinationIds.get(lead.destination) || null;
      const campaignId = lead.campaign ? campaignIds.get(lead.campaign) : null;
      const assignedTo = lead.assigned_to
        ? userIds.get(lead.assigned_to)
        : null;
      const customerId = customerIds.get(lead.email) || null;

      const payload = {
        full_name: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        destination_id: destinationId,
        travel_date: lead.travel_date,
        budget: lead.budget,
        source: lead.campaign ? "Ads" : "Walk-in",
        campaign_id: campaignId,
        lead_score: lead.lead_score,
        is_vip: lead.lead_score >= 90,
        status: lead.status,
        assigned_to: assignedTo,
        qualification_completed: lead.status !== "OPEN",
        next_followup_date: lead.status === "FOLLOW_UP" ? "2026-04-05" : null,
        pan_number: "ABCDE1234F",
        address_line: "Sample Address Line, India",
        client_currency: "INR",
        nationality: lead.nationality,
        adults_count: lead.adults_count,
        children_count: lead.children_count,
        visa_required: false,
        lead_type: lead.lead_type,
        travel_purpose: lead.travel_purpose,
        sub_status: lead.status === "QUOTED" ? "Quote Sent" : null,
        temperature: lead.temperature,
        followup_attempts: lead.status === "FOLLOW_UP" ? 1 : 0,
      };

      if (hasLeadCustomerId) {
        payload.customer_id = customerId;
      }

      const inserted = await insertRow("leads", payload, { returning: ["id"] });
      if (inserted) {
        leadIds.set(lead.email, inserted.id);
        console.log(`  Created lead: ${lead.full_name}`);
      }
    }

    if (await hasTable("customer_leads")) {
      for (const lead of leads) {
        const customerId = customerIds.get(lead.email);
        const leadId = leadIds.get(lead.email);
        if (!customerId || !leadId) {
          continue;
        }
        await insertRow(
          "customer_leads",
          { customer_id: customerId, lead_id: leadId, is_deleted: false },
          { onConflict: "(customer_id, lead_id) DO NOTHING", returning: false },
        );
      }
    }

    if (await hasTable("lead_activities")) {
      const activities = [
        {
          email: "amit.kumar@email.com",
          type: "CALL",
          notes: "Intro call completed.",
        },
        {
          email: "neha.sharma@email.com",
          type: "WHATSAPP",
          notes: "Shared initial package details.",
        },
        {
          email: "vikram.singh@email.com",
          type: "EMAIL",
          notes: "Sent quotation draft.",
        },
      ];

      for (const activity of activities) {
        const leadId = leadIds.get(activity.email);
        if (!leadId) continue;
        await insertRow("lead_activities", {
          lead_id: leadId,
          user_id: userIds.get("rajesh@travel-crm.com"),
          activity_type: activity.type,
          notes: activity.notes,
        });
      }
    }

    console.log("Creating quotation templates...");

    if (await hasTable("quotation_templates")) {
      const templates = [
        {
          code: "READY_PACKAGE",
          name: "Ready Package Template",
          template_type: "READY_PACKAGE",
        },
        { code: "VISA_TEMPLATE", name: "Visa Template", template_type: "VISA" },
        {
          code: "CUSTOM_ITINERARY",
          name: "Custom Itinerary Template",
          template_type: "CUSTOM_ITINERARY",
        },
      ];

      for (const template of templates) {
        await upsertByUnique("quotation_templates", "code", {
          ...template,
          header_branding: "Get2Vacation Holidays",
          inclusions: "Hotel, Transfers, Breakfast",
          exclusions: "Flights, Visa fees",
          payment_terms: "50% advance to confirm booking",
          cancellation_policy: "As per supplier policy",
          footer_disclaimer: "Prices subject to availability",
          min_margin_percent: 15,
          is_active: true,
          created_by: userIds.get("admin@travel-crm.com"),
        });
      }
    }

    console.log("Creating quotations...");

    const templateRow = await getRowByUnique(
      "quotation_templates",
      "code",
      "READY_PACKAGE",
    );
    const templateId = templateRow ? templateRow.id : null;

    const quotations = [
      {
        leadEmail: "amit.kumar@email.com",
        status: "APPROVED",
        totalCost: 150000,
        marginPercent: 20,
      },
      {
        leadEmail: "neha.sharma@email.com",
        status: "SENT",
        totalCost: 220000,
        marginPercent: 18,
      },
      {
        leadEmail: "vikram.singh@email.com",
        status: "SENT",
        totalCost: 120000,
        marginPercent: 16,
      },
      {
        leadEmail: "divya.nair@email.com",
        status: "APPROVED",
        totalCost: 260000,
        marginPercent: 20,
      },
    ];

    const quotationIds = new Map();

    for (const [index, quote] of quotations.entries()) {
      const leadId = leadIds.get(quote.leadEmail);
      if (!leadId) continue;

      const existing = await client.query(
        "SELECT id FROM quotations WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 1",
        [leadId],
      );
      if (existing.rowCount) {
        quotationIds.set(quote.leadEmail, existing.rows[0].id);
        continue;
      }

      const marginAmount = Math.round(
        (quote.totalCost * quote.marginPercent) / 100,
      );
      const taxAmount = Math.round(quote.totalCost * 0.05);
      const finalPrice = quote.totalCost + marginAmount + taxAmount;

      const payload = {
        lead_id: leadId,
        created_by: userIds.get("admin@travel-crm.com"),
        pricing_id: null,
        template_id: templateId,
        quote_number: `Q-2026-${String(index + 1).padStart(4, "0")}`,
        total_cost: quote.totalCost,
        margin_percent: quote.marginPercent,
        margin_amount: marginAmount,
        tax: taxAmount,
        tax_amount: taxAmount,
        final_price: finalPrice,
        supplier_cost: quote.totalCost * 0.8,
        supplier_tax_amount: taxAmount,
        markup_amount: marginAmount,
        service_fee_amount: 2000,
        gst_amount: taxAmount,
        tcs_amount: 0,
        total_sale_value: finalPrice,
        cost_currency: "INR",
        client_currency: "INR",
        supplier_currency: "INR",
        min_margin_percent: 15,
        requires_approval: quote.marginPercent < 15,
        status: quote.status,
        sent_at: quote.status !== "DRAFT" ? new Date().toISOString() : null,
        sent_by: userIds.get("admin@travel-crm.com"),
        pdf_generated_at: new Date().toISOString(),
        pdf_generated_by: userIds.get("admin@travel-crm.com"),
        view_count: quote.status === "SENT" ? 1 : 0,
        first_viewed_at:
          quote.status === "SENT" ? new Date().toISOString() : null,
        last_viewed_at:
          quote.status === "SENT" ? new Date().toISOString() : null,
        lead_to_quote_minutes: 45,
      };

      const inserted = await insertRow("quotations", payload, {
        returning: ["id"],
      });
      if (inserted) {
        quotationIds.set(quote.leadEmail, inserted.id);
        console.log(`  Created quotation for: ${quote.leadEmail}`);
      }
    }

    if (await hasTable("quotation_items")) {
      for (const [leadEmail, quotationId] of quotationIds.entries()) {
        await insertRow("quotation_items", {
          quotation_id: quotationId,
          item_type: "HOTEL",
          description: `Hotel package for ${leadEmail}`,
          cost: 60000,
        });
        await insertRow("quotation_items", {
          quotation_id: quotationId,
          item_type: "TRANSFER",
          description: "Airport transfers",
          cost: 5000,
        });
      }
    }

    if (await hasTable("quotation_views")) {
      for (const quotationId of quotationIds.values()) {
        await insertRow("quotation_views", {
          quotation_id: quotationId,
          ip_address: "192.168.0.12",
          device_info: "Chrome on Windows",
          user_agent: "Mozilla/5.0",
        });
      }
    }

    if (await hasTable("quotation_send_logs")) {
      for (const quotationId of quotationIds.values()) {
        await insertRow("quotation_send_logs", {
          quotation_id: quotationId,
          sent_by: userIds.get("admin@travel-crm.com"),
          delivery_channel: "WHATSAPP",
          recipient_email: "client@example.com",
          recipient_phone: "+91-9000000000",
          metadata: { template: "quote_sent" },
        });
      }
    }

    console.log("Creating bookings...");

    const bookings = [
      { leadEmail: "amit.kumar@email.com", nights: 4, status: "CONFIRMED" },
      { leadEmail: "divya.nair@email.com", nights: 6, status: "CONFIRMED" },
    ];

    const bookingIds = new Map();

    for (const [index, booking] of bookings.entries()) {
      const quotationId = quotationIds.get(booking.leadEmail);
      if (!quotationId) continue;

      const existing = await client.query(
        "SELECT id FROM bookings WHERE quotation_id = $1 LIMIT 1",
        [quotationId],
      );
      if (existing.rowCount) {
        bookingIds.set(booking.leadEmail, existing.rows[0].id);
        continue;
      }

      const leadRow = await client.query(
        "SELECT travel_date FROM leads WHERE id = $1",
        [leadIds.get(booking.leadEmail)],
      );
      const travelStart = toDateString(
        leadRow.rows[0]?.travel_date || "2026-06-01",
      );
      const travelEnd = addDays(travelStart, booking.nights);

      const quoteRow = await client.query(
        "SELECT total_cost, final_price FROM quotations WHERE id = $1",
        [quotationId],
      );
      const totalAmount = Number(quoteRow.rows[0]?.final_price || 100000);
      const costAmount = Number(quoteRow.rows[0]?.total_cost || 80000);

      const payload = {
        quotation_id: quotationId,
        booking_number: `BK-2026-${String(index + 1).padStart(4, "0")}`,
        travel_start_date: travelStart,
        travel_end_date: travelEnd,
        total_amount: totalAmount,
        cost_amount: costAmount,
        status: booking.status,
        payment_status: "PARTIAL",
        advance_required: Math.round(totalAmount * 0.5),
        advance_received: Math.round(totalAmount * 0.3),
        client_currency: "INR",
        supplier_currency: "INR",
        exchange_rate: 1,
        exchange_locked: true,
        created_by: userIds.get("admin@travel-crm.com"),
        is_deleted: false,
      };

      const inserted = await insertRow("bookings", payload, {
        returning: ["id"],
      });
      if (inserted) {
        bookingIds.set(booking.leadEmail, inserted.id);
        console.log(`  Created booking for: ${booking.leadEmail}`);
      }
    }

    console.log("Creating payments...");

    for (const bookingId of bookingIds.values()) {
      await insertRow("payments", {
        booking_id: bookingId,
        amount: 50000,
        currency: "INR",
        payment_mode: "BANK_TRANSFER",
        status: "PARTIAL",
        is_verified: true,
        paid_at: new Date().toISOString(),
      });

      await insertRow("payments", {
        booking_id: bookingId,
        amount: 70000,
        currency: "INR",
        payment_mode: "PAYMENT_GATEWAY",
        status: "FULL",
        is_verified: false,
        paid_at: new Date().toISOString(),
      });
    }

    if (await hasTable("invoices")) {
      let index = 0;
      for (const bookingId of bookingIds.values()) {
        index += 1;
        await insertRow("invoices", {
          booking_id: bookingId,
          invoice_number: `INV-2026-${String(index).padStart(4, "0")}`,
          pdf_url: null,
          generated_at: new Date().toISOString(),
        });
      }
    }

    console.log("Creating suppliers...");

    const suppliers = [
      {
        name: "Bali Tours & Travel",
        contact_person: "Made Wijaya",
        email: "contact@balitoursandtravel.com",
        phone: "+62-274-555-123",
        country: "Indonesia",
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
        name: "Maldives Resorts Ltd",
        contact_person: "Ali Hameed",
        email: "bookings@maldivesresorts.mv",
        phone: "+960-330-5000",
        country: "Maldives",
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
        name: "Dubai Tourism Services",
        contact_person: "Hassan Ali",
        email: "info@dubaitourism.ae",
        phone: "+971-4-308-1111",
        country: "UAE",
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
        name: "Singapore Tours",
        contact_person: "Lee Wei Ming",
        email: "hello@singaporetours.sg",
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
      },
      {
        name: "Goa Beach Resorts",
        contact_person: "Ramesh Naik",
        email: "reservations@goabeachresorts.com",
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
      },
    ];

    const supplierIds = new Map();
    for (const supplier of suppliers) {
      const row = await upsertByUnique("suppliers", "email", {
        ...supplier,
        is_active: true,
      });
      if (row) {
        supplierIds.set(supplier.email, row.id);
        console.log(`  Created/updated supplier: ${supplier.email}`);
      }
    }

    if (await hasTable("supplier_payables")) {
      console.log("Creating supplier payables...");
      
      // Payable 1: Maldives - Partial payment
      const maldivesSupplier = supplierIds.get("bookings@maldivesresorts.mv");
      const divyaBooking = bookingIds.get("divya.nair@email.com");
      if (maldivesSupplier && divyaBooking) {
        await insertRow("supplier_payables", {
          booking_id: divyaBooking,
          supplier_id: maldivesSupplier,
          payable_amount: 350000,
          paid_amount: 175000,
          due_date: addDays(toDateString(new Date()), 2),
          status: "PARTIAL",
          payment_reference: "PAY-2026-002",
          last_paid_at: new Date().toISOString(),
        });
        console.log("  Created payable: Maldives (Partial)");
      }
      
      // Payable 2: Bali - Fully paid
      const baliSupplier = supplierIds.get("contact@balitoursandtravel.com");
      const amitBooking = bookingIds.get("amit.kumar@email.com");
      if (baliSupplier && amitBooking) {
        await insertRow("supplier_payables", {
          booking_id: amitBooking,
          supplier_id: baliSupplier,
          payable_amount: 150000,
          paid_amount: 150000,
          due_date: addDays(toDateString(new Date()), -5),
          status: "PAID",
          payment_reference: "PAY-2026-001",
          last_paid_at: new Date().toISOString(),
        });
        console.log("  Created payable: Bali (Paid)");
      }
      
      // Payable 3: Dubai - Pending (if we have a Dubai booking)
      const dubaiSupplier = supplierIds.get("info@dubaitourism.ae");
      if (dubaiSupplier && divyaBooking) {
        await insertRow("supplier_payables", {
          booking_id: divyaBooking,
          supplier_id: dubaiSupplier,
          payable_amount: 120000,
          paid_amount: 0,
          due_date: addDays(toDateString(new Date()), 7),
          status: "PENDING",
          payment_reference: "PAY-2026-003",
          last_paid_at: null,
        });
        console.log("  Created payable: Dubai (Pending)");
      }
    }

    console.log("Creating visa cases...");

    if (await hasTable("visa_cases")) {
      const bookingId = bookingIds.get("amit.kumar@email.com");
      const supplierId = supplierIds.get("contact@balitoursandtravel.com");
      if (bookingId && supplierId) {
        const existing = await client.query(
          "SELECT id FROM visa_cases WHERE booking_id = $1 LIMIT 1",
          [bookingId],
        );
        if (!existing.rowCount) {
          const visaCase = await insertRow("visa_cases", {
            booking_id: bookingId,
            supplier_id: supplierId,
            country: "Indonesia",
            visa_type: "Tourist",
            fees: 3500,
            appointment_date: "2026-04-01",
            submission_date: "2026-04-02",
            status: "SUBMITTED",
          });

          if (visaCase && (await hasTable("visa_documents"))) {
            await insertRow("visa_documents", {
              visa_case_id: visaCase.id,
              document_type: "Passport",
              file_url: "https://example.com/passport.pdf",
              is_verified: true,
            });
          }
        }
      }
    }

    if (await hasTable("booking_documents")) {
      const bookingId = bookingIds.get("amit.kumar@email.com");
      if (bookingId) {
        await insertRow("booking_documents", {
          booking_id: bookingId,
          document_type: "Voucher",
          file_url: "https://example.com/voucher.pdf",
          is_verified: true,
          uploaded_by: userIds.get("admin@travel-crm.com"),
          verified_by: userIds.get("admin@travel-crm.com"),
        });
      }
    }

    console.log("Creating complaints...");

    if (await hasTable("complaints")) {
      const bookingId = bookingIds.get("amit.kumar@email.com");
      if (bookingId) {
        await insertRow("complaints", {
          booking_id: bookingId,
          assigned_to: userIds.get("finance@travel-crm.com"),
          issue_type: "Hotel quality issue",
          description: "Hotel was not as per pictures shown.",
          status: "RESOLVED",
        });
      }
    }

    console.log("Creating refunds...");

    if (await hasTable("refunds")) {
      const bookingId = bookingIds.get("amit.kumar@email.com");
      if (bookingId) {
        await insertRow("refunds", {
          booking_id: bookingId,
          refund_amount: 10000,
          status: "APPROVED",
          supplier_penalty: 2000,
          service_charge: 500,
        });
      }
    }

    console.log("Creating packages...");

    if (await hasTable("packages")) {
      const packages = [
        {
          name: "Bali Beach Paradise",
          destination: "Bali, Indonesia",
          duration: "5 Days / 4 Nights",
          starting_price: 35000,
          package_category: "BEACH",
          status: "ACTIVE",
          publish_to_website: true,
          website_slug: "bali-beach-paradise",
        },
        {
          name: "Maldives Luxury Retreat",
          destination: "Maldives",
          duration: "7 Days / 6 Nights",
          starting_price: 85000,
          package_category: "LUXURY",
          status: "ACTIVE",
          publish_to_website: true,
          website_slug: "maldives-luxury-retreat",
        },
        {
          name: "Dubai City Explorer",
          destination: "Dubai, UAE",
          duration: "4 Days / 3 Nights",
          starting_price: 45000,
          package_category: "CITY",
          status: "ACTIVE",
          publish_to_website: true,
          website_slug: "dubai-city-explorer",
        },
      ];

      for (const pkg of packages) {
        await upsertByUnique("packages", "website_slug", {
          ...pkg,
          created_by: userIds.get("admin@travel-crm.com"),
        });
      }
    }

    if (await hasTable("package_enquiries")) {
      const packageRow = await getRowByUnique(
        "packages",
        "website_slug",
        "bali-beach-paradise",
      );
      if (packageRow) {
        await insertRow("package_enquiries", {
          package_id: packageRow.id,
          package_name: packageRow.name,
          travel_date: "2026-05-15",
          travellers_count: 2,
          full_name: "Sample Enquiry",
          phone: "+91-9000000001",
          email: "enquiry@example.com",
          source: "Website - Package Page",
        });
      }
    }

    await client.query("COMMIT");

    console.log("Database seeding completed successfully.");
    console.log("Test Users:");
    console.log("  Admin: admin@travel-crm.com / admin@123");
    console.log("  Sales: rajesh@travel-crm.com / user@123");
    console.log("  Sales: priya@travel-crm.com / user@123");
    console.log("  Sales: anand@travel-crm.com / user@123");
    console.log("  Visa: visa@travel-crm.com / user@123");
    console.log("  Finance: finance@travel-crm.com / user@123");
    console.log("  Marketing: marketing@travel-crm.com / user@123");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Database seeding failed:", error.message);
    throw error;
  } finally {
    await client.close();
  }
}

seedDatabase().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
