import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check, Plus, X, Folder } from 'lucide-react-native';
import { Category } from '@/types';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface CategoryPickerModalProps {
  visible: boolean;
  categories: Category[];
  selectedCategoryId?: string | null;
  onSelectCategory: (category: Category | null) => void;
  onCreateCategory: (name: string) => Promise<Category | null>;
  onClose: () => void;
}

export const CategoryPickerModal: React.FC<CategoryPickerModalProps> = ({
  visible,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const [newCatName, setNewCatName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = (cat: Category | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectCategory(cat);
    onClose();
  };

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setIsCreating(true);
    try {
      const created = await onCreateCategory(newCatName.trim());
      if (created) {
        setNewCatName('');
        onSelectCategory(created);
        onClose();
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Quick Create New Category */}
          <View style={styles.createRow}>
            <TextInput
              style={[styles.createInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={newCatName}
              onChangeText={setNewCatName}
              placeholder="Create new category..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            {newCatName.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary }]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                <Plus size={16} color={isDark ? colors.textPrimary : '#FFFFFF'} style={{ marginRight: 4 }} />
                <Text style={[styles.createBtnText, { color: isDark ? colors.textPrimary : '#FFFFFF' }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List of Categories */}
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  { borderBottomColor: colors.borderLight },
                  !selectedCategoryId && { backgroundColor: colors.surfaceSubtle },
                ]}
                onPress={() => handleSelect(null)}
              >
                <Text
                  style={[
                    styles.categoryItemText,
                    { color: colors.textPrimary },
                    !selectedCategoryId && { fontWeight: '700', color: colors.primary },
                  ]}
                >
                  None (Uncategorized)
                </Text>
                {!selectedCategoryId && <Check size={18} color={colors.primary} />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = selectedCategoryId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    { borderBottomColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.surfaceSubtle },
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <View style={styles.catNameRow}>
                    <Folder size={18} color={isSelected ? colors.primary : colors.textMuted} style={{ marginRight: Spacing.sm }} />
                    <Text
                      style={[
                        styles.categoryItemText,
                        { color: colors.textPrimary },
                        isSelected && { fontWeight: '700', color: colors.primary },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {isSelected && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.titleMedium,
    fontSize: 18,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  createInput: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Typography.bodyMedium,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  createBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderRadius: Radius.sm,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItemText: {
    ...Typography.bodyLarge,
  },
});
