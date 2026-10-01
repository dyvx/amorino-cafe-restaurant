import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";
import { hashPassword } from "./auth";
import { BRAND_CONFIG } from "@/config/brand";

function resolveWritableDbPath(): string {
  // On Vercel serverless, /var/task is read-only; /tmp is writable
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "amorino.db");
  }
  try {
    const localDataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(localDataDir)) {
      fs.mkdirSync(localDataDir, { recursive: true });
    }
    fs.accessSync(localDataDir, fs.constants.W_OK);
    return path.join(localDataDir, "amorino.db");
  } catch {
    return path.join(os.tmpdir(), "amorino.db");
  }
}

const globalForDb = globalThis as unknown as {
  amorinoSqlite?: Database.Database;
};

export function getDb(): Database.Database {
  if (!globalForDb.amorinoSqlite) {
    const dbPath = resolveWritableDbPath();
    const db = new Database(dbPath);
    try {
      db.pragma("journal_mode = WAL");
    } catch {
      // Fallback if tmpfs does not support WAL shm locking
    }
    db.pragma("foreign_keys = ON");
    initializeSchema(db);
    seedInitialData(db);
    globalForDb.amorinoSqlite = db;
  }
  return globalForDb.amorinoSqlite;
}

export function hydrateOrders(db: Database.Database, rawOrders: any[]) {
  if (!rawOrders.length) return [];
  const getItems = db.prepare(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC"
  );
  const getCusts = db.prepare(
    "SELECT * FROM order_item_customizations WHERE order_item_id = ? ORDER BY id ASC"
  );

  return rawOrders.map((order) => {
    const items = getItems.all(order.id) as any[];
    const hydratedItems = items.map((item) => ({
      ...item,
      customizations: getCusts.all(item.id),
    }));
    return {
      ...order,
      items: hydratedItems,
    };
  });
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF', 'KITCHEN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS restaurant_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      logo_url TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES',
      is_open INTEGER NOT NULL DEFAULT 1,
      opening_hours TEXT NOT NULL,
      address_placeholder TEXT NOT NULL,
      phone_placeholder TEXT NOT NULL,
      instagram_placeholder TEXT NOT NULL,
      tax_percent REAL NOT NULL DEFAULT 0,
      service_charge_percent REAL NOT NULL DEFAULT 0,
      hero_statement_en TEXT NOT NULL,
      hero_statement_so TEXT NOT NULL,
      hero_statement_sw TEXT NOT NULL,
      seasonal_badge_en TEXT NOT NULL,
      seasonal_badge_so TEXT NOT NULL,
      seasonal_badge_sw TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      zone TEXT NOT NULL DEFAULT 'Main Salon',
      capacity INTEGER NOT NULL DEFAULT 4,
      qr_token TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS table_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_id INTEGER NOT NULL,
      table_code TEXT NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CLOSED')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_so TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      description TEXT NOT NULL,
      description_so TEXT NOT NULL,
      description_sw TEXT NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_so TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      description TEXT NOT NULL,
      description_so TEXT NOT NULL,
      description_sw TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES',
      image_url TEXT NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_popular INTEGER NOT NULL DEFAULT 0,
      prep_time_minutes INTEGER NOT NULL DEFAULT 15,
      prep_estimate_label TEXT NOT NULL DEFAULT '15–20 mins',
      ingredients TEXT NOT NULL DEFAULT '[]',
      allergens TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS customization_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_so TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      is_required INTEGER NOT NULL DEFAULT 0,
      min_selections INTEGER NOT NULL DEFAULT 0,
      max_selections INTEGER NOT NULL DEFAULT 5,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS customization_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      name_so TEXT NOT NULL,
      name_sw TEXT NOT NULL,
      price_adjustment REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (group_id) REFERENCES customization_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS menu_item_customization_groups (
      menu_item_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      PRIMARY KEY (menu_item_id, group_id),
      FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES customization_groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number INTEGER NOT NULL UNIQUE,
      table_id INTEGER NOT NULL,
      table_code TEXT NOT NULL,
      table_session_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      service_charge REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'KES',
      customer_note TEXT DEFAULT '',
      rejection_reason TEXT DEFAULT '',
      estimated_prep_minutes INTEGER NOT NULL DEFAULT 15,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      preparing_at TEXT,
      ready_at TEXT,
      completed_at TEXT,
      cancelled_at TEXT,
      FOREIGN KEY (table_id) REFERENCES tables(id),
      FOREIGN KEY (table_session_id) REFERENCES table_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      menu_item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_name_so TEXT NOT NULL,
      item_name_sw TEXT NOT NULL,
      unit_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      line_total REAL NOT NULL,
      special_note TEXT DEFAULT '',
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_item_customizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_item_id INTEGER NOT NULL,
      option_id INTEGER NOT NULL,
      group_name TEXT NOT NULL,
      option_name TEXT NOT NULL,
      option_name_so TEXT NOT NULL,
      option_name_sw TEXT NOT NULL,
      price_adjustment REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    );

    -- Required database indexes (Section 36)
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_table_session ON orders(table_session_id);
    CREATE INDEX IF NOT EXISTS idx_orders_table_code ON orders(table_code);
    CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(table_id, status);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON menu_items(is_available, is_featured);
  `);
}

function seedInitialData(db: Database.Database) {
  const existingSettings = db
    .prepare("SELECT id FROM restaurant_settings WHERE id = 1")
    .get();
  if (existingSettings) return;

  // 1. Seed Restaurant Settings (strictly following Rule 39 & 55 with editable placeholders)
  db.prepare(
    `INSERT INTO restaurant_settings (
      id, name, country, logo_url, currency, is_open,
      opening_hours, address_placeholder, phone_placeholder, instagram_placeholder,
      tax_percent, service_charge_percent,
      hero_statement_en, hero_statement_so, hero_statement_sw,
      seasonal_badge_en, seasonal_badge_so, seasonal_badge_sw
    ) VALUES (
      1, ?, ?, ?, 'KES', 1,
      '[Opening Hours] • 07:30 AM – 11:00 PM EAT',
      '[Restaurant Address] • Kenya',
      '[Phone Number]',
      '[Instagram]',
      0, 0,
      'Where artisanal East African coffee heritage meets contemporary culinary mastery.',
      'Halka farshaxanka qaxwaha Bariga Afrika iyo cunnada casriga ah ee raaxada leh ay ku kulmaan.',
      'Ambapo urithi wa kahawa maalum ya Afrika Mashariki unakutana na ufundi wa kisasa wa upishi.',
      'AMORINO CULINARY EDITION • KENYA',
      'XULASHADA GAARKA AH EE AMORINO • KENYA',
      'TOLEO MAALUM LA AMORINO • KENYA'
    )`
  ).run(
    BRAND_CONFIG.name,
    BRAND_CONFIG.country,
    BRAND_CONFIG.officialLogoUrl
  );

  // 2. Seed Users (ADMIN, STAFF, KITCHEN) with scrypt hashed passwords
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)`
  );
  insertUser.run(
    "Amorino Executive Director",
    "admin@amorino.co.ke",
    hashPassword("amorino-admin-2026"),
    "ADMIN"
  );
  insertUser.run(
    "Floor Maitre D' & Service",
    "staff@amorino.co.ke",
    hashPassword("amorino-staff-2026"),
    "STAFF"
  );
  insertUser.run(
    "Executive Kitchen Brigade",
    "kitchen@amorino.co.ke",
    hashPassword("amorino-kitchen-2026"),
    "KITCHEN"
  );

  // 3. Seed Tables (T01 through T12)
  const insertTable = db.prepare(
    `INSERT INTO tables (code, name, zone, capacity, qr_token, is_active) VALUES (?, ?, ?, ?, ?, 1)`
  );
  const zones = [
    "Main Dining Salon",
    "Roastery Lounge",
    "Courtyard Veranda",
    "Private Sanctuary",
  ];
  for (let i = 1; i <= 12; i++) {
    const code = `T${String(i).padStart(2, "0")}`;
    const zone = zones[(i - 1) % zones.length];
    const cap = i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2;
    insertTable.run(code, `Table ${i}`, zone, cap, `amr-${code.toLowerCase()}-v1`);
  }

  // 4. Seed Categories (EN, SO, SW)
  const insertCategory = db.prepare(`
    INSERT INTO categories (
      slug, name, name_so, name_sw,
      description, description_so, description_sw,
      image_url, sort_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const categoriesData = [
    {
      slug: "signature-coffee",
      name: "Signature Coffee & Espresso",
      name_so: "Qaxwaha Gaarka ah & Espresso",
      name_sw: "Kahawa Maalum na Espresso",
      description: "Single-origin Kenyan AA micro-lots roasted to velvet perfection.",
      description_so: "Qaxwaha tayada sare leh ee Kenya AA oo si farshaxan ah loo dubay.",
      description_sw: "Kahawa bora ya Kenya AA iliyokaangwa kwa ustadi wa hali ya juu.",
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=85",
      sort_order: 1,
    },
    {
      slug: "burgers-brioche",
      name: "Artisanal Burgers",
      name_so: "Bargarada Gaarka ah",
      name_sw: "Baga za Kifahari",
      description: "Flame-seared cuts on toasted golden brioche with house infusions.",
      description_so: "Hilib iyo digaag lagu dubay dab oo lagu daray rooti brioche ah.",
      description_sw: "Nyama na kuku choma kwenye mkate laini wa brioche na mchuzi maalum.",
      image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=85",
      sort_order: 2,
    },
    {
      slug: "prime-grill-chicken",
      name: "Prime Grill & Chicken",
      name_so: "Hilbaha & Digaagga Duban",
      name_sw: "Nyama na Kuku Choma",
      description: "Char-grilled poultry and aged cuts seasoned with coastal spices.",
      description_so: "Digaag iyo hilib lagu dubay dhuxul oo leh xawaash udgoon.",
      description_sw: "Kuku na nyama iliyochomwa kwa viungo vya pwani.",
      image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1000&q=85",
      sort_order: 3,
    },
    {
      slug: "pasta-risotto",
      name: "Handmade Pasta",
      name_so: "Baasto Gacanta Lagu Sameeyay",
      name_sw: "Pasta ya Kutengenezwa Kwa Mkono",
      description: "Silky bronze-die pasta finished in rich reductions and aged Parmigiano.",
      description_so: "Baasto cusub oo lagu kariyay suugo macaan iyo farmaajo.",
      description_sw: "Pasta laini iliyopikwa kwa mchuzi mzito na jibini ya Parmigiano.",
      image_url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281298?auto=format&fit=crop&w=1000&q=85",
      sort_order: 4,
    },
    {
      slug: "wood-fired-pizza",
      name: "Artisanal Pizza",
      name_so: "Biisada Foornada",
      name_sw: "Pizza ya Kuni",
      description: "48-hour fermented sourdough crust blistered in our stone hearth.",
      description_so: "Biiso lagu dubay foornada dhagaxa ah oo leh farmaajo dabiici ah.",
      description_sw: "Pizza iliyookwa kwenye jiko la mawe kwa unga uliochachushwa saa 48.",
      image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=85",
      sort_order: 5,
    },
    {
      slug: "coastal-seafood",
      name: "Coastal Seafood",
      name_so: "Cunnada Badda",
      name_sw: "Vyakula vya Baharini",
      description: "Indian Ocean catch prepared with saffron, citrus, and herb butter.",
      description_so: "Kalluun cusub oo laga keenay Badweynta Hindiya oo lagu daray liin iyo subag.",
      description_sw: "Samaki wabichi wa Bahari ya Hindi waliopikwa kwa zafarani na siagi.",
      image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1000&q=85",
      sort_order: 6,
    },
    {
      slug: "breakfast-brunch",
      name: "Morning Salon & Breakfast",
      name_so: "Quraacda Subaxdii",
      name_sw: "Kifungua Kinywa cha Kifahari",
      description: "Elevated morning plates, laminated pastries, and organic farm eggs.",
      description_so: "Quraac raaxo leh, roodhi diiran, iyo ukun cusub.",
      description_sw: "Chakula cha asubuhi cha kifahari, keki laini na mayai ya kienyeji.",
      image_url: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1000&q=85",
      sort_order: 7,
    },
    {
      slug: "patisserie-desserts",
      name: "Patisserie & Desserts",
      name_so: "Macmacaanka Gaarka ah",
      name_sw: "Vitindamlo na Keki",
      description: "Sculpted dark chocolate, Madagascar vanilla bean, and warm tarts.",
      description_so: "Shukulaato madow, faniila udgoon, iyo macmacaan diiran.",
      description_sw: "Chokoleti nyeusi, vanila halisi, na vitindamlo vitamu.",
      image_url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1000&q=85",
      sort_order: 8,
    },
    {
      slug: "botanical-drinks",
      name: "Drinks & Botanical Elixirs",
      name_so: "Cabitaannada Qabow",
      name_sw: "Vinywaji na Juisi Asili",
      description: "Cold-pressed tropical nectars, spiced hibiscus, and artisanal tonics.",
      description_so: "Cabitaanno dabiici ah oo laga miiro miraha cusub.",
      description_sw: "Juisi halisi za matunda ya kitropiki na vinywaji baridi.",
      image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1000&q=85",
      sort_order: 9,
    },
  ];

  const categoryIds: Record<string, number> = {};
  for (const cat of categoriesData) {
    const res = insertCategory.run(
      cat.slug,
      cat.name,
      cat.name_so,
      cat.name_sw,
      cat.description,
      cat.description_so,
      cat.description_sw,
      cat.image_url,
      cat.sort_order
    );
    categoryIds[cat.slug] = Number(res.lastInsertRowid);
  }

  // 5. Seed Customization Groups & Options (Exact matches for Section 9 + Coffee & Grill options)
  const insertGroup = db.prepare(`
    INSERT INTO customization_groups (name, name_so, name_sw, is_required, min_selections, max_selections, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);
  const insertOption = db.prepare(`
    INSERT INTO customization_options (group_id, name, name_so, name_sw, price_adjustment, is_active, sort_order)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `);

  // Group 1: Add-ons (Section 9 exact examples included)
  const addonsGroupRes = insertGroup.run(
    "Add-ons",
    "Ku-daris Dheeraad ah",
    "Viambatanisho vya Ziada",
    0,
    0,
    4
  );
  const addonsGroupId = Number(addonsGroupRes.lastInsertRowid);
  insertOption.run(addonsGroupId, "Extra cheese", "Farmaajo dheeraad ah", "Jibini ya ziada", 100, 1);
  insertOption.run(addonsGroupId, "Extra chicken", "Digaag dheeraad ah", "Kuku wa ziada", 250, 2);
  insertOption.run(addonsGroupId, "Extra sauce", "Suugo dheeraad ah", "Mchuzi wa ziada", 50, 3);
  insertOption.run(addonsGroupId, "Sliced Hass Avocado", "Afokaado cusub", "Parachichi safi", 150, 4);

  // Group 2: Options / Kitchen Preparation (Section 9 exact examples included)
  const optionsGroupRes = insertGroup.run(
    "Preparation Options",
    "Habka Diyaarinta",
    "Chaguo za Maandalizi",
    0,
    0,
    5
  );
  const optionsGroupId = Number(optionsGroupRes.lastInsertRowid);
  insertOption.run(optionsGroupId, "No onions", "Basal la'aan", "Bila kitunguu", 0, 1);
  insertOption.run(optionsGroupId, "No tomato", "Yaanyo la'aan", "Bila nyanya", 0, 2);
  insertOption.run(optionsGroupId, "Extra spicy", "Basbaas dheeraad ah", "Pilipili nyingi", 0, 3);
  insertOption.run(optionsGroupId, "Mild", "Basbaas yar", "Pilipili kidogo", 0, 4);
  insertOption.run(optionsGroupId, "Well done", "Si fiican loo kariyay", "Iive vizuri", 0, 5);

  // Group 3: Roastery & Barista Customizations
  const baristaGroupRes = insertGroup.run(
    "Roastery & Milk Enhancements",
    "Doorashada Caanaha & Qaxwaha",
    "Chaguo la Maziwa na Kahawa",
    0,
    0,
    3
  );
  const baristaGroupId = Number(baristaGroupRes.lastInsertRowid);
  insertOption.run(baristaGroupId, "Extra Espresso Shot", "Espresso dheeraad ah", "Espresso ya ziada", 120, 1);
  insertOption.run(baristaGroupId, "Barista Oat Milk", "Caano Oat", "Maziwa ya shayiri", 150, 2);
  insertOption.run(baristaGroupId, "Fresh Camel Milk", "Caano Geel cusub", "Maziwa ya ngamia", 100, 3);
  insertOption.run(baristaGroupId, "Madagascar Vanilla Bean Syrup", "Sharoobada Faniila", "ladha ya Vanila", 80, 4);
  insertOption.run(baristaGroupId, "Served Over Artisanal Ice", "Baraf lagu daray", "Ikiwa na barafu", 0, 5);

  // 6. Seed Menu Items (including exact Grilled Chicken Burger KES 850 from Section 8)
  const insertMenuItem = db.prepare(`
    INSERT INTO menu_items (
      category_id, name, name_so, name_sw,
      description, description_so, description_sw,
      price, currency, image_url,
      is_available, is_featured, is_popular,
      prep_time_minutes, prep_estimate_label,
      ingredients, allergens, tags, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'KES', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const linkItemGroup = db.prepare(`
    INSERT INTO menu_item_customization_groups (menu_item_id, group_id) VALUES (?, ?)
  `);

  const menuItemsData = [
    // Exact item from Section 8
    {
      cat: "burgers-brioche",
      name: "Grilled Chicken Burger",
      name_so: "Bargar Digaag Duban",
      name_sw: "Baga ya Kuku Choma",
      description: "Tender grilled chicken, fresh lettuce, tomato and signature sauce.",
      description_so: "Digaag jilicsan oo la dubay, ansalaato cusub, yaanyo iyo suugada gaarka ah ee Amorino.",
      description_sw: "Kuku laini aliyechomwa, saladi safi, nyanya na mchuzi maalum wa Amorino.",
      price: 850,
      image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 1,
      prep_time_minutes: 15,
      prep_estimate_label: "15–18 mins",
      ingredients: ["Free-range chicken breast", "Toasted butter brioche", "Crisp butterhead lettuce", "Vine-ripened tomato", "Amorino gold signature sauce"],
      allergens: ["Gluten", "Egg", "Dairy"],
      tags: ["Chef's Signature", "Halal Certified"],
      sort_order: 1,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "burgers-brioche",
      name: "Wagyu & Aged Cheddar Brioche",
      name_so: "Bargar Hilib Wagyu & Farmaajo",
      name_sw: "Baga ya Nyama ya Wagyu na Jibini",
      description: "Double-seared prime beef patty, 18-month aged white cheddar, caramelized shallots, and black garlic aioli.",
      description_so: "Hilib lo'aad oo tayo sare leh, farmaajo cheddar ah, basal la dubay iyo suugo toonta madow.",
      description_sw: "Nyama bora ya ng'ombe, jibini iliyokomaa ya cheddar, vitunguu vya kukaanga na aioli ya kitunguu saumu.",
      price: 1250,
      image_url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 1,
      prep_time_minutes: 18,
      prep_estimate_label: "15–20 mins",
      ingredients: ["Prime grass-fed beef", "Aged white cheddar", "Caramelized shallots", "Black garlic aioli", "Artisanal brioche bun"],
      allergens: ["Gluten", "Dairy", "Egg"],
      tags: ["Halal Certified", "Most Loved"],
      sort_order: 2,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "signature-coffee",
      name: "Amorino Gold Crema Cortado",
      name_so: "Qaxwaha Dahabiga ee Amorino Cortado",
      name_sw: "Kahawa ya Amorino Gold Cortado",
      description: "Double ristretto of Nyeri AA reserve beans folded with silky micro-foamed milk and a whisper of raw cardamom.",
      description_so: "Qaxwaha Nyeri AA oo lagu daray caano xumbo jilicsan leh iyo heyl udgoon.",
      description_sw: "Espresso maradufu ya Nyeri AA iliyochanganywa na maziwa laini na iliki kidogo.",
      price: 480,
      image_url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 1,
      prep_time_minutes: 6,
      prep_estimate_label: "5–8 mins",
      ingredients: ["Single-origin Nyeri AA espresso", "Velvet steamed organic milk", "Crushed green cardamom pod"],
      allergens: ["Dairy (Optional plant milk)"],
      tags: ["House Signature", "Single Origin"],
      sort_order: 1,
      groups: [baristaGroupId],
    },
    {
      cat: "signature-coffee",
      name: "Spiced Somali Qaxwo & Saffron Latte",
      name_so: "Qaxwo Soomaali & Saffron Latte",
      name_sw: "Latte ya Kahawa ya Kisomali na Zafarani",
      description: "Heritage roast infused with Persian saffron threads, cinnamon bark, clove, and velvety steamed milk.",
      description_so: "Qaxwo dhaqameed lagu daray sacfaraan, qorfe, dhego-yare iyo caano diiran.",
      description_sw: "Kahawa ya asili iliyokolezwa zafarani, mdalasini, karafuu na maziwa ya moto.",
      price: 520,
      image_url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 7,
      prep_estimate_label: "6–8 mins",
      ingredients: ["Kenyan dark roast espresso", "Saffron threads", "Ceylon cinnamon", "Steamed whole milk"],
      allergens: ["Dairy"],
      tags: ["Heritage Blend"],
      sort_order: 2,
      groups: [baristaGroupId],
    },
    {
      cat: "prime-grill-chicken",
      name: "Char-Grilled Herb Half Chicken",
      name_so: "Nus Digaag Lagu Dubay Dhuxul & Geedo Udgoon",
      name_sw: "Nusu Kuku Choma wa Viungo Asili",
      description: "24-hour marinated free-range chicken basted in rosemary-citrus butter, served with roasted baby potatoes and jus.",
      description_so: "Digaag lagu qooyay xawaash 24 saac oo lagu dubay subag iyo liin, lala keenayo baradho duban.",
      description_sw: "Kuku wa kienyeji aliyewekwa viungo kwa saa 24 na kuchomwa kwa siagi ya limau na viazi vidogo.",
      price: 1450,
      image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 1,
      prep_time_minutes: 22,
      prep_estimate_label: "20–25 mins",
      ingredients: ["Free-range half chicken", "Fresh rosemary & thyme", "Preserved lemon butter", "Herb-roasted baby potatoes"],
      allergens: ["Dairy"],
      tags: ["Halal Certified", "Gluten-Free"],
      sort_order: 1,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "prime-grill-chicken",
      name: "Prime Beef Tenderloin Medallions",
      name_so: "Cadad Hilib Lo'aad oo Jilicsan (Tenderloin)",
      name_sw: "Minofu Bora ya Nyama ya Ng'ombe (Tenderloin)",
      description: "Pan-seared grass-fed beef medallions, crushed black peppercorn velouté, charred asparagus, and truffle mash.",
      description_so: "Hilib lo'aad oo aad u jilicsan, suugo filfil madow ah, iyo baradho lagu daray subag.",
      description_sw: "Minofu laini ya nyama ya ng'ombe, mchuzi wa pilipili manga, na viazi vilivyopondwa.",
      price: 2150,
      image_url: "https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 25,
      prep_estimate_label: "20–25 mins",
      ingredients: ["250g Beef tenderloin", "Madagascar green & black peppercorns", "Charred asparagus spears", "Mashed Yukon potatoes"],
      allergens: ["Dairy"],
      tags: ["Chef's Reserve", "Halal Certified"],
      sort_order: 2,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "pasta-risotto",
      name: "Saffron & Roasted Chicken Tagliatelle",
      name_so: "Baasto Tagliatelle, Digaag & Sacfaraan",
      name_sw: "Tambi za Tagliatelle za Kuku na Zafarani",
      description: "Hand-cut egg ribbons tossed with pulled roasted chicken, sun-dried tomatoes, cream reduction, and 24-month Parmigiano.",
      description_so: "Baasto cusub oo lagu daray digaag duban, yaanyo la qalajiyay, labeen iyo farmaajo Parmigiano.",
      description_sw: "Tambi laini zilizochanganywa na kuku choma, nyanya kavu, krimu na jibini ya Parmigiano.",
      price: 1350,
      image_url: "https://images.unsplash.com/photo-1621996346565-e3d5d6281298?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 16,
      prep_estimate_label: "15–18 mins",
      ingredients: ["Artisanal egg tagliatelle", "Roasted chicken tenderloin", "Saffron cream reduction", "Aged Parmigiano-Reggiano", "Fresh basil"],
      allergens: ["Gluten", "Egg", "Dairy"],
      tags: ["Handmade Daily"],
      sort_order: 1,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "wood-fired-pizza",
      name: "Truffle Burrata & Wild Mushroom Pizza",
      name_so: "Biiso Farmaajo Burrata & Likaha Kaynta",
      name_sw: "Pizza ya Jibini ya Burrata na Uyoga",
      description: "Stone-baked sourdough topped with roasted cremini mushrooms, creamy pugliese burrata, thyme, and white truffle oil.",
      description_so: "Biiso lagu dubay dhagax oo leh likaha la dubay, farmaajo burrata oo jilicsan iyo saliidda truffle.",
      description_sw: "Pizza iliyookwa kwenye mawe ikiwa na uyoga wa kukaanga, jibini laini ya burrata na mafuta ya truffle.",
      price: 1550,
      image_url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 18,
      prep_estimate_label: "15–20 mins",
      ingredients: ["48h fermented sourdough", "Fresh burrata", "Wild forest mushrooms", "White truffle olive oil", "Fresh thyme"],
      allergens: ["Gluten", "Dairy"],
      tags: ["Vegetarian", "Stone Hearth"],
      sort_order: 1,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "coastal-seafood",
      name: "Swahili Coconut & Lime King Prawns",
      name_so: "kalluunka Prawns-ka ee Qumbaha & Liinta",
      name_sw: "Kamba Wakubwa wa Nazi na Limau",
      description: "Jumbo Indian Ocean prawns seared in garlic-coriander butter over a velvety coastal coconut-tamarind emulsion.",
      description_so: "Kalluunka prawns-ka waaweyn ee Badweynta Hindiya oo lagu kariyay subag toon leh iyo suugo qumbe.",
      description_sw: "Kamba wakubwa wa Bahari ya Hindi waliokaangwa kwa siagi ya kitunguu saumu na mchuzi wa nazi na ukwaju.",
      price: 1950,
      image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 0,
      prep_time_minutes: 20,
      prep_estimate_label: "18–22 mins",
      ingredients: ["Jumbo tiger prawns", "Cold-pressed coconut cream", "Kilifi lime zest", "Tamarind glaze", "Steamed jasmine rice"],
      allergens: ["Shellfish", "Dairy"],
      tags: ["Coastal Signature", "Gluten-Free"],
      sort_order: 1,
      groups: [optionsGroupId],
    },
    {
      cat: "breakfast-brunch",
      name: "Royal Poached Eggs & Smoked Salmon Brioche",
      name_so: "Ukun la Kariyay & Kalluun Salmon oo ku jira Brioche",
      name_sw: "Mayai Yaliyoiva kwa Mvuke na Samaki wa Salmoni",
      description: "Two organic farm eggs, Norwegian oak-smoked salmon, crushed avocado, citrus hollandaise on toasted brioche.",
      description_so: "Laba ukun oo dabiici ah, kalluun salmon ah, afokaado iyo suugo hollandaise oo lagu dul dhigay brioche.",
      description_sw: "Mayai mawili ya kienyeji, samaki wa salmoni, parachichi na mchuzi wa hollandaise kwenye mkate wa brioche.",
      price: 1150,
      image_url: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 14,
      prep_estimate_label: "12–15 mins",
      ingredients: ["Organic free-range eggs", "Oak-smoked salmon", "Hass avocado", "Warm citrus hollandaise", "Toasted brioche"],
      allergens: ["Egg", "Fish", "Gluten", "Dairy"],
      tags: ["Morning Favorite"],
      sort_order: 1,
      groups: [addonsGroupId, optionsGroupId],
    },
    {
      cat: "patisserie-desserts",
      name: "Amorino Espresso & Dark Gold Tiramisu",
      name_so: "Macmacaanka Tiramisu ee Qaxwaha Amorino",
      name_sw: "Tiramisu ya Espresso ya Amorino",
      description: "Savoiardi biscuits soaked in our Kenyan AA espresso, layered with mascarpone zabaglione and 70% Valrhona cocoa.",
      description_so: "Buskud lagu qooyay qaxwaha Amorino oo lagu daray labeen mascarpone iyo shukulaato madow.",
      description_sw: "Biskuti zilizolowekwa kwenye espresso yetu ya Kenya AA pamoja na krimu ya mascarpone na kakao.",
      price: 780,
      image_url: "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 1,
      is_popular: 1,
      prep_time_minutes: 8,
      prep_estimate_label: "5–10 mins",
      ingredients: ["Mascarpone cream", "Amorino Kenyan AA espresso", "Savoiardi ladyfingers", "70% Dark cocoa dust"],
      allergens: ["Dairy", "Egg", "Gluten"],
      tags: ["Alcohol-Free", "Patisserie Signature"],
      sort_order: 1,
      groups: [],
    },
    {
      cat: "botanical-drinks",
      name: "Kilifi Mango & Passion Gold Elixir",
      name_so: "Cabitaanka Canbaha Kilifi & Passion-ka",
      name_sw: "Juisi Maalum ya Embe la Kilifi naarakoi",
      description: "Sun-ripened coastal mango nectar layered with tart passion fruit seeds, fresh mint blossom, and sparkling spring water.",
      description_so: "Canbe macaan oo laga keenay xeebta oo lagu daray miraha passion-ka iyo caleenta naacnaaca.",
      description_sw: "Juisi halisi ya embe la pwani iliyochanganywa na شغف (passion) na majani ya mnanaa.",
      price: 420,
      image_url: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1100&q=85",
      is_available: 1,
      is_featured: 0,
      is_popular: 1,
      prep_time_minutes: 5,
      prep_estimate_label: "5 mins",
      ingredients: ["Cold-pressed Kilifi mango", "Fresh passion fruit pulp", "Garden spearmint", "Chilled spring water"],
      allergens: [],
      tags: ["100% Natural", "Refreshing"],
      sort_order: 1,
      groups: [],
    },
  ];

  const insertedMenuItems: Record<string, number> = {};
  for (const item of menuItemsData) {
    const catId = categoryIds[item.cat];
    const res = insertMenuItem.run(
      catId,
      item.name,
      item.name_so,
      item.name_sw,
      item.description,
      item.description_so,
      item.description_sw,
      item.price,
      item.image_url,
      item.is_available,
      item.is_featured,
      item.is_popular,
      item.prep_time_minutes,
      item.prep_estimate_label,
      JSON.stringify(item.ingredients),
      JSON.stringify(item.allergens),
      JSON.stringify(item.tags),
      item.sort_order
    );
    const itemId = Number(res.lastInsertRowid);
    insertedMenuItems[item.name] = itemId;
    for (const gId of item.groups) {
      linkItemGroup.run(itemId, gId);
    }
  }

  // 7. Seed Realistic Active Table Sessions & Orders (Demonstrating Section 15 & Section 17 right away!)
  // Table 12 session with multiple orders (#1021 Preparing, #1022 Pending/Waiting, #1023 Ready, #1024 Accepted for Kitchen)
  const table12 = db.prepare("SELECT id, code FROM tables WHERE code = 'T12'").get() as { id: number; code: string };
  const table04 = db.prepare("SELECT id, code FROM tables WHERE code = 'T04'").get() as { id: number; code: string };
  const table07 = db.prepare("SELECT id, code FROM tables WHERE code = 'T07'").get() as { id: number; code: string };

  const session12Res = db
    .prepare("INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, 'T12', 'session-t12-active', 'ACTIVE')")
    .run(table12.id);
  const session12Id = Number(session12Res.lastInsertRowid);

  const session04Res = db
    .prepare("INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, 'T04', 'session-t04-active', 'ACTIVE')")
    .run(table04.id);
  const session04Id = Number(session04Res.lastInsertRowid);

  const session07Res = db
    .prepare("INSERT INTO table_sessions (table_id, table_code, session_token, status) VALUES (?, 'T07', 'session-t07-active', 'ACTIVE')")
    .run(table07.id);
  const session07Id = Number(session07Res.lastInsertRowid);

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, table_id, table_code, table_session_id, status,
      subtotal, tax_amount, service_charge, total, currency,
      customer_note, estimated_prep_minutes,
      created_at, accepted_at, preparing_at, ready_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 'KES', ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (
      order_id, menu_item_id, item_name, item_name_so, item_name_sw,
      unit_price, quantity, line_total, special_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderCust = db.prepare(`
    INSERT INTO order_item_customizations (
      order_item_id, option_id, group_name, option_name, option_name_so, option_name_sw, price_adjustment
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

  // Order #1020 (Completed earlier on Table 07 for analytics)
  const o1020 = insertOrder.run(
    1020,
    table07.id,
    "T07",
    session07Id,
    "COMPLETED",
    2900,
    2900,
    "",
    20,
    minsAgo(55),
    minsAgo(52),
    minsAgo(50),
    minsAgo(32),
    minsAgo(25)
  );
  insertOrderItem.run(
    o1020.lastInsertRowid,
    insertedMenuItems["Char-Grilled Herb Half Chicken"],
    "Char-Grilled Herb Half Chicken",
    "Nus Digaag Lagu Dubay Dhuxul & Geedo Udgoon",
    "Nusu Kuku Choma wa Viungo Asili",
    1450,
    2,
    2900,
    "Well basted"
  );

  // Order #1021 — Table 12 — PREPARING (Matches Section 15 example!)
  const o1021 = insertOrder.run(
    1021,
    table12.id,
    "T12",
    session12Id,
    "PREPARING",
    2220,
    2220,
    "Extra spicy",
    18,
    minsAgo(14),
    minsAgo(12),
    minsAgo(9),
    null,
    null
  );
  const oi1021_1 = insertOrderItem.run(
    o1021.lastInsertRowid,
    insertedMenuItems["Grilled Chicken Burger"],
    "Grilled Chicken Burger",
    "Bargar Digaag Duban",
    "Baga ya Kuku Choma",
    950,
    2,
    1900,
    "Extra spicy"
  );
  insertOrderCust.run(
    oi1021_1.lastInsertRowid,
    1,
    "Add-ons",
    "Extra cheese",
    "Farmaajo dheeraad ah",
    "Jibini ya ziada",
    100
  );
  insertOrderCust.run(
    oi1021_1.lastInsertRowid,
    5,
    "Preparation Options",
    "No onions",
    "Basal la'aan",
    "Bila kitunguu",
    0
  );
  insertOrderItem.run(
    o1021.lastInsertRowid,
    insertedMenuItems["Kilifi Mango & Passion Gold Elixir"],
    "Kilifi Mango & Passion Gold Elixir",
    "Cabitaanka Canbaha Kilifi & Passion-ka",
    "Juisi Maalum ya Embe la Kilifi naarakoi",
    420,
    1,
    420,
    ""
  );

  // Order #1022 — Table 12 — PENDING / Waiting (Matches Section 15 example!)
  const o1022 = insertOrder.run(
    1022,
    table12.id,
    "T12",
    session12Id,
    "PENDING",
    1260,
    1260,
    "Please bring coffee together with the tiramisu",
    10,
    minsAgo(2),
    null,
    null,
    null,
    null
  );
  insertOrderItem.run(
    o1022.lastInsertRowid,
    insertedMenuItems["Amorino Gold Crema Cortado"],
    "Amorino Gold Crema Cortado",
    "Qaxwaha Dahabiga ee Amorino Cortado",
    "Kahawa ya Amorino Gold Cortado",
    480,
    1,
    480,
    ""
  );
  insertOrderItem.run(
    o1022.lastInsertRowid,
    insertedMenuItems["Amorino Espresso & Dark Gold Tiramisu"],
    "Amorino Espresso & Dark Gold Tiramisu",
    "Macmacaanka Tiramisu ee Qaxwaha Amorino",
    "Tiramisu ya Espresso ya Amorino",
    780,
    1,
    780,
    ""
  );

  // Order #1023 — Table 12 — READY (Matches Section 15 example!)
  const o1023 = insertOrder.run(
    1023,
    table12.id,
    "T12",
    session12Id,
    "READY",
    520,
    520,
    "",
    8,
    minsAgo(19),
    minsAgo(17),
    minsAgo(15),
    minsAgo(1),
    null
  );
  insertOrderItem.run(
    o1023.lastInsertRowid,
    insertedMenuItems["Spiced Somali Qaxwo & Saffron Latte"],
    "Spiced Somali Qaxwo & Saffron Latte",
    "Qaxwo Soomaali & Saffron Latte",
    "Latte ya Kahawa ya Kisomali na Zafarani",
    520,
    1,
    520,
    ""
  );

  // Order #1024 — Table 04 — ACCEPTED (Shows in Kitchen NEW column!)
  const o1024 = insertOrder.run(
    1024,
    table04.id,
    "T04",
    session04Id,
    "ACCEPTED",
    2800,
    2800,
    "Serve pizza warm at the center of the table",
    18,
    minsAgo(4),
    minsAgo(2),
    null,
    null,
    null
  );
  insertOrderItem.run(
    o1024.lastInsertRowid,
    insertedMenuItems["Wagyu & Aged Cheddar Brioche"],
    "Wagyu & Aged Cheddar Brioche",
    "Bargar Hilib Wagyu & Farmaajo",
    "Baga ya Nyama ya Wagyu na Jibini",
    1250,
    1,
    1250,
    "Well done"
  );
  insertOrderItem.run(
    o1024.lastInsertRowid,
    insertedMenuItems["Truffle Burrata & Wild Mushroom Pizza"],
    "Truffle Burrata & Wild Mushroom Pizza",
    "Biiso Farmaajo Burrata & Likaha Kaynta",
    "Pizza ya Jibini ya Burrata na Uyoga",
    1550,
    1,
    1550,
    ""
  );
}
