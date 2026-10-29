import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Heart,
  Share2,
  Download,
  Edit3,
  Tag,
  Hash,
} from 'lucide-react-native';
import { Product, ProductImage } from '@/types';
import {
  getProductById,
  getProductImages,
  toggleFavorite,
  markRecentlyViewed,
} from '@/db/productsRepository';
import { ImageCarousel } from '@/components/ImageCarousel';
import { SelectionBar } from '@/components/SelectionBar';
import { shareMultipleImages } from '@/services/shareService';
import { saveImagesToGallery } from '@/services/mediaService';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-select state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const prod = await getProductById(id);
      if (prod) {
        setProduct(prod);
        setIsFavorite(prod.is_favorite === 1);
        const imgs = await getProductImages(id);
        setImages(imgs);
        await markRecentlyViewed(id);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleFavorite = async () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newFav = await toggleFavorite(product.id);
    setIsFavorite(newFav);
  };

  // Enter select mode and optionally select the first photo
  const handleEnterSelectMode = (initialImageId?: string) => {
    setIsSelectMode(true);
    if (initialImageId) {
      setSelectedImageIds([initialImageId]);
    }
  };

  // Toggle selection with a single tap
  const handleToggleSelectImage = (imageId: string) => {
    setSelectedImageIds((prev) => {
      let updated: string[];
      if (prev.includes(imageId)) {
        updated = prev.filter((i) => i !== imageId);
      } else {
        updated = [...prev, imageId];
      }

      if (updated.length === 0) {
        setIsSelectMode(false);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImageIds(images.map((img) => img.id));
  };

  const handleClearSelection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedImageIds([]);
    setIsSelectMode(false);
  };

  const getSelectedImageUris = (): string[] => {
    return images
      .filter((img) => selectedImageIds.includes(img.id))
      .map((img) => img.local_uri);
  };

  // Share selected photos
  const handleShareSelected = async () => {
    const uris = getSelectedImageUris();
    if (uris.length === 0) return;

    await shareMultipleImages(uris, {
      productTitle: product?.name,
      sku: product?.sku,
    });
  };

  // Download selected photos
  const handleDownloadSelected = async () => {
    try {
      const uris = getSelectedImageUris();
      if (uris.length === 0) return;
      await saveImagesToGallery(uris);
    } catch (err) {
      console.warn('Error in handleDownloadSelected:', err);
    }
  };

  // Quick Share all photos of product
  const handleQuickShareAll = async () => {
    try {
      if (images.length === 0) {
        Alert.alert('No Photos', 'This product does not have any photos to share.');
        return;
      }
      const allUris = images.map((img) => img.local_uri);
      await shareMultipleImages(allUris, {
        productTitle: product?.name,
        sku: product?.sku,
      });
    } catch (err) {
      console.warn('Error in handleQuickShareAll:', err);
    }
  };

  // Quick Download all photos of product
  const handleQuickDownloadAll = async () => {
    try {
      if (images.length === 0) return;
      const allUris = images.map((img) => img.local_uri);
      await saveImagesToGallery(allUris);
    } catch (err) {
      console.warn('Error in handleQuickDownloadAll:', err);
    }
  };

  if (isLoading || !product) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const keywordList = product.keywords
    ? product.keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={[styles.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {product.name}
          </Text>
        </View>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            onPress={handleToggleFavorite}
            style={styles.navButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Toggle Favorite"
          >
            <Heart
              size={22}
              color={isFavorite ? colors.favorite : colors.textPrimary}
              fill={isFavorite ? colors.favorite : 'transparent'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/product/edit?id=${product.id}`)}
            style={styles.navButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Edit Product"
          >
            <Edit3 size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Product Heading & Category */}
        <View style={styles.headerInfo}>
          <Text style={[styles.productHeading, { color: colors.textPrimary }]}>{product.name}</Text>
          <View style={styles.metaRow}>
            {product.category_name && (
              <View style={[styles.categoryPill, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <Text style={[styles.categoryPillText, { color: colors.textSecondary }]}>{product.category_name}</Text>
              </View>
            )}
            {product.sku && (
              <View style={[styles.skuPill, { backgroundColor: colors.surfaceSubtle }]}>
                <Hash size={12} color={colors.textMuted} style={{ marginRight: 2 }} />
                <Text style={[styles.skuPillText, { color: colors.textMuted }]}>{product.sku}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Large Photo Carousel (Hero Element) */}
        <ImageCarousel
          images={images}
          selectedImageIds={selectedImageIds}
          isSelectMode={isSelectMode}
          onToggleSelect={handleToggleSelectImage}
          onEnterSelectMode={handleEnterSelectMode}
        />

        {/* Action Buttons Row (Save Photos & Share to WhatsApp) */}
        {!isSelectMode && (
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickDownloadBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              onPress={handleQuickDownloadAll}
              activeOpacity={0.8}
              accessibilityLabel="Save all photos to phone gallery"
            >
              <Download size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={[styles.quickDownloadText, { color: colors.textPrimary }]}>Save Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickShareBtn}
              onPress={handleQuickShareAll}
              activeOpacity={0.85}
              accessibilityLabel="Share to WhatsApp"
            >
              <Share2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.quickShareText} numberOfLines={1}>
                Share to WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Product Details & Keywords */}
        <View style={styles.detailsSection}>
          {product.description ? (
            <View style={styles.descriptionBox}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DESCRIPTION</Text>
              <Text style={[styles.descriptionText, { color: colors.textPrimary }]}>{product.description}</Text>
            </View>
          ) : null}

          {keywordList.length > 0 && (
            <View style={styles.keywordsBox}>
              <View style={styles.keywordsHeader}>
                <Tag size={13} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>SEARCH KEYWORDS</Text>
              </View>
              <View style={styles.keywordChipsWrap}>
                {keywordList.map((kw, i) => (
                  <View key={`${kw}-${i}`} style={[styles.keywordChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.keywordChipText, { color: colors.textSecondary }]}>{kw}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar for Multi-Select */}
      {isSelectMode && (
        <SelectionBar
          selectedCount={selectedImageIds.length}
          totalCount={images.length}
          onShare={handleShareSelected}
          onDownload={handleDownloadSelected}
          onClear={handleClearSelection}
          onSelectAll={handleSelectAll}
        />
      )}
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: Spacing.sm,
  },
  topBarTitle: {
    ...Typography.titleSmall,
    fontSize: 16,
    textAlign: 'center',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  headerInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  productHeading: {
    ...Typography.titleLarge,
    fontSize: 22,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    ...Typography.caption,
    fontSize: 11,
  },
  skuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  skuPillText: {
    ...Typography.caption,
    fontSize: 11,
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  quickDownloadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  quickDownloadText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
    fontSize: 14,
  },
  quickShareBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: '#25D366',
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    elevation: 2,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  quickShareText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
  },
  detailsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionLabel: {
    ...Typography.caption,
    letterSpacing: 0.6,
  },
  descriptionBox: {
    marginBottom: Spacing.lg,
  },
  descriptionText: {
    ...Typography.bodyMedium,
    marginTop: 4,
  },
  keywordsBox: {
    marginBottom: Spacing.lg,
  },
  keywordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  keywordChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 4,
  },
  keywordChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    borderWidth: 1,
  },
  keywordChipText: {
    ...Typography.bodySmall,
    fontSize: 12,
  },
});
