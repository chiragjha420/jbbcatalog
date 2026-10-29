import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Folder, Plus, ChevronRight, FolderPlus } from 'lucide-react-native';
import { useLibraryStore } from '@/store/useLibraryStore';
import { EmptyState } from '@/components/EmptyState';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { createCategory, deleteCategory } from '@/db/categoriesRepository';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

export default function CategoriesScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { categories, fetchCategories, refreshAll } = useLibraryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, [fetchCategories])
  );

  const handleCreateNew = async (name: string) => {
    try {
      const created = await createCategory(name);
      await fetchCategories();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return created;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not create category.');
      return null;
    }
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    Alert.alert(
      'Delete Category',
      `Delete "${catName}"? Products in this category will become Uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(catId);
            await refreshAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Categories</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Organize your catalogue</Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary }]}
          onPress={() => setIsModalOpen(true)}
          accessibilityLabel="Create Category"
        >
          <Plus size={18} color={isDark ? colors.textPrimary : '#FFFFFF'} />
          <Text style={[styles.addBtnText, { color: isDark ? colors.textPrimary : '#FFFFFF' }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {categories.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No categories yet."
          description="Create categories like Snooker Tables, Pool Tables, Cue Sticks, etc."
          actionLabel="Create Category"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              onPress={() => router.push(`/category/${item.id}`)}
              onLongPress={() => handleDeleteCategory(item.id, item.name)}
              activeOpacity={0.7}
            >
              <View style={styles.leftRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Folder size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.catName, { color: colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.catCount, { color: colors.textMuted }]}>
                    {item.product_count} {item.product_count === 1 ? 'product' : 'products'}
                  </Text>
                </View>
              </View>

              <ChevronRight size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Inline Create Category Modal */}
      <CategoryPickerModal
        visible={isModalOpen}
        categories={categories}
        onSelectCategory={() => {}}
        onCreateCategory={handleCreateNew}
        onClose={() => setIsModalOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    gap: 4,
  },
  addBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
  },
  catName: {
    ...Typography.titleSmall,
    fontSize: 15,
  },
  catCount: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
