import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Heart, Images as ImagesIcon } from 'lucide-react-native';
import { Product } from '@/types';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onLongPress?: () => void;
}

const { width } = Dimensions.get('window');
const CARD_GAP = Spacing.md;
const HORIZONTAL_PADDING = Spacing.lg * 2;
const CARD_WIDTH = (width - HORIZONTAL_PADDING - CARD_GAP) / 2;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onLongPress,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Product: ${product.name}`}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
        {product.primary_thumbnail_uri ? (
          <Image
            source={{ uri: product.primary_thumbnail_uri }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderContainer, { backgroundColor: colors.surfaceSubtle }]}>
            <ImagesIcon size={32} color={colors.textMuted} />
          </View>
        )}

        {/* Image count badge */}
        {product.image_count > 1 && (
          <View style={styles.countBadge}>
            <ImagesIcon size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.countText}>{product.image_count}</Text>
          </View>
        )}

        {/* Favorite indicator */}
        {product.is_favorite === 1 && (
          <View style={styles.favoriteBadge}>
            <Heart size={14} color="#FFFFFF" fill={colors.favorite} />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={2}>
          {product.name}
        </Text>
        {product.category_name ? (
          <Text style={[styles.categoryName, { color: colors.textMuted }]} numberOfLines={1}>
            {product.category_name}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    right: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  favoriteBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radius.full,
    padding: 5,
  },
  infoContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: 2,
  },
  productName: {
    ...Typography.titleSmall,
    fontSize: 14,
    lineHeight: 18,
  },
  categoryName: {
    ...Typography.bodySmall,
    fontSize: 12,
    marginTop: 2,
  },
});
