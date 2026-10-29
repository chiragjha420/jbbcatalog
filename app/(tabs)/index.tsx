import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Clock, PackageSearch, Image as ImageIcon } from 'lucide-react-native';
import { SearchBar } from '@/components/SearchBar';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useTheme } from '@/store/useThemeStore';
import { Radius, Spacing, Typography } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const {
    searchQuery,
    setSearchQuery,
    products,
    recentlyViewed,
    categories,
    isLoading,
    isInitialEmptyCheckDone,
    fetchProducts,
    fetchRecentlyViewed,
    fetchCategories,
  } = useLibraryStore();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
      fetchRecentlyViewed();
      fetchCategories();
    }, [fetchProducts, fetchRecentlyViewed, fetchCategories])
  );

  const handleSelectCategoryFilter = (catId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveCategoryFilter(catId === activeCategoryFilter ? null : catId);
  };

  const handleAddProduct = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/add-product');
  };

  const filteredProducts = activeCategoryFilter
    ? products.filter((p) => p.category_id === activeCategoryFilter)
    : products;

  const isSearchActive = searchQuery.trim().length > 0;
  const isLibraryCompletelyEmpty =
    isInitialEmptyCheckDone &&
    !isSearchActive &&
    products.length === 0 &&
    categories.length === 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.brandTitleContainer}>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Catalogue</Text>
          <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>SALES PHOTO LIBRARY</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary }]}
          onPress={handleAddProduct}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Add Product"
        >
          <Plus size={18} color={isDark ? colors.textPrimary : '#FFFFFF'} />
          <Text style={[styles.addButtonText, { color: isDark ? colors.textPrimary : '#FFFFFF' }]}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Prominent Large Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search products, keywords, 12ft..."
      />

      {/* Main Content Area */}
      {isLoading && !isInitialEmptyCheckDone ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isLibraryCompletelyEmpty ? (
        <EmptyState
          icon={ImageIcon}
          title="Your product library is empty."
          description="Add products to start building your offline photo catalogue."
          actionLabel="Add Product"
          onAction={handleAddProduct}
        />
      ) : isSearchActive && filteredProducts.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No products found."
          description="Try a different name, size (e.g. 12 ft), or keyword."
          actionLabel="Clear Search"
          onAction={() => setSearchQuery('')}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* If NOT searching, show subtle Recent & Categories sections */}
              {!isSearchActive && (
                <>
                  {/* Subtle Recently Viewed Row */}
                  {recentlyViewed.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <View style={styles.sectionHeader}>
                        <Clock size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENTLY VIEWED</Text>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.recentScrollContent}
                      >
                        {recentlyViewed.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.recentItem}
                            onPress={() => router.push(`/product/${item.id}`)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.recentThumbBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                              {item.primary_thumbnail_uri ? (
                                <Image
                                  source={{ uri: item.primary_thumbnail_uri }}
                                  style={styles.recentThumb}
                                />
                              ) : (
                                <ImageIcon size={18} color={colors.textMuted} />
                              )}
                            </View>
                            <Text style={[styles.recentName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {item.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Clean Category Filter Chips */}
                  {categories.length > 0 && (
                    <View style={styles.categoriesFilterContainer}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesScrollContent}
                      >
                        <TouchableOpacity
                          style={[
                            styles.categoryChip,
                            { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                            activeCategoryFilter === null && { backgroundColor: isDark ? colors.surfaceElevated : colors.primary, borderColor: isDark ? colors.borderStrong : colors.primary },
                          ]}
                          onPress={() => handleSelectCategoryFilter(null)}
                        >
                          <Text
                            style={[
                              styles.categoryChipText,
                              { color: colors.textSecondary },
                              activeCategoryFilter === null && { color: isDark ? colors.textPrimary : '#FFFFFF', fontWeight: '700' },
                            ]}
                          >
                            All ({products.length})
                          </Text>
                        </TouchableOpacity>

                        {categories.map((cat) => {
                          const isActive = activeCategoryFilter === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.categoryChip,
                                { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                                isActive && { backgroundColor: isDark ? colors.surfaceElevated : colors.primary, borderColor: isDark ? colors.borderStrong : colors.primary },
                              ]}
                              onPress={() => handleSelectCategoryFilter(cat.id)}
                            >
                              <Text
                                style={[
                                  styles.categoryChipText,
                                  { color: colors.textSecondary },
                                  isActive && { color: isDark ? colors.textPrimary : '#FFFFFF', fontWeight: '700' },
                                ]}
                              >
                                {cat.name} ({cat.product_count})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              {/* Search result count indicator */}
              {isSearchActive && (
                <View style={styles.searchStatusRow}>
                  <Text style={[styles.searchStatusText, { color: colors.textMuted }]}>
                    {filteredProducts.length}{' '}
                    {filteredProducts.length === 1 ? 'product found' : 'products found'}
                  </Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  brandTitleContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    ...Typography.titleLarge,
    fontSize: 24,
  },
  brandSubtitle: {
    ...Typography.caption,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
  },
  addButtonText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    fontSize: 11,
  },
  recentScrollContent: {
    gap: Spacing.sm,
  },
  recentItem: {
    width: 90,
  },
  recentThumbBox: {
    width: 90,
    height: 70,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  recentThumb: {
    width: '100%',
    height: '100%',
  },
  recentName: {
    ...Typography.bodySmall,
    fontSize: 11,
  },
  categoriesFilterContainer: {
    marginBottom: Spacing.md,
  },
  categoriesScrollContent: {
    gap: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryChipText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  searchStatusRow: {
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  searchStatusText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});
