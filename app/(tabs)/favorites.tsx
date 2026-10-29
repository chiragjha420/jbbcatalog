import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { Product } from '@/types';
import { getFavoriteProducts } from '@/db/productsRepository';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';

export default function FavoritesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      async function loadFavorites() {
        setIsLoading(true);
        try {
          const favs = await getFavoriteProducts();
          if (isMounted) setFavorites(favs);
        } catch (error) {
          console.error('Error loading favorites:', error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
      loadFavorites();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Favorites</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Quick-access products for fast sharing</Text>
      </View>

      {/* Content */}
      {!isLoading && favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No favorites yet."
          description="Products you favorite will appear here for instant customer sharing."
        />
      ) : (
        <FlatList
          data={favorites}
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
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  title: {
    ...Typography.titleLarge,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
});
