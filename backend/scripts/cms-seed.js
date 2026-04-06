import dotenv from "dotenv";
import { Client } from "pg";
import bcrypt from "bcryptjs";

dotenv.config();

const CMS_ADMIN_USER = Object.freeze({
  fullName: "CMS Admin",
  email: "admin@travel-cms.com",
  password: "admin@123",
  role: "CMS_ACCESS",
});

function q(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

async function upsert(client, tableName, payload, conflictColumns) {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined);
  const columns = entries.map(([column]) => column);
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

  const result = await client.query(
    `INSERT INTO ${q(tableName)} (${columns.map((column) => q(column)).join(", ")})
     VALUES (${placeholders})
     ON CONFLICT (${conflictColumns.map((column) => q(column)).join(", ")})
     ${updateColumns.length ? `DO UPDATE SET ${updateColumns
       .map((column) => `${q(column)} = EXCLUDED.${q(column)}`)
       .join(", ")}` : "DO NOTHING"}
     RETURNING *`,
    values,
  );

  if (result.rows[0]) {
    return result.rows[0];
  }

  const existing = await client.query(
    `SELECT * FROM ${q(tableName)} WHERE ${conflictColumns
      .map((column, index) => `${q(column)} = $${index + 1}`)
      .join(" AND ")}
     LIMIT 1`,
    conflictColumns.map((column) => payload[column]),
  );
  return existing.rows[0] || null;
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS landing_hero_sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      section_key VARCHAR(100) UNIQUE NOT NULL,
      eyebrow_text VARCHAR(200),
      heading_line_1 VARCHAR(255),
      heading_line_2 VARCHAR(255),
      description TEXT,
      primary_cta_label VARCHAR(100),
      primary_cta_url TEXT,
      secondary_cta_label VARCHAR(100),
      secondary_cta_url TEXT,
      background_image_url TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE landing_places ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
    ALTER TABLE landing_places ADD COLUMN IF NOT EXISTS subtitle VARCHAR(180);
    ALTER TABLE landing_places ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100);
    ALTER TABLE landing_places ADD COLUMN IF NOT EXISTS cta_url TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_landing_places_slug ON landing_places(slug);
  `);

  await client.query(`
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS campaign_type VARCHAR(50) DEFAULT 'featured';
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS section_key VARCHAR(80) DEFAULT 'featured-hot-picks';
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS expires_on DATE;
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS cta_url TEXT;
    ALTER TABLE featured_picks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_featured_picks_slug ON featured_picks(slug);
  `);

  await client.query(`
    ALTER TABLE season_cards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE season_cards ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);

  await client.query(`
    ALTER TABLE visa_destinations ADD COLUMN IF NOT EXISTS icon_name VARCHAR(80);
    ALTER TABLE visa_destinations ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE visa_destinations ADD COLUMN IF NOT EXISTS cta_text VARCHAR(50) DEFAULT 'View Details';
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_destination_media_destination_url
      ON destination_media(destination_id, media_url);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_visa_details_destination_section_label
      ON visa_destination_details(visa_destination_id, section_type, label);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS cms_media_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(100) NOT NULL,
      entity_id UUID NOT NULL,
      media_kind VARCHAR(20) NOT NULL DEFAULT 'image',
      media_url TEXT NOT NULL,
      thumbnail_url TEXT,
      title VARCHAR(200),
      alt_text VARCHAR(250),
      display_order INT DEFAULT 0,
      is_primary BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cms_media_assets_entity
      ON cms_media_assets(entity_type, entity_id, display_order);
    CREATE UNIQUE INDEX IF NOT EXISTS ux_cms_media_assets_entity_url
      ON cms_media_assets(entity_type, entity_id, media_url);
  `);
}

async function ensureCmsAccessUser(client) {
  const roleResult = await client.query(
    `
      INSERT INTO roles (name, description, is_active)
      VALUES ($1, $2, TRUE)
      ON CONFLICT (name)
      DO UPDATE SET
        description = EXCLUDED.description,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, name
    `,
    [CMS_ADMIN_USER.role, "CMS-only access role"],
  );

  const roleId = roleResult.rows?.[0]?.id;
  if (!roleId) {
    throw new Error("Failed to resolve CMS_ACCESS role.");
  }

  const passwordHash = await bcrypt.hash(CMS_ADMIN_USER.password, 12);

  await client.query(
    `
      INSERT INTO users (full_name, email, phone, password_hash, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        role_id = EXCLUDED.role_id,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, email
    `,
    [
      CMS_ADMIN_USER.fullName,
      CMS_ADMIN_USER.email,
      null,
      passwordHash,
      roleId,
    ],
  );

  await client.query(
    `
      UPDATE users
      SET
        is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
      WHERE role_id = $1
        AND email <> $2
    `,
    [roleId, CMS_ADMIN_USER.email],
  );
}

function seedData() {
  return {
    hero: {
      section_key: "home-hero",
      eyebrow_text: "CRAFTED FOR THE GLOBAL TRAVELLER",
      heading_line_1: "Luxury Holidays,",
      heading_line_2: "Beyond Borders",
      description:
        "Discover world-class destinations, bespoke travel experiences, and seamless visa services for UAE travellers.",
      primary_cta_label: "Explore Destinations",
      primary_cta_url: "/destinations",
      secondary_cta_label: "Check Visa Services",
      secondary_cta_url: "/visa",
      background_image_url: "https://images.example.com/hero/home-hero.jpg",
      is_active: true,
    },
    landingPlaces: [
      { slug: "maldives-landing", name: "Maldives", subtitle: "Luxury Escape", description: "Luxury Escape", tag: "Luxury Escape", cta_text: "View Details", cta_url: "/destinations/maldives", image_url: "https://images.example.com/landing/maldives.jpg", display_order: 1, is_active: true },
      { slug: "japan-landing", name: "Japan", subtitle: "Cultural Journey", description: "Cultural Journey", tag: "Cultural Journey", cta_text: "View Details", cta_url: "/destinations/japan", image_url: "https://images.example.com/landing/japan.jpg", display_order: 2, is_active: true },
      { slug: "georgia-landing", name: "Georgia", subtitle: "Family Favourite", description: "Family Favourite", tag: "Family Favourite", cta_text: "View Details", cta_url: "/destinations/georgia", image_url: "https://images.example.com/landing/georgia.jpg", display_order: 3, is_active: true },
      { slug: "turkey-landing", name: "Turkey", subtitle: "Adventure & Culture", description: "Adventure & Culture", tag: "Adventure & Culture", cta_text: "View Details", cta_url: "/destinations/turkey", image_url: "https://images.example.com/landing/turkey.jpg", display_order: 4, is_active: true },
    ],
    destinations: [
      { slug: "maldives", name: "Maldives", description: "Overwater villas and turquoise lagoons.", short_description: "Overwater villas and effortless romance.", country: "Maldives", region: "Asia", category: "Luxury", rating: 4.9, hero_image_url: "https://images.example.com/destinations/maldives-hero.jpg", thumbnail_url: "https://images.example.com/destinations/maldives-thumb.jpg", is_popular: true, is_new: false, travel_type: "Leisure", season: "Dry", meta_title: "Maldives Holiday Packages", meta_description: "Premium Maldives packages.", is_active: true },
      { slug: "sri-lanka", name: "Sri Lanka", description: "Culture and nature escapes.", short_description: "A perfect blend of culture and nature.", country: "Sri Lanka", region: "Asia", category: "Culture", rating: 4.8, hero_image_url: "https://images.example.com/destinations/sri-lanka-hero.jpg", thumbnail_url: "https://images.example.com/destinations/sri-lanka-thumb.jpg", is_popular: true, is_new: false, travel_type: "Culture", season: "Shoulder", meta_title: "Sri Lanka Cultural Tours", meta_description: "Handpicked Sri Lanka itineraries.", is_active: true },
      { slug: "kenya", name: "Kenya", description: "Premium safari experiences.", short_description: "Great migration and curated lodges.", country: "Kenya", region: "Africa", category: "Safari", rating: 4.9, hero_image_url: "https://images.example.com/destinations/kenya-hero.jpg", thumbnail_url: "https://images.example.com/destinations/kenya-thumb.jpg", is_popular: true, is_new: true, travel_type: "Safari", season: "Dry", meta_title: "Kenya Safari Packages", meta_description: "Early bird safari experiences.", is_active: true },
      { slug: "tanzania", name: "Tanzania", description: "Serengeti and crater adventures.", short_description: "Unmatched wildlife and premium stays.", country: "Tanzania", region: "Africa", category: "Safari", rating: 4.9, hero_image_url: "https://images.example.com/destinations/tanzania-hero.jpg", thumbnail_url: "https://images.example.com/destinations/tanzania-thumb.jpg", is_popular: true, is_new: true, travel_type: "Safari", season: "Dry", meta_title: "Tanzania Safari Holidays", meta_description: "Serengeti and Ngorongoro tours.", is_active: true },
    ],
    packages: [
      { website_slug: "maldives-ultra-luxury", name: "Maldives Ultra Luxury", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 20999, package_category: "luxury", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/maldives-ultra.jpg", gallery_image_urls: ["https://images.example.com/packages/maldives-ultra.jpg"], meta_title: "Maldives Ultra Luxury", meta_description: "Premier private island experiences.", publish_to_website: true },
      { website_slug: "maldives-luxury-escape", name: "Maldives Luxury Escape", destination: "Maldives", duration: "6 Days / 5 Nights", starting_price: 2899, package_category: "luxury", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/maldives-luxury.jpg", gallery_image_urls: ["https://images.example.com/packages/maldives-luxury.jpg"], meta_title: "Maldives Luxury Escape", meta_description: "World-class overwater escapes.", publish_to_website: true },
      { website_slug: "maldives-premium", name: "Maldives Premium", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 6899, package_category: "premium", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/maldives-premium.jpg", gallery_image_urls: ["https://images.example.com/packages/maldives-premium.jpg"], meta_title: "Maldives Premium", meta_description: "5-star comfort with value.", publish_to_website: true },
      { website_slug: "maldives-budget", name: "Maldives Budget", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 4099, package_category: "budget", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/maldives-budget.jpg", gallery_image_urls: ["https://images.example.com/packages/maldives-budget.jpg"], meta_title: "Maldives Budget", meta_description: "Affordable island stays.", publish_to_website: true },
      { website_slug: "sri-lanka-cultural-tour", name: "Sri Lanka Cultural Tour", destination: "Sri Lanka", duration: "8 Days / 7 Nights", starting_price: 1299, package_category: "culture", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/sri-lanka.jpg", gallery_image_urls: ["https://images.example.com/packages/sri-lanka.jpg"], meta_title: "Sri Lanka Cultural Tour", meta_description: "Temples and highlands.", publish_to_website: true },
      { website_slug: "kenya-safari-adventure", name: "Kenya Safari Adventure", destination: "Kenya", duration: "7 Days", starting_price: 2299, package_category: "safari", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/kenya.jpg", gallery_image_urls: ["https://images.example.com/packages/kenya.jpg"], meta_title: "Kenya Safari Adventure", meta_description: "Great migration circuits.", publish_to_website: true },
      { website_slug: "tanzania-serengeti-safari", name: "Tanzania Serengeti Safari", destination: "Tanzania", duration: "8 Days", starting_price: 2499, package_category: "safari", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/tanzania.jpg", gallery_image_urls: ["https://images.example.com/packages/tanzania.jpg"], meta_title: "Tanzania Serengeti Safari", meta_description: "Premium safari drives.", publish_to_website: true },
      { website_slug: "cheval-blanc-randheli", name: "Cheval Blanc Randheli", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 58999, package_category: "resort", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/cheval-blanc.jpg", gallery_image_urls: ["https://images.example.com/packages/cheval-blanc.jpg"], meta_title: "Cheval Blanc Randheli", meta_description: "Signature luxury stay.", publish_to_website: true },
      { website_slug: "joali-maldives", name: "JOALI Maldives", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 44999, package_category: "resort", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/joali.jpg", gallery_image_urls: ["https://images.example.com/packages/joali.jpg"], meta_title: "JOALI Maldives", meta_description: "Curated island luxury.", publish_to_website: true },
      { website_slug: "ritz-carlton-maldives", name: "Ritz Carlton", destination: "Maldives", duration: "4 Days / 3 Nights", starting_price: 26999, package_category: "resort", status: "PUBLISHED", banner_image_url: "https://images.example.com/packages/ritz-carlton.jpg", gallery_image_urls: ["https://images.example.com/packages/ritz-carlton.jpg"], meta_title: "Ritz Carlton Maldives", meta_description: "Premium marine life experiences.", publish_to_website: true },
    ],
    visaDestinations: [
      { slug: "schengen-visa", title: "Schengen Visa", subtitle: "For Europe itineraries", description: "Ideal for France, Italy, and wider Europe plans.", image_url: "https://images.example.com/visa/schengen.jpg", hero_image_url: "https://images.example.com/visa/schengen.jpg", processing_time: "15-20 Working Days", support_info: "For Europe itineraries and multi-country holidays", icon_name: "earth", highlights: ["Europe", "Multi-country"], cta_text: "View Details", display_order: 1, is_active: true },
      { slug: "usa-visa", title: "USA Visa", subtitle: "Visitor visa support", description: "DS-160 guidance and interview preparation.", image_url: "https://images.example.com/visa/usa.jpg", hero_image_url: "https://images.example.com/visa/usa.jpg", processing_time: "3-5 Working Days", support_info: "Tourism and business travel support", icon_name: "building", highlights: ["Tourism", "Business"], cta_text: "View Details", display_order: 2, is_active: true },
      { slug: "australia-e-visa", title: "Australia E-Visa", subtitle: "Structured support", description: "Good for premium family and leisure travel.", image_url: "https://images.example.com/visa/australia.jpg", hero_image_url: "https://images.example.com/visa/australia.jpg", processing_time: "3-4 Working Days", support_info: "Long-haul holiday planning", icon_name: "flag", highlights: ["Family", "Leisure"], cta_text: "View Details", display_order: 3, is_active: true },
      { slug: "turkey-visa", title: "Turkey Visa", subtitle: "Convenient support", description: "Popular for quick getaways from the UAE.", image_url: "https://images.example.com/visa/turkey.jpg", hero_image_url: "https://images.example.com/visa/turkey.jpg", processing_time: "5-7 Working Days", support_info: "Short leisure and family travel", icon_name: "passport", highlights: ["Family", "Leisure"], cta_text: "View Details", display_order: 4, is_active: true },
      { slug: "uk-visa", title: "UK Visa", subtitle: "Standard visitor support", description: "Great for city breaks and family visits.", image_url: "https://images.example.com/visa/uk.jpg", hero_image_url: "https://images.example.com/visa/uk.jpg", processing_time: "15-20 Working Days", support_info: "Tourism and family travel", icon_name: "briefcase", highlights: ["City", "Family"], cta_text: "View Details", display_order: 5, is_active: true },
      { slug: "uae-visa-services", title: "UAE Visa Services", subtitle: "Hassle-free processing", description: "Tourist visas for 30/60 days with express add-ons.", image_url: "https://images.example.com/visa/uae.jpg", hero_image_url: "https://images.example.com/visa/uae.jpg", processing_time: "3-5 Business Days", support_info: "Fast processing and online support", icon_name: "shield", highlights: ["Express", "Online"], cta_text: "Book Now", display_order: 6, is_active: true },
    ],
  };
}

async function runSeed(client) {
  const data = seedData();

  const hero = await upsert(client, "landing_hero_sections", data.hero, ["section_key"]);

  const landingRows = [];
  for (const item of data.landingPlaces) {
    landingRows.push(await upsert(client, "landing_places", item, ["slug"]));
  }

  const destinationsBySlug = new Map();
  for (const item of data.destinations) {
    const row = await upsert(client, "destinations", item, ["slug"]);
    destinationsBySlug.set(item.slug, row);
  }

  const maldives = destinationsBySlug.get("maldives");
  if (!maldives) {
    throw new Error("Maldives destination not available.");
  }

  await client.query(`DELETE FROM season_cards WHERE destination_id = $1`, [maldives.id]);
  const seasons = [
    { title: "Dry Season", from_month: "November", to_month: "April", description: "Clear weather for beach days and premium stays.", tag: "Best Time", image_url: "https://images.example.com/seasons/maldives-dry.jpg", icon_name: "leaf", icon_color: "#16a34a", bg_color: "#d1fae5", display_order: 1 },
    { title: "Shoulder Season", from_month: "May", to_month: "October", description: "Better value with practical weather windows.", tag: "Good Deals", image_url: "https://images.example.com/seasons/maldives-shoulder.jpg", icon_name: "sun", icon_color: "#ca8a04", bg_color: "#fef9c3", display_order: 2 },
    { title: "Wet Season", from_month: "June", to_month: "September", description: "Budget period with mixed skies and rain chances.", tag: "Budget / Rainy", image_url: "https://images.example.com/seasons/maldives-wet.jpg", icon_name: "cloud-rain", icon_color: "#ea580c", bg_color: "#ffedd5", display_order: 3 },
    { title: "Festive Season", from_month: "Dec", to_month: "Jan", description: "Peak demand and premium resort pricing.", tag: "Peak / Premium", image_url: "https://images.example.com/seasons/maldives-festive.jpg", icon_name: "snowflake", icon_color: "#2563eb", bg_color: "#dbeafe", display_order: 4 },
  ];
  const seasonRows = [];
  for (const season of seasons) {
    const result = await client.query(
      `INSERT INTO season_cards (
        destination_id, title, from_month, to_month, description, tag,
        image_url, icon_name, icon_color, bg_color, display_order, is_active
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
      RETURNING *`,
      [
        maldives.id,
        season.title,
        season.from_month,
        season.to_month,
        season.description,
        season.tag,
        season.image_url,
        season.icon_name,
        season.icon_color,
        season.bg_color,
        season.display_order,
      ],
    );
    seasonRows.push(result.rows[0]);
  }

  for (const [slug, destination] of destinationsBySlug) {
    await upsert(
      client,
      "destination_media",
      {
        destination_id: destination.id,
        media_type: "image",
        media_url: destination.hero_image_url,
        thumbnail_url: destination.thumbnail_url,
        title: `${destination.name} Hero`,
        caption: `${destination.name} primary media`,
        display_order: 1,
        is_featured: true,
      },
      ["destination_id", "media_url"],
    );
    if (slug === "maldives") {
      await upsert(
        client,
        "destination_media",
        {
          destination_id: destination.id,
          media_type: "image",
          media_url: "https://images.example.com/destinations/maldives-lagoon.jpg",
          thumbnail_url: "https://images.example.com/destinations/maldives-lagoon-thumb.jpg",
          title: "Maldives Lagoon",
          caption: "Secondary media",
          display_order: 2,
          is_featured: false,
        },
        ["destination_id", "media_url"],
      );
    }
  }

  const packagesBySlug = new Map();
  for (const item of data.packages) {
    const row = await upsert(
      client,
      "packages",
      {
        ...item,
        website_last_synced_at: new Date(),
        is_deleted: false,
      },
      ["website_slug"],
    );
    packagesBySlug.set(item.website_slug, row);
  }

  const mainSlugs = ["maldives-ultra-luxury", "maldives-luxury-escape", "maldives-premium", "maldives-budget"];
  const mainBySlug = new Map();
  const mainRows = [];
  for (let index = 0; index < mainSlugs.length; index += 1) {
    const packageRow = packagesBySlug.get(mainSlugs[index]);
    if (!packageRow) continue;
    const mainRow = await upsert(
      client,
      "main_packages",
      { package_id: packageRow.id, display_order: index + 1, is_featured: index < 2 },
      ["package_id"],
    );
    mainBySlug.set(mainSlugs[index], mainRow);
    mainRows.push({ mainRow, packageRow });
  }

  for (let index = 0; index < mainSlugs.length; index += 1) {
    const mainRow = mainBySlug.get(mainSlugs[index]);
    if (!mainRow) continue;
    await upsert(
      client,
      "destination_package_map",
      { destination_id: maldives.id, main_package_id: mainRow.id, display_order: index + 1 },
      ["destination_id", "main_package_id"],
    );
  }

  const ultra = mainBySlug.get("maldives-ultra-luxury");
  const subRows = [];
  if (ultra) {
    const subSlugs = ["cheval-blanc-randheli", "joali-maldives", "ritz-carlton-maldives"];
    for (let index = 0; index < subSlugs.length; index += 1) {
      const subPackage = packagesBySlug.get(subSlugs[index]);
      if (!subPackage) continue;
      const subRow = await upsert(
        client,
        "sub_packages",
        { main_package_id: ultra.id, package_id: subPackage.id, display_order: index + 1 },
        ["main_package_id", "package_id"],
      );
      subRows.push({ subRow, packageRow: subPackage });
    }
  }

  const visaBySlug = new Map();
  for (const item of data.visaDestinations) {
    const row = await upsert(client, "visa_destinations", item, ["slug"]);
    visaBySlug.set(item.slug, row);
  }

  const visaDetails = [
    ["schengen-visa", "requirement", "Processing Time", "15-20 Working Days", 1],
    ["usa-visa", "fact", "Support Scope", "DS-160 support plus interview prep", 1],
    ["australia-e-visa", "overview", "Best For", "Long-haul family travel", 1],
    ["turkey-visa", "note", "Popular Route", "Short leisure and family trips", 1],
    ["uk-visa", "requirement", "Ideal Use", "City breaks and family visits", 1],
  ];

  for (const [visaSlug, sectionType, label, value, displayOrder] of visaDetails) {
    const visaDestination = visaBySlug.get(visaSlug);
    if (!visaDestination) continue;
    await upsert(
      client,
      "visa_destination_details",
      {
        visa_destination_id: visaDestination.id,
        section_type: sectionType,
        label,
        value,
        display_order: displayOrder,
      },
      ["visa_destination_id", "section_type", "label"],
    );
  }

  const featuredPicks = [
    { slug: "featured-maldives-luxury-escape", title: "Maldives Luxury Escape", subtitle: "Maldives", category: "package", campaign_type: "featured", section_key: "featured-hot-picks", reference_id: packagesBySlug.get("maldives-luxury-escape")?.id ?? null, country: "Maldives", rating: 4.9, badge_text: "Hot Deal", original_price: 3499, discounted_price: 2899, duration: "6 Days / 5 Nights", description: "Overwater villas and curated experiences.", image_url: "https://images.example.com/featured/maldives-hot-pick.jpg", button_text: "Book Now", cta_url: "/packages/maldives-luxury-escape", tags: ["Overwater Villa", "All-Inclusive Meals", "Snorkeling Trip"], highlights: ["Flights Included"], display_order: 1, is_active: true },
    { slug: "featured-sri-lanka-cultural-tour", title: "Sri Lanka Cultural Tour", subtitle: "Sri Lanka", category: "package", campaign_type: "featured", section_key: "featured-hot-picks", reference_id: packagesBySlug.get("sri-lanka-cultural-tour")?.id ?? null, country: "Sri Lanka", rating: 4.8, badge_text: "Best Seller", original_price: 1799, discounted_price: 1299, duration: "8 Days / 7 Nights", description: "Culture and nature with curated routes.", image_url: "https://images.example.com/featured/sri-lanka-hot-pick.jpg", button_text: "Book Now", cta_url: "/packages/sri-lanka-cultural-tour", tags: ["Sigiriya", "Temple of Tooth", "Train to Ella"], highlights: ["Flights Included"], display_order: 2, is_active: true },
    { slug: "featured-uae-visa-services", title: "UAE Visa Services", subtitle: "United Arab Emirates", category: "visa_service", campaign_type: "featured", section_key: "featured-hot-picks", reference_id: visaBySlug.get("uae-visa-services")?.id ?? null, country: "United Arab Emirates", rating: 4.9, badge_text: "Express Available", original_price: 190, discounted_price: 120, duration: "3-5 Business Days", description: "Hassle-free UAE visa processing with 30/60 day options.", image_url: "https://images.example.com/featured/uae-visa-hot-pick.jpg", button_text: "Book Now", cta_url: "/visa/uae-visa-services", tags: ["100% Online Process", "Express Service Available"], highlights: ["Fast Processing"], display_order: 3, is_active: true },
    { slug: "early-bird-kenya-safari", title: "Kenya Safari Adventure", subtitle: "Kenya", category: "package", campaign_type: "early_bird", section_key: "early-bird-offers", reference_id: packagesBySlug.get("kenya-safari-adventure")?.id ?? null, country: "Kenya", rating: 4.9, badge_text: "Early Bird", original_price: 3199, discounted_price: 2299, duration: "7 Days", description: "Great migration with premium lodges.", image_url: "https://images.example.com/featured/kenya-early-bird.jpg", button_text: "Claim Offer", cta_url: "/packages/kenya-safari-adventure", expires_on: "2026-05-15", tags: ["Maasai Mara Safari", "Great Migration"], highlights: ["Flights", "Lodges"], display_order: 1, is_active: true },
    { slug: "early-bird-tanzania-serengeti", title: "Tanzania Serengeti Safari", subtitle: "Tanzania", category: "package", campaign_type: "early_bird", section_key: "early-bird-offers", reference_id: packagesBySlug.get("tanzania-serengeti-safari")?.id ?? null, country: "Tanzania", rating: 4.9, badge_text: "Early Bird", original_price: 3499, discounted_price: 2499, duration: "8 Days", description: "Serengeti plains and Ngorongoro crater stays.", image_url: "https://images.example.com/featured/tanzania-early-bird.jpg", button_text: "Claim Offer", cta_url: "/packages/tanzania-serengeti-safari", expires_on: "2026-05-15", tags: ["Serengeti National Park", "Ngorongoro Crater"], highlights: ["Flights", "Lodges"], display_order: 2, is_active: true },
  ];
  const featuredRows = [];
  for (const item of featuredPicks) {
    featuredRows.push(await upsert(client, "featured_picks", item, ["slug"]));
  }

  const mediaAssets = [];
  for (const row of landingRows) {
    mediaAssets.push({ entity_type: "landing_place", entity_id: row.id, media_kind: "image", media_url: row.image_url, thumbnail_url: row.image_url, title: `${row.name} Card`, alt_text: `${row.name} landing card`, display_order: row.display_order || 0, is_primary: true, is_active: true });
  }
  for (const row of destinationsBySlug.values()) {
    mediaAssets.push({ entity_type: "destination", entity_id: row.id, media_kind: "image", media_url: row.hero_image_url, thumbnail_url: row.thumbnail_url || row.hero_image_url, title: `${row.name} Hero`, alt_text: `${row.name} hero media`, display_order: 1, is_primary: true, is_active: true });
  }
  for (const row of packagesBySlug.values()) {
    mediaAssets.push({ entity_type: "package", entity_id: row.id, media_kind: "image", media_url: row.banner_image_url, thumbnail_url: row.banner_image_url, title: `${row.name} Banner`, alt_text: `${row.name} package banner`, display_order: 1, is_primary: true, is_active: true });
  }
  for (const row of seasonRows) {
    if (!row?.image_url) continue;
    mediaAssets.push({ entity_type: "season_card", entity_id: row.id, media_kind: "image", media_url: row.image_url, thumbnail_url: row.image_url, title: `${row.title} Season`, alt_text: `${row.title} seasonal card`, display_order: row.display_order || 0, is_primary: true, is_active: true });
  }
  for (const item of mainRows) {
    if (!item.packageRow?.banner_image_url) continue;
    mediaAssets.push({ entity_type: "main_package", entity_id: item.mainRow.id, media_kind: "image", media_url: item.packageRow.banner_image_url, thumbnail_url: item.packageRow.banner_image_url, title: `${item.packageRow.name} Main Package`, alt_text: `${item.packageRow.name} main package card`, display_order: item.mainRow.display_order || 0, is_primary: true, is_active: true });
  }
  for (const item of subRows) {
    if (!item.packageRow?.banner_image_url) continue;
    mediaAssets.push({ entity_type: "sub_package", entity_id: item.subRow.id, media_kind: "image", media_url: item.packageRow.banner_image_url, thumbnail_url: item.packageRow.banner_image_url, title: `${item.packageRow.name} Sub Package`, alt_text: `${item.packageRow.name} sub package card`, display_order: item.subRow.display_order || 0, is_primary: true, is_active: true });
  }
  for (const row of visaBySlug.values()) {
    mediaAssets.push({ entity_type: "visa_destination", entity_id: row.id, media_kind: "image", media_url: row.image_url, thumbnail_url: row.image_url, title: `${row.title} Card`, alt_text: `${row.title} visa card`, display_order: row.display_order || 0, is_primary: true, is_active: true });
  }
  for (const row of featuredRows) {
    mediaAssets.push({ entity_type: "featured_pick", entity_id: row.id, media_kind: "image", media_url: row.image_url, thumbnail_url: row.image_url, title: `${row.title} Featured`, alt_text: `${row.title} featured card`, display_order: row.display_order || 0, is_primary: true, is_active: true });
  }
  mediaAssets.push({ entity_type: "landing_hero_section", entity_id: hero.id, media_kind: "image", media_url: hero.background_image_url, thumbnail_url: hero.background_image_url, title: "Home Hero Background", alt_text: "Homepage hero background", display_order: 1, is_primary: true, is_active: true });

  for (const item of mediaAssets) {
    await upsert(client, "cms_media_assets", item, ["entity_type", "entity_id", "media_url"]);
  }

  return {
    cmsAuth: 1,
    landing: landingRows.length,
    destinations: destinationsBySlug.size,
    packages: packagesBySlug.size,
    visa: visaBySlug.size,
    featured: featuredRows.length,
    media: mediaAssets.length,
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run cms-seed.");
  }

  const clientConfig = { connectionString: databaseUrl };
  if (databaseUrl.includes(".rds.") || databaseUrl.includes(".rds-")) {
    clientConfig.ssl = { rejectUnauthorized: false };
  }

  const client = new Client(clientConfig);
  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureSchema(client);
    await ensureCmsAccessUser(client);
    const counts = await runSeed(client);
    await client.query("COMMIT");
    console.log("cms-seed completed successfully.");
    console.log(
      `cmsAuth=${counts.cmsAuth}, landing=${counts.landing}, destinations=${counts.destinations}, packages=${counts.packages}, visa=${counts.visa}, featured=${counts.featured}, media=${counts.media}`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("cms-seed failed:", error.message);
  process.exitCode = 1;
});
