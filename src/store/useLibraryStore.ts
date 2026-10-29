import { create } from 'zustand';
import { Product, CategoryWithCount, LibraryStats } from '@/types';
import { searchProducts, getRecentlyViewedProducts, getLibraryStats } from '@/db/productsRepository';
import { getCategoriesWithCounts } from '@/db/categoriesRepository';

interface LibraryState {
  // Search & Filtering
  searchQuery: string;
  selectedCategoryId: string | null;
  showOnlyFavorites: boolean;
  
  // Data lists
  products: Product[];
  recentlyViewed: Product[];
  categories: CategoryWithCount[];
  stats: LibraryStats | null;
  isLoading: boolean;
  isInitialEmptyCheckDone: boolean;
  
  // Multi-select state in Gallery
  isSelectMode: boolean;
  selectedImageIds: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedCategoryId: (categoryId: string | null) => void;
  setShowOnlyFavorites: (onlyFav: boolean) => void;
  fetchProducts: () => Promise<void>;
  fetchRecentlyViewed: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshAll: () => Promise<void>;
  
  // Selection actions
  toggleImageSelection: (imageId: string) => void;
  selectAllImages: (imageIds: string[]) => void;
  clearImageSelection: () => void;
  setSelectMode: (enabled: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  searchQuery: '',
  selectedCategoryId: null,
  showOnlyFavorites: false,
  
  products: [],
  recentlyViewed: [],
  categories: [],
  stats: null,
  isLoading: false,
  isInitialEmptyCheckDone: false,
  
  isSelectMode: false,
  selectedImageIds: [],

  setSearchQuery: (searchQuery: string) => {
    set({ searchQuery });
    get().fetchProducts();
  },

  setSelectedCategoryId: (selectedCategoryId: string | null) => {
    set({ selectedCategoryId });
    get().fetchProducts();
  },

  setShowOnlyFavorites: (showOnlyFavorites: boolean) => {
    set({ showOnlyFavorites });
    get().fetchProducts();
  },

  fetchProducts: async () => {
    const { searchQuery, selectedCategoryId, showOnlyFavorites } = get();
    set({ isLoading: true });
    try {
      const results = await searchProducts(searchQuery, {
        categoryId: selectedCategoryId || undefined,
        onlyFavorites: showOnlyFavorites,
      });
      set({ products: results, isLoading: false, isInitialEmptyCheckDone: true });
    } catch (error) {
      console.error('Error fetching products:', error);
      set({ products: [], isLoading: false, isInitialEmptyCheckDone: true });
    }
  },

  fetchRecentlyViewed: async () => {
    try {
      const recents = await getRecentlyViewedProducts(8);
      set({ recentlyViewed: recents });
    } catch (error) {
      console.error('Error fetching recents:', error);
    }
  },

  fetchCategories: async () => {
    try {
      const cats = await getCategoriesWithCounts();
      set({ categories: cats });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  fetchStats: async () => {
    try {
      const stats = await getLibraryStats();
      set({ stats });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  },

  refreshAll: async () => {
    await Promise.all([
      get().fetchProducts(),
      get().fetchRecentlyViewed(),
      get().fetchCategories(),
      get().fetchStats(),
    ]);
  },

  toggleImageSelection: (imageId: string) => {
    const current = get().selectedImageIds;
    if (current.includes(imageId)) {
      const updated = current.filter(id => id !== imageId);
      set({
        selectedImageIds: updated,
        isSelectMode: updated.length > 0,
      });
    } else {
      set({
        selectedImageIds: [...current, imageId],
        isSelectMode: true,
      });
    }
  },

  selectAllImages: (imageIds: string[]) => {
    set({ selectedImageIds: [...imageIds], isSelectMode: true });
  },

  clearImageSelection: () => {
    set({ selectedImageIds: [], isSelectMode: false });
  },

  setSelectMode: (enabled: boolean) => {
    set({ isSelectMode: enabled, selectedImageIds: enabled ? get().selectedImageIds : [] });
  },
}));
