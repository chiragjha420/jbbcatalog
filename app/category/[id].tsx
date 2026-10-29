import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, PackageOpen } from 'lucide-react-native';
import { Product, Category } from '@/types';
import { searchProducts } from '@/db/productsRepository';
import { getAllCategories } from '@/db/categoriesRepository';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';

export default function CategoryProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadCategoryData() {
        if (!id) return;
        setIsLoading(true);
        try {
          const cats = await getAllCategories();
          const matched = cats.find((c) => c.id === id);
          if (matched && isMounted) {
            setCategory(matched);
          }

          const prods = await searchProducts('', { categoryId: id });
          if (isMounted) {
            setProducts(prods);
          }
        } catch (err) {
          console.error('Error loading category products:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }

      loadCategoryData();
      return () => {
        isMounted = false;
      };
    }, [id])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {category ? category.name : 'Category'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* Grid or Empty */}
      {!isLoading && products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No products in this category."
          description={`Add products and assign them to ${category?.name || 'this category'}.`}
          actionLabel="Add Product"
          onAction={() => router.push('/add-product')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    ...Typography.titleSmall,
    fontSize: 17,
  },
  subtitle: {
    ...Typography.bodySmall,
    fontSize: 12,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});
