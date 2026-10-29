import * as Crypto from 'expo-crypto';
import { Category, CategoryWithCount, Product } from '@/types';
import { idbGetAll, idbGet, idbPut, idbDelete } from './indexedDb';

/**
 * Get all categories with product count for Web/PWA
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const [categories, products] = await Promise.all([
    idbGetAll<Category>('categories'),
    idbGetAll<Product>('products'),
  ]);

  const countMap = new Map<string, number>();
  for (const prod of products) {
    if (prod.category_id) {
      countMap.set(prod.category_id, (countMap.get(prod.category_id) || 0) + 1);
    }
  }

  const result: CategoryWithCount[] = categories.map((c) => ({
    ...c,
    product_count: countMap.get(c.id) || 0,
  }));

  result.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return result;
}

/**
 * Get all categories for Web/PWA
 */
export async function getAllCategories(): Promise<Category[]> {
  const categories = await idbGetAll<Category>('categories');
  categories.sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
  return categories;
}

/**
 * Create a new category for Web/PWA
 */
export async function createCategory(name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const categories = await idbGetAll<Category>('categories');
  const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const maxOrder = categories.reduce((max, c) => Math.max(max, c.sort_order ?? 0), -1);
  const sortOrder = maxOrder + 1;

  const newCategory: Category = {
    id: Crypto.randomUUID(),
    name: trimmed,
    sort_order: sortOrder,
    created_at: Date.now(),
  };

  await idbPut('categories', newCategory);
  return newCategory;
}

/**
 * Update category name for Web/PWA
 */
export async function updateCategory(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const cat = await idbGet<Category>('categories', id);
  if (cat) {
    cat.name = trimmed;
    await idbPut('categories', cat);
  }

  // Synchronize category_name in products
  const products = await idbGetAll<Product>('products');
  for (const prod of products) {
    if (prod.category_id === id) {
      prod.category_name = trimmed;
      await idbPut('products', prod);
    }
  }
}

/**
 * Delete a category for Web/PWA
 */
export async function deleteCategory(id: string): Promise<void> {
  await idbDelete('categories', id);

  // Clear category_id and category_name on associated products
  const products = await idbGetAll<Product>('products');
  for (const prod of products) {
    if (prod.category_id === id) {
      prod.category_id = undefined;
      prod.category_name = undefined;
      await idbPut('products', prod);
    }
  }
}
