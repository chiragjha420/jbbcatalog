import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Product, ProductImage, NewProductInput, NewImageInput, LibraryStats } from '@/types';
import { saveProductImageLocally, deleteLocalImageFiles, getLibraryStorageUsage } from '@/services/imageService';
import { generateAliases } from '@/services/keywordSuggester';

export interface SearchOptions {
  categoryId?: string;
  onlyFavorites?: boolean;
  limit?: number;
}

/**
 * Supercharged offline product search with weighted relevance ranking:
 * 1. Exact name match
 * 2. Prefix name match
 * 3. Name contains query
 * 4. Keyword matches
 * 5. Category matches
 * 6. Alias/Synonym matches
 */
export async function searchProducts(
  rawQuery: string,
  options: SearchOptions = {}
): Promise<Product[]> {
  const db = await getDatabase();
  const query = rawQuery.trim().toLowerCase();
  const { categoryId, onlyFavorites = false, limit = 100 } = options;

  // If query is empty, return latest products (filtered by category or favorites if requested)
  if (!query) {
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params: (string | number)[] = [];

    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }
    if (onlyFavorites) {
      sql += ' AND is_favorite = 1';
    }

    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(limit);

    const rows = await db.getAllAsync<Product>(sql, params);
    return rows;
  }

  // Tokenize query into words (e.g., "12ft snooker" -> ["12ft", "snooker"])
  const tokens = query
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);

  // Clean tokens for FTS5 prefix match
  const ftsTokens = tokens.map(t => `"${t.replace(/"/g, '""')}"*`);
  const ftsExpression = ftsTokens.join(' AND ');

  const exactPattern = query;
  const prefixPattern = `${query}%`;
  const containsPattern = `%${query}%`;

  try {
    // Try FTS5 join first with relevance scoring
    let ftsSql = `
      SELECT p.*,
        (
          (CASE WHEN lower(p.name) = ? THEN 150 ELSE 0 END) +
          (CASE WHEN lower(p.name) LIKE ? THEN 80 ELSE 0 END) +
          (CASE WHEN lower(p.name) LIKE ? THEN 50 ELSE 0 END) +
          (CASE WHEN lower(p.sku) LIKE ? THEN 40 ELSE 0 END) +
          (CASE WHEN lower(p.keywords) LIKE ? THEN 30 ELSE 0 END) +
          (CASE WHEN lower(p.category_name) LIKE ? THEN 25 ELSE 0 END) +
          (CASE WHEN lower(p.aliases) LIKE ? THEN 20 ELSE 0 END)
        ) AS rank_score
      FROM products p
      JOIN products_fts fts ON p.id = fts.id
      WHERE products_fts MATCH ?
    `;

    const ftsParams: (string | number)[] = [
      exactPattern,
      prefixPattern,
      containsPattern,
      containsPattern,
      containsPattern,
      containsPattern,
      containsPattern,
      ftsExpression,
    ];

    if (categoryId) {
      ftsSql += ' AND p.category_id = ?';
      ftsParams.push(categoryId);
    }
    if (onlyFavorites) {
      ftsSql += ' AND p.is_favorite = 1';
    }

    ftsSql += ' ORDER BY rank_score DESC, p.updated_at DESC LIMIT ?';
    ftsParams.push(limit);

    const results = await db.getAllAsync<Product>(ftsSql, ftsParams);

    // If FTS found results, return them
    if (results && results.length > 0) {
      return results;
    }
  } catch {
    // If FTS has syntax or token issue, gracefully proceed to fallback LIKE query
    // (no crash, complete resilience)
  }

  // Fallback high-performance multi-token LIKE query
  let fallbackSql = `
    SELECT p.*,
      (
        (CASE WHEN lower(p.name) = ? THEN 150 ELSE 0 END) +
        (CASE WHEN lower(p.name) LIKE ? THEN 80 ELSE 0 END) +
        (CASE WHEN lower(p.name) LIKE ? THEN 50 ELSE 0 END) +
        (CASE WHEN lower(p.sku) LIKE ? THEN 40 ELSE 0 END) +
        (CASE WHEN lower(p.keywords) LIKE ? THEN 30 ELSE 0 END) +
        (CASE WHEN lower(p.category_name) LIKE ? THEN 25 ELSE 0 END) +
        (CASE WHEN lower(p.aliases) LIKE ? THEN 20 ELSE 0 END)
      ) AS rank_score
    FROM products p
    WHERE (
  `;

  const fallbackParams: (string | number)[] = [
    exactPattern,
    prefixPattern,
    containsPattern,
    containsPattern,
    containsPattern,
    containsPattern,
    containsPattern,
  ];

  // Each token must match somewhere in name, sku, keywords, aliases, or category
  const tokenConditions = tokens.map(token => {
    fallbackParams.push(`%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`, `%${token}%`);
    return `(
      lower(p.name) LIKE ? OR
      lower(coalesce(p.sku, '')) LIKE ? OR
      lower(p.keywords) LIKE ? OR
      lower(p.aliases) LIKE ? OR
      lower(coalesce(p.category_name, '')) LIKE ?
    )`;
  });

  fallbackSql += tokenConditions.join(' AND ') + ')';

  if (categoryId) {
    fallbackSql += ' AND p.category_id = ?';
    fallbackParams.push(categoryId);
  }
  if (onlyFavorites) {
    fallbackSql += ' AND p.is_favorite = 1';
  }

  fallbackSql += ' ORDER BY rank_score DESC, p.updated_at DESC LIMIT ?';
  fallbackParams.push(limit);

  return await db.getAllAsync<Product>(fallbackSql, fallbackParams);
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<Product>(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
  return result || null;
}

/**
 * Fetch all images for a product, sorted by sort_order
 */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const db = await getDatabase();
  return await db.getAllAsync<ProductImage>(
    'SELECT * FROM images WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC',
    [productId]
  );
}

/**
 * Duplicate Detection: Warn if a product with a very similar name already exists
 */
export async function findSimilarProducts(name: string, excludeId?: string): Promise<Product[]> {
  const db = await getDatabase();
  const trimmed = name.trim().toLowerCase();
  if (trimmed.length < 3) return [];

  let sql = 'SELECT * FROM products WHERE (lower(name) = ? OR lower(name) LIKE ?)';
  const params: (string | number)[] = [trimmed, `%${trimmed}%`];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 3';
  return await db.getAllAsync<Product>(sql, params);
}

/**
 * Create a new product with multiple images
 */
export async function createProduct(
  input: NewProductInput,
  images: NewImageInput[]
): Promise<Product> {
  const db = await getDatabase();
  const productId = Crypto.randomUUID();
  const now = Date.now();

  const keywordsString = input.keywords.map(k => k.trim()).filter(Boolean).join(', ');
  const generatedAliases = generateAliases(input.name, input.keywords);
  const aliasesString = input.aliases && input.aliases.length > 0
    ? `${input.aliases.join(', ')}, ${generatedAliases}`
    : generatedAliases;

  // Process and save images locally
  const savedImages: ProductImage[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const saved = await saveProductImageLocally(img.uri, img.id);
    savedImages.push({
      id: saved.id,
      product_id: productId,
      local_uri: saved.localUri,
      thumbnail_uri: saved.thumbnailUri,
      width: saved.width || img.width,
      height: saved.height || img.height,
      sort_order: i,
      created_at: now,
    });
  }

  const primaryThumbnail = savedImages.length > 0 ? savedImages[0].thumbnail_uri : undefined;

  // Insert product record
  await db.runAsync(
    `INSERT INTO products (
      id, name, sku, category_id, category_name, keywords, aliases,
      description, is_favorite, image_count, primary_thumbnail_uri,
      created_at, updated_at, recently_viewed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    [
      productId,
      input.name.trim(),
      input.sku ? input.sku.trim() : null,
      input.category_id || null,
      input.category_name || null,
      keywordsString,
      aliasesString,
      input.description ? input.description.trim() : null,
      savedImages.length,
      primaryThumbnail || null,
      now,
      now,
      now, // Mark newly created as recently viewed
    ]
  );

  // Insert images records
  for (const img of savedImages) {
    await db.runAsync(
      `INSERT INTO images (
        id, product_id, local_uri, thumbnail_uri, width, height, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        img.id,
        img.product_id,
        img.local_uri,
        img.thumbnail_uri,
        img.width || null,
        img.height || null,
        img.sort_order,
        img.created_at,
      ]
    );
  }

  const created = await getProductById(productId);
  if (!created) {
    throw new Error('Failed to retrieve newly created product');
  }

  return created;
}

/**
 * Update product metadata and manage images (add new, delete removed, reorder)
 */
export async function updateProduct(
  id: string,
  updates: Partial<Product>,
  newImages?: NewImageInput[],
  removedImageIds?: string[],
  reorderedImageIds?: string[]
): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();

  // 1. Remove deleted images (files & db records)
  if (removedImageIds && removedImageIds.length > 0) {
    for (const imgId of removedImageIds) {
      const img = await db.getFirstAsync<ProductImage>(
        'SELECT * FROM images WHERE id = ?',
        [imgId]
      );
      if (img) {
        await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
        await db.runAsync('DELETE FROM images WHERE id = ?', [imgId]);
      }
    }
  }

  // 2. Add new images
  if (newImages && newImages.length > 0) {
    // Current highest sort_order
    const highestRow = await db.getFirstAsync<{ max_order: number }>(
      'SELECT coalesce(max(sort_order), -1) as max_order FROM images WHERE product_id = ?',
      [id]
    );
    let currentOrder = (highestRow?.max_order ?? -1) + 1;

    for (const newImg of newImages) {
      const saved = await saveProductImageLocally(newImg.uri, newImg.id);
      await db.runAsync(
        `INSERT INTO images (
          id, product_id, local_uri, thumbnail_uri, width, height, sort_order, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saved.id,
          id,
          saved.localUri,
          saved.thumbnailUri,
          saved.width || newImg.width || null,
          saved.height || newImg.height || null,
          currentOrder++,
          now,
        ]
      );
    }
  }

  // 3. Reorder images if specified
  if (reorderedImageIds && reorderedImageIds.length > 0) {
    for (let i = 0; i < reorderedImageIds.length; i++) {
      await db.runAsync(
        'UPDATE images SET sort_order = ? WHERE id = ?',
        [i, reorderedImageIds[i]]
      );
    }
  }

  // 4. Update product primary thumbnail and image count
  const allCurrentImages = await getProductImages(id);
  const primaryThumb = allCurrentImages.length > 0 ? allCurrentImages[0].thumbnail_uri : null;

  // 5. Update product metadata
  const current = await getProductById(id);
  if (!current) throw new Error('Product not found');

  const name = updates.name !== undefined ? updates.name.trim() : current.name;
  const sku = updates.sku !== undefined ? (updates.sku ? updates.sku.trim() : null) : (current.sku ?? null);
  const categoryId = updates.category_id !== undefined ? (updates.category_id ?? null) : (current.category_id ?? null);
  const categoryName = updates.category_name !== undefined ? (updates.category_name ?? null) : (current.category_name ?? null);
  const keywords = updates.keywords !== undefined ? updates.keywords : current.keywords;
  const description = updates.description !== undefined ? (updates.description ? updates.description.trim() : null) : (current.description ?? null);

  const aliases = generateAliases(name, keywords.split(','));

  await db.runAsync(
    `UPDATE products SET
      name = ?,
      sku = ?,
      category_id = ?,
      category_name = ?,
      keywords = ?,
      aliases = ?,
      description = ?,
      image_count = ?,
      primary_thumbnail_uri = ?,
      updated_at = ?
    WHERE id = ?`,
    [
      name,
      sku,
      categoryId,
      categoryName,
      keywords,
      aliases,
      description,
      allCurrentImages.length,
      primaryThumb,
      now,
      id,
    ]
  );
}

/**
 * Delete product and all associated local files
 */
export async function deleteProduct(id: string): Promise<void> {
  const db = await getDatabase();
  const images = await getProductImages(id);

  // Delete image files from filesystem
  for (const img of images) {
    await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
  }

  // Delete from database (foreign key cascade removes image records)
  await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDatabase();
  const product = await getProductById(id);
  if (!product) return false;

  const newStatus = product.is_favorite === 1 ? 0 : 1;
  await db.runAsync('UPDATE products SET is_favorite = ? WHERE id = ?', [newStatus, id]);
  return newStatus === 1;
}

/**
 * Mark product as recently viewed
 */
export async function markRecentlyViewed(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE products SET recently_viewed_at = ? WHERE id = ?', [Date.now(), id]);
}

/**
 * Get recently viewed products
 */
export async function getRecentlyViewedProducts(limit: number = 10): Promise<Product[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Product>(
    'SELECT * FROM products WHERE recently_viewed_at IS NOT NULL ORDER BY recently_viewed_at DESC LIMIT ?',
    [limit]
  );
}

/**
 * Get favorite products
 */
export async function getFavoriteProducts(): Promise<Product[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Product>(
    'SELECT * FROM products WHERE is_favorite = 1 ORDER BY updated_at DESC'
  );
}

/**
 * Library statistics for Settings screen
 */
export async function getLibraryStats(): Promise<LibraryStats> {
  const db = await getDatabase();

  const prodRow = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM products');
  const imgRow = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM images');
  const catRow = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM categories');
  const favRow = await db.getFirstAsync<{ count: number }>('SELECT count(*) as count FROM products WHERE is_favorite = 1');

  const { bytes, formatted } = await getLibraryStorageUsage();

  return {
    productCount: prodRow?.count || 0,
    imageCount: imgRow?.count || 0,
    categoryCount: catRow?.count || 0,
    favoriteCount: favRow?.count || 0,
    storageBytes: bytes,
    storageFormatted: formatted,
  };
}

/**
 * Reset all library data (used for complete wipe if requested in Settings)
 */
export async function clearEntireLibrary(): Promise<void> {
  const db = await getDatabase();
  const images = await db.getAllAsync<ProductImage>('SELECT * FROM images');
  for (const img of images) {
    await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
  }

  await db.runAsync('DELETE FROM images;');
  await db.runAsync('DELETE FROM products;');
  await db.runAsync('DELETE FROM categories;');
  try {
    await db.runAsync('DELETE FROM products_fts;');
  } catch {}
}
