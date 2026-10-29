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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  ImagePlus,
  ChevronDown,
  AlertCircle,
  Folder,
} from 'lucide-react-native';
import { Category, Product } from '@/types';
import { createProduct, findSimilarProducts } from '@/db/productsRepository';
import { getAllCategories, createCategory } from '@/db/categoriesRepository';
import { suggestKeywords } from '@/services/keywordSuggester';
import { KeywordTagsInput } from '@/components/KeywordTagsInput';
import { CategoryPickerModal } from '@/components/CategoryPickerModal';
import { useLibraryStore } from '@/store/useLibraryStore';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface SelectedPhoto {
  uri: string;
  width?: number;
  height?: number;
}

export default function AddProductScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { refreshAll } = useLibraryStore();

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Duplicate detection state
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [dismissDuplicateWarning, setDismissDuplicateWarning] = useState(false);

  useEffect(() => {
    async function loadCats() {
      const cats = await getAllCategories();
      setCategories(cats);
    }
    loadCats();
  }, []);

  // Suggested keywords derived purely from name and category
  const suggestedTags = useMemo(
    () => (name.trim().length > 2 ? suggestKeywords(name, selectedCategory?.name) : []),
    [name, selectedCategory]
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (name.trim().length >= 3 && !dismissDuplicateWarning) {
        const found = await findSimilarProducts(name.trim());
        if (active) setSimilarProducts(found);
      } else {
        if (active) setSimilarProducts([]);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, dismissDuplicateWarning]);

  const handlePickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Access Needed',
          'Allow photo access so you can add product photos to your catalogue.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 25,
        quality: 0.88,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newSelected = result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        setPhotos((prev) => [...prev, ...newSelected]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const handleCaptureCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Access Needed', 'Allow camera access to capture product photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.88,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const asset = result.assets[0];
        setPhotos((prev) => [...prev, { uri: asset.uri, width: asset.width, height: asset.height }]);
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'Could not launch camera.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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

  const handleApplyAllSuggestions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const combined = Array.from(new Set([...keywords, ...suggestedTags]));
    setKeywords(combined);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Product Name Required', 'Please enter a name for this product.');
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        'Add Photos',
        'Please add at least one product photo from your gallery or camera.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const created = await createProduct(
        {
          name: name.trim(),
          sku: sku.trim() || undefined,
          category_id: selectedCategory?.id,
          category_name: selectedCategory?.name,
          keywords,
          description: description.trim() || undefined,
        },
        photos
      );

      await refreshAll();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/product/${created.id}`);
    } catch (error: any) {
      console.error('Failed to create product:', error);
      Alert.alert('Save Failed', 'Unable to save product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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

        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>New Product</Text>

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
          {/* Photos Picker Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCT PHOTOS ({photos.length})</Text>
              {photos.length > 0 && (
                <Text style={[styles.sectionHelper, { color: colors.accentDark }]}>First photo is catalogue cover</Text>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoScroll}
            >
              {/* Add from Gallery Button */}
              <TouchableOpacity
                style={[styles.addPhotoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handlePickPhotos}
              >
                <ImagePlus size={24} color={colors.primary} />
                <Text style={[styles.addPhotoText, { color: colors.textPrimary }]}>Select Photos</Text>
              </TouchableOpacity>

              {/* Add from Camera Button */}
              <TouchableOpacity
                style={[styles.cameraPhotoCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handleCaptureCamera}
              >
                <Camera size={22} color={colors.textSecondary} />
                <Text style={[styles.cameraPhotoText, { color: colors.textSecondary }]}>Camera</Text>
              </TouchableOpacity>

              {/* Selected Photo Thumbnails */}
              {photos.map((item, index) => (
                <View key={`${item.uri}-${index}`} style={[styles.photoThumbContainer, { borderColor: colors.border }]}>
                  <Image source={{ uri: item.uri }} style={styles.photoThumb} />
                  {index === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>COVER</Text>
                    </View>
                  )}
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

          {/* Product Name Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCT NAME *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setDismissDuplicateWarning(false);
              }}
              placeholder="e.g. JBB Royal 12 ft Snooker Table"
              placeholderTextColor={colors.textMuted}
            />

            {/* Duplicate Product Warning Banner */}
            {similarProducts.length > 0 && !dismissDuplicateWarning && (
              <View style={[styles.duplicateWarningCard, { backgroundColor: colors.warningLight }]}>
                <AlertCircle size={18} color={colors.warning} style={{ marginRight: Spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.duplicateWarningTitle, { color: colors.warning }]}>
                    You may already have this product:
                  </Text>
                  <Text style={[styles.duplicateWarningProduct, { color: colors.textPrimary }]}>{similarProducts[0].name}</Text>
                  <View style={styles.duplicateActions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/product/${similarProducts[0].id}`)}
                      style={[styles.duplicateOpenBtn, { backgroundColor: colors.warning }]}
                    >
                      <Text style={styles.duplicateOpenBtnText}>Open Existing</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setDismissDuplicateWarning(true)}
                      style={styles.duplicateDismissBtn}
                    >
                      <Text style={[styles.duplicateDismissBtnText, { color: colors.textSecondary }]}>Create Anyway</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Category Selector */}
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
                  {selectedCategory ? selectedCategory.name : 'Select or create category...'}
                </Text>
              </View>
              <ChevronDown size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Keywords & Search Aliases */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>KEYWORDS & SEARCH TERMS</Text>
              {suggestedTags.length > 0 && (
                <TouchableOpacity onPress={handleApplyAllSuggestions}>
                  <Text style={[styles.applyAllText, { color: colors.accentDark }]}>+ Add all suggested</Text>
                </TouchableOpacity>
              )}
            </View>

            <KeywordTagsInput
              tags={keywords}
              onChangeTags={setKeywords}
              suggestions={suggestedTags}
            />
          </View>

          {/* Optional SKU / Code */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PRODUCT CODE / SKU (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. JBB-ST-12-01"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </View>

          {/* Description (Optional) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>DESCRIPTION / SPECIFICATIONS (OPTIONAL)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Slate thickness, wood finish, cloth type, included accessories..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Modal */}
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
  applyAllText: {
    ...Typography.bodySmall,
    fontWeight: '600',
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
    textAlign: 'center',
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
  textInput: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyLarge,
  },
  textArea: {
    height: 100,
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
  duplicateWarningCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  duplicateWarningTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  duplicateWarningProduct: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    marginTop: 2,
  },
  duplicateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  duplicateOpenBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  duplicateOpenBtnText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  duplicateDismissBtn: {
    paddingVertical: 5,
  },
  duplicateDismissBtnText: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
});
