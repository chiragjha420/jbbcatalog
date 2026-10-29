import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync('jbb_product_gallery.db');
  await initDatabaseSchema(dbInstance);
  return dbInstance;
}

export async function initDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // 1. Categories table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // 2. Products table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL COLLATE NOCASE,
      sku TEXT COLLATE NOCASE,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      category_name TEXT COLLATE NOCASE,
      keywords TEXT NOT NULL DEFAULT '',
      aliases TEXT NOT NULL DEFAULT '',
      description TEXT,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      image_count INTEGER NOT NULL DEFAULT 0,
      primary_thumbnail_uri TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      recently_viewed_at INTEGER
    );
  `);

  // 3. Images table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      local_uri TEXT NOT NULL,
      thumbnail_uri TEXT NOT NULL,
      width INTEGER,
      height INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  // 4. Indexes for super-fast lookups
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_products_favorite ON products(is_favorite);
    CREATE INDEX IF NOT EXISTS idx_products_recent ON products(recently_viewed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_images_product ON images(product_id, sort_order ASC);
  `);

  // 5. Full-Text Search (FTS5) Table & Synchronization Triggers
  try {
    await db.execAsync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
        id UNINDEXED,
        name,
        sku,
        category_name,
        keywords,
        aliases,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    // Triggers to keep FTS synchronized with products table
    await db.execAsync(`
      CREATE TRIGGER IF NOT EXISTS trg_products_ai AFTER INSERT ON products BEGIN
        INSERT INTO products_fts(id, name, sku, category_name, keywords, aliases)
        VALUES (new.id, new.name, coalesce(new.sku, ''), coalesce(new.category_name, ''), new.keywords, new.aliases);
      END;

      CREATE TRIGGER IF NOT EXISTS trg_products_ad AFTER DELETE ON products BEGIN
        DELETE FROM products_fts WHERE id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_products_au AFTER UPDATE ON products BEGIN
        DELETE FROM products_fts WHERE id = old.id;
        INSERT INTO products_fts(id, name, sku, category_name, keywords, aliases)
        VALUES (new.id, new.name, coalesce(new.sku, ''), coalesce(new.category_name, ''), new.keywords, new.aliases);
      END;
    `);
  } catch (ftsError) {
    console.warn('FTS5 initialization warning (fallback query engine will be used):', ftsError);
  }
}
