import * as Crypto from 'expo-crypto';
import { getDatabase } from './database';
import { Category, CategoryWithCount } from '@/types';

/**
 * Get all categories with product count
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryWithCount>(`
    SELECT 
      c.id,
      c.name,
      c.sort_order,
      c.created_at,
      COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);
  return rows;
}

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  return await db.getAllAsync<Category>(
    'SELECT * FROM categories ORDER BY sort_order ASC, name ASC'
  );
}

/**
 * Create a new category
 */
export async function createCategory(name: string): Promise<Category> {
  const db = await getDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  // Check if already exists
  const existing = await db.getFirstAsync<Category>(
    'SELECT * FROM categories WHERE lower(name) = ?',
    [trimmed.toLowerCase()]
  );
  if (existing) return existing;

  const id = Crypto.randomUUID();
  const now = Date.now();

  const maxOrderRow = await db.getFirstAsync<{ max_order: number }>(
    'SELECT coalesce(max(sort_order), -1) as max_order FROM categories'
  );
  const sortOrder = (maxOrderRow?.max_order ?? -1) + 1;

  await db.runAsync(
    'INSERT INTO categories (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)',
    [id, trimmed, sortOrder, now]
  );

  return {
    id,
    name: trimmed,
    sort_order: sortOrder,
    created_at: now,
  };
}

/**
 * Update category name
 */
export async function updateCategory(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  await db.runAsync(
    'UPDATE categories SET name = ? WHERE id = ?',
    [trimmed, id]
  );

  // Synchronize category_name in products table
  await db.runAsync(
    'UPDATE products SET category_name = ? WHERE category_id = ?',
    [trimmed, id]
  );
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  await db.runAsync('UPDATE products SET category_name = NULL WHERE category_id = ?', [id]);
}
