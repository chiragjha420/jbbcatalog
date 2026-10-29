export interface Product {
  id: string;
  name: string;
  sku?: string;
  category_id?: string;
  category_name?: string;
  keywords: string;
  aliases: string;
  description?: string;
  is_favorite: number; // 0 or 1
  image_count: number;
  primary_thumbnail_uri?: string;
  created_at: number;
  updated_at: number;
  recently_viewed_at?: number | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  local_uri: string;
  thumbnail_uri: string;
  width?: number;
  height?: number;
  sort_order: number;
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
}

export interface CategoryWithCount extends Category {
  product_count: number;
}

export interface NewProductInput {
  name: string;
  sku?: string;
  category_id?: string;
  category_name?: string;
  keywords: string[];
  aliases?: string[];
  description?: string;
}

export interface NewImageInput {
  id?: string;
  uri: string;
  width?: number;
  height?: number;
}

export interface LibraryStats {
  productCount: number;
  imageCount: number;
  categoryCount: number;
  favoriteCount: number;
  storageBytes: number;
  storageFormatted: string;
}

export interface BackupData {
  version: number;
  exported_at: string;
  app_name: string;
  categories: Category[];
  products: Product[];
  images: {
    id: string;
    product_id: string;
    sort_order: number;
    created_at: number;
    base64_data?: string;
    mime_type?: string;
  }[];
}
