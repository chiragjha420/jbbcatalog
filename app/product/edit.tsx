import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  ImagePlus,
  ChevronDown,
  Trash2,
  Folder,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Category, Product, NewImageInput } from '@/types';
import {
  getProductById,
  getProductImages,
  updateProduct,
  deleteProduct,
} from '@/db/productsRepository';
import { getAllCategories, createCategory } from '@/db/categoriesRepository';
import { suggestKeywords } from '@/services/keywordSuggester';
import { KeywordTagsInput } from '@/components/KeywordTagsInput';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { useLibraryStore } from '@/store/useLibraryStore';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface PhotoItem {
  id: string;
  uri: string;
  isNew: boolean;
}

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { refreshAll } = useLibraryStore();

  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Suggested keywords derived purely from name and category
  const suggestedTags = useMemo(
    () => (name.trim().length > 2 ? suggestKeywords(name, selectedCategory?.name) : []),
    [name, selectedCategory]
  );

  useEffect(() => {
    async function loadProductData() {
      if (!id) return;
      try {
        const [prod, imgs, allCats] = await Promise.all([
          getProductById(id),
          getProductImages(id),
          getAllCategories(),
        ]);

        if (prod) {
          setProduct(prod);
          setName(prod.name);
          setSku(prod.sku || '');
          setDescription(prod.description || '');
          setKeywords(prod.keywords ? prod.keywords.split(',').map((k) => k.trim()).filter(Boolean) : []);

          if (prod.category_id) {
            const matched = allCats.find((c) => c.id === prod.category_id);
            if (matched) setSelectedCategory(matched);
          }

          setPhotos(
            imgs.map((img) => ({
              id: img.id,
              uri: img.local_uri,
              isNew: false,
            }))
          );
        }
        setCategories(allCats);
      } catch (err) {
        console.error('Error loading product for edit:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProductData();
  }, [id]);

  const handlePickPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 15,
        quality: 0.88,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newItems: PhotoItem[] = result.assets.map((asset) => ({
          id: `new_${Date.now()}_${Math.random()}`,
          uri: asset.uri,
          isNew: true,
        }));
        setPhotos((prev) => [...prev, ...newItems]);
      }
    } catch {
      Alert.alert('Error', 'Could not access photo library.');
    }
  };

  const handleCameraPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.88 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const asset = result.assets[0];
        setPhotos((prev) => [
          ...prev,
          { id: `new_${Date.now()}_${Math.random()}`, uri: asset.uri, isNew: true },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const item = photos[index];
    if (!item.isNew) {
      setRemovedImageIds((prev) => [...prev, item.id]);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...photos];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setPhotos(updated);
  };

  const handleMoveRight = (index: number) => {
    if (index === photos.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...photos];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setPhotos(updated);
  };

  const handleCreateCategoryInline = async (catName: string) => {
    try {
      const created = await createCategory(catName);
      const allCats = await getAllCategories();
      setCategories(allCats);
      setSelectedCategory(created);
      return created;
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not create category.');
      return null;
    }
  };

  const handleSave = async () => {
    if (!product) return;
    if (!name.trim()) {
      Alert.alert('Product Name Required', 'Product name cannot be empty.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Photos Required', 'A product must have at least one photo.');
      return;
    }

    setIsSaving(true);
    try {
      const newImagesInput: NewImageInput[] = photos
        .filter((p) => p.isNew)
        .map((p) => ({ uri: p.uri }));

      const existingImageIdsOrder = photos
        .filter((p) => !p.isNew)
        .map((p) => p.id);

      await updateProduct(
        product.id,
        {
          name: name.trim(),
          sku: sku.trim() || undefined,
          category_id: selectedCategory?.id,
          category_name: selectedCategory?.name,
          keywords: keywords.join(', '),
          description: description.trim() || undefined,
        },
        newImagesInput,
        removedImageIds,
        existingImageIdsOrder
      );

      await refreshAll();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Update Failed', 'An error occurred while saving changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (!product) return;
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}" and all its photos? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProduct(product.id);
            await refreshAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  if (isLoading || !product) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Edit Product</Text>

        <TouchableOpacity
          onPress={handleSave}
          style={[
            styles.saveBtn,
            { backgroundColor: isDark ? colors.surfaceElevated : colors.primary },
            (!name.trim() || photos.length === 0) && styles.saveBtnDisabled,
          ]}
          disabled={isSaving || !name.trim() || photos.length === 0}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={isDark ? colors.textPrimary : '#FFFFFF'} />
          ) : (
            <Text style={[styles.saveBtnText, { color: isDark ? colors.textPrimary : '#FFFFFF' }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Photo Management Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PHOTOS ({photos.length})</Text>
              <Text style={[styles.sectionHelper, { color: colors.accentDark }]}>Tap arrows to reorder</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoScroll}
            >
              <TouchableOpacity
                style={[styles.addPhotoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handlePickPhotos}
              >
                <ImagePlus size={24} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.textPrimary }]}>Add Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cameraPhotoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handleCameraPhoto}
              >
                <Camera size={22} color={colors.textSecondary} />
                <Text style={[styles.cameraPhotoText, { color: colors.textSecondary }]}>Camera</Text>
              </TouchableOpacity>

              {photos.map((item, index) => (
                <View key={`${item.id}-${index}`} style={[styles.photoThumbContainer, { borderColor: colors.border }]}>
                  <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}

                  {/* Reorder Left/Right Controls */}
                  <View style={styles.reorderControls}>
                    {index > 0 && (
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => handleMoveLeft(index)}
                      >
                        <ChevronLeft size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                    {index < photos.length - 1 && (
                      <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={() => handleMoveRight(index)}
                      >
                        <ChevronRight size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.removePhotoBtn}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Product Name */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCT NAME *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. JBB Royal 12 ft Snooker Table"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CATEGORY</Text>
            <TouchableOpacity
              style={[styles.categoryPickerBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              onPress={() => setIsCategoryModalVisible(true)}
            >
              <View style={styles.categoryPickerLeft}>
                <Folder size={18} color={selectedCategory ? colors.primary : colors.textMuted} />
                <Text
                  style={[
                    styles.categoryPickerText,
                    { color: selectedCategory ? colors.textPrimary : colors.textMuted },
                  ]}
                >
                  {selectedCategory ? selectedCategory.name : 'Select category...'}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Keywords */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEYWORDS & SEARCH TERMS</Text>
            <KeywordTagsInput
              tags={keywords}
              onChangeTags={setKeywords}
              suggestions={suggestedTags}
            />
          </View>

          {/* SKU */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCT CODE / SKU (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. JBB-ST-12-01"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>

          {/* Delete Product Button */}
          <View style={styles.deleteSection}>
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: colors.destructiveLight }]}
              onPress={handleDelete}
            >
              <Trash2 size={18} color={colors.destructive} style={{ marginRight: Spacing.sm }} />
              <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Product</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryPickerModal
        visible={isCategoryModalVisible}
        categories={categories}
        selectedCategoryId={selectedCategory?.id}
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onCreateCategory={handleCreateCategoryInline}
        onClose={() => setIsCategoryModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  cancelBtn: {
    padding: Spacing.xs,
  },
  topBarTitle: {
    ...Typography.titleSmall,
    fontSize: 17,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderRadius: Radius.full,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl * 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.caption,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  sectionHelper: {
    ...Typography.caption,
    fontSize: 10,
    textTransform: 'none',
  },
  photoScroll: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addPhotoCard: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  cameraPhotoCard: {
    width: 70,
    height: 100,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cameraPhotoText: {
    ...Typography.caption,
    fontSize: 10,
  },
  photoThumbContainer: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  coverBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderControls: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  reorderBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyLarge,
  },
  textArea: {
    height: 90,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    textAlignVertical: 'top',
  },
  categoryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  categoryPickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryPickerText: {
    ...Typography.bodyLarge,
  },
  deleteSection: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
    width: '100%',
  },
  deleteBtnText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
});
