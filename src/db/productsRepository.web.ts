import * as Crypto from 'expo-crypto';
import { Product, ProductImage, NewProductInput, NewImageInput, LibraryStats } from '@/types';
import { saveProductImageLocally, deleteLocalImageFiles, getLibraryStorageUsage } from '@/services/imageService';
import { generateAliases } from '@/services/keywordSuggester';
import { idbGetAll, idbGet, idbPut, idbDelete } from './indexedDb';

export interface SearchOptions {
  categoryId?: string;
  onlyFavorites?: boolean;
  limit?: number;
}

/**
 * Supercharged offline product search with weighted relevance ranking for Web/PWA
 */
export async function searchProducts(
  rawQuery: string,
  options: SearchOptions = {}
): Promise<Product[]> {
  const query = rawQuery.trim().toLowerCase();
  const { categoryId, onlyFavorites = false, limit = 100 } = options;

  let allProducts = await idbGetAll<Product>('products');

  // Filter category
  if (categoryId) {
    allProducts = allProducts.filter((p) => p.category_id === categoryId);
  }

  // Filter favorites
  if (onlyFavorites) {
    allProducts = allProducts.filter((p) => Boolean(p.is_favorite));
  }

  if (!query) {
    allProducts.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
    return allProducts.slice(0, limit);
  }

  const tokens = query
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const scored: { product: Product; score: number }[] = [];

  for (const p of allProducts) {
    const pName = (p.name || '').toLowerCase();
    const pSku = (p.sku || '').toLowerCase();
    const pKeywords = (p.keywords || '').toLowerCase();
    const pCategory = (p.category_name || '').toLowerCase();
    const pAliases = (p.aliases || '').toLowerCase();

    let score = 0;

    if (pName === query) score += 150;
    else if (pName.startsWith(query)) score += 80;
    else if (pName.includes(query)) score += 50;

    if (pSku && pSku.includes(query)) score += 40;
    if (pKeywords.includes(query)) score += 30;
    if (pCategory.includes(query)) score += 25;
    if (pAliases.includes(query)) score += 20;

    // Token-level matching
    let tokenMatches = 0;
    for (const t of tokens) {
      if (
        pName.includes(t) ||
        pKeywords.includes(t) ||
        pSku.includes(t) ||
        pAliases.includes(t) ||
        pCategory.includes(t)
      ) {
        tokenMatches++;
        score += 15;
      }
    }

    if (score > 0 || tokenMatches === tokens.length) {
      scored.push({ product: p, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.product.updated_at || 0) - (a.product.updated_at || 0);
  });

  return scored.slice(0, limit).map((s) => s.product);
}

/**
 * Get product by ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const prod = await idbGet<Product>('products', id);
  return prod || null;
}

/**
 * Get images for a product
 */
export async function getProductImages(productId: string): Promise<ProductImage[]> {
  const allImages = await idbGetAll<ProductImage>('images');
  const filtered = allImages.filter((img) => img.product_id === productId);
  filtered.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return filtered;
}

/**
 * Find similar products by name to prevent duplicate creation
 */
export async function findSimilarProducts(name: string, excludeId?: string): Promise<Product[]> {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return [];

  const all = await idbGetAll<Product>('products');
  return all
    .filter((p) => {
      if (excludeId && p.id === excludeId) return false;
      const pName = (p.name || '').toLowerCase();
      return pName === trimmed || pName.includes(trimmed);
    })
    .slice(0, 3);
}

/**
 * Create a new product with multiple images
 */
export async function createProduct(
  input: NewProductInput,
  images: NewImageInput[]
): Promise<Product> {
  const productId = Crypto.randomUUID();
  const now = Date.now();

  const keywordsString = input.keywords.map((k) => k.trim()).filter(Boolean).join(', ');
  const generatedAliases = generateAliases(input.name, input.keywords);
  const aliasesString =
    input.aliases && input.aliases.length > 0
      ? `${input.aliases.join(', ')}, ${generatedAliases}`
      : generatedAliases;

  const savedImages: ProductImage[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const saved = await saveProductImageLocally(img.uri, img.id);
    const prodImg: ProductImage = {
      id: saved.id,
      product_id: productId,
      local_uri: saved.localUri,
      thumbnail_uri: saved.thumbnailUri,
      width: saved.width || img.width,
      height: saved.height || img.height,
      sort_order: i,
      created_at: now,
    };
    await idbPut('images', prodImg);
    savedImages.push(prodImg);
  }

  const primaryThumbnail = savedImages.length > 0 ? savedImages[0].thumbnail_uri : undefined;

  const newProduct: Product = {
    id: productId,
    name: input.name.trim(),
    sku: input.sku ? input.sku.trim() : undefined,
    category_id: input.category_id || undefined,
    category_name: input.category_name ? input.category_name.trim() : undefined,
    keywords: keywordsString,
    aliases: aliasesString,
    description: input.description ? input.description.trim() : undefined,
    is_favorite: 0,
    image_count: savedImages.length,
    primary_thumbnail_uri: primaryThumbnail,
    created_at: now,
    updated_at: now,
  };

  await idbPut('products', newProduct);
  return newProduct;
}

/**
 * Update product metadata and manage images
 */
export async function updateProduct(
  id: string,
  updates: Partial<Product>,
  newImages?: NewImageInput[],
  removedImageIds?: string[],
  reorderedImageIds?: string[]
): Promise<void> {
  const now = Date.now();

  // 1. Remove deleted images
  if (removedImageIds && removedImageIds.length > 0) {
    for (const imgId of removedImageIds) {
      const img = await idbGet<ProductImage>('images', imgId);
      if (img) {
        await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
        await idbDelete('images', imgId);
      }
    }
  }

  // 2. Add new images
  if (newImages && newImages.length > 0) {
    const existingImgs = await getProductImages(id);
    let currentOrder = existingImgs.length;

    for (const newImg of newImages) {
      const saved = await saveProductImageLocally(newImg.uri, newImg.id);
      const prodImg: ProductImage = {
        id: saved.id,
        product_id: id,
        local_uri: saved.localUri,
        thumbnail_uri: saved.thumbnailUri,
        width: saved.width || newImg.width,
        height: saved.height || newImg.height,
        sort_order: currentOrder++,
        created_at: now,
      };
      await idbPut('images', prodImg);
    }
  }

  // 3. Reorder images if specified
  if (reorderedImageIds && reorderedImageIds.length > 0) {
    for (let i = 0; i < reorderedImageIds.length; i++) {
      const img = await idbGet<ProductImage>('images', reorderedImageIds[i]);
      if (img) {
        img.sort_order = i;
        await idbPut('images', img);
      }
    }
  }

  // 4. Update primary thumbnail and image count
  const allCurrentImages = await getProductImages(id);
  const primaryThumb = allCurrentImages.length > 0 ? allCurrentImages[0].thumbnail_uri : undefined;

  // 5. Update product metadata
  const current = await getProductById(id);
  if (!current) return;

  const merged: Product = {
    ...current,
    ...updates,
    image_count: allCurrentImages.length,
    primary_thumbnail_uri: primaryThumb,
    updated_at: now,
  };

  await idbPut('products', merged);
}

/**
 * Delete a product and its images
 */
export async function deleteProduct(id: string): Promise<void> {
  const images = await getProductImages(id);
  for (const img of images) {
    await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
    await idbDelete('images', img.id);
  }
  await idbDelete('products', id);
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(id: string): Promise<boolean> {
  const prod = await getProductById(id);
  if (!prod) return false;

  const newStatus = prod.is_favorite ? 0 : 1;
  prod.is_favorite = newStatus;
  await idbPut('products', prod);
  return Boolean(newStatus);
}

/**
 * Mark product as recently viewed
 */
export async function markRecentlyViewed(id: string): Promise<void> {
  const prod = await getProductById(id);
  if (!prod) return;

  prod.recently_viewed_at = Date.now();
  await idbPut('products', prod);
}

/**
 * Get recently viewed products
 */
export async function getRecentlyViewedProducts(limit: number = 10): Promise<Product[]> {
  const all = await idbGetAll<Product>('products');
  return all
    .filter((p) => typeof p.recently_viewed_at === 'number' && p.recently_viewed_at > 0)
    .sort((a, b) => (b.recently_viewed_at || 0) - (a.recently_viewed_at || 0))
    .slice(0, limit);
}

/**
 * Get favorite products
 */
export async function getFavoriteProducts(): Promise<Product[]> {
  const all = await idbGetAll<Product>('products');
  return all
    .filter((p) => Boolean(p.is_favorite))
    .sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
}

/**
 * Library statistics for Settings screen
 */
export async function getLibraryStats(): Promise<LibraryStats> {
  const [products, images, categories] = await Promise.all([
    idbGetAll<Product>('products'),
    idbGetAll<ProductImage>('images'),
    idbGetAll<any>('categories'),
  ]);

  const favCount = products.filter((p) => Boolean(p.is_favorite)).length;
  const { bytes, formatted } = await getLibraryStorageUsage();

  return {
    productCount: products.length,
    imageCount: images.length,
    categoryCount: categories.length,
    favoriteCount: favCount,
    storageBytes: bytes,
    storageFormatted: formatted,
  };
}

/**
 * Reset all library data
 */
export async function clearEntireLibrary(): Promise<void> {
  const images = await idbGetAll<ProductImage>('images');
  for (const img of images) {
    await deleteLocalImageFiles(img.local_uri, img.thumbnail_uri);
  }

  await Promise.all([
    idbDelete('products', ''), // or clear
    idbGetAll<Product>('products').then((items) =>
      Promise.all(items.map((i) => idbDelete('products', i.id)))
    ),
    idbGetAll<ProductImage>('images').then((items) =>
      Promise.all(items.map((i) => idbDelete('images', i.id)))
    ),
    idbGetAll<any>('categories').then((items) =>
      Promise.all(items.map((i) => idbDelete('categories', i.id)))
    ),
  ]);
}
