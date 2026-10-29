import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Check, X, Maximize2 } from 'lucide-react-native';
import { ProductImage } from '@/types';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface ImageCarouselProps {
  images: ProductImage[];
  selectedImageIds: string[];
  isSelectMode: boolean;
  onToggleSelect: (imageId: string) => void;
  onEnterSelectMode: (initialImageId?: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = SCREEN_WIDTH * 0.95;
const THUMB_STRIP_SIZE = 60;

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  selectedImageIds,
  isSelectMode,
  onToggleSelect,
  onEnterSelectMode,
}) => {
  const { colors, isDark } = useTheme();
  const selectedBorderColor = isDark ? '#FFFFFF' : '#000000';
  const checkCircleBg = isDark ? '#FFFFFF' : '#000000';
  const checkIconColor = isDark ? '#000000' : '#FFFFFF';
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const scrollRef = useRef<any>(null);
  const thumbScrollRef = useRef<any>(null);

  if (!images || images.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surfaceSubtle }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No photos available</Text>
      </View>
    );
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < images.length) {
      setActiveIndex(index);
      thumbScrollRef.current?.scrollTo({
        x: Math.max(0, index * (THUMB_STRIP_SIZE + Spacing.sm) - SCREEN_WIDTH / 2 + THUMB_STRIP_SIZE / 2),
        animated: true,
      });
    }
  };

  // Main carousel tap
  const handlePhotoPress = (image: ProductImage) => {
    if (isSelectMode) {
      // Single tap selects or deselects once in selection mode
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleSelect(image.id);
    } else {
      setFullscreenImage(image.local_uri);
    }
  };

  // Main carousel long-press (hold finger)
  const handlePhotoLongPress = (image: ProductImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isSelectMode) {
      onEnterSelectMode(image.id);
    } else {
      onToggleSelect(image.id);
    }
  };

  // Thumbnail strip tap
  const handleThumbPress = (image: ProductImage, index: number) => {
    if (isSelectMode) {
      // Single tap on thumbnail selects or deselects
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleSelect(image.id);
    } else {
      // Normal mode: jump to that slide
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveIndex(index);
      scrollRef.current?.scrollTo({
        x: index * SCREEN_WIDTH,
        animated: true,
      });
    }
  };

  // Thumbnail strip long-press (hold finger)
  const handleThumbLongPress = (image: ProductImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isSelectMode) {
      onEnterSelectMode(image.id);
    } else {
      onToggleSelect(image.id);
    }
  };

  const currentImage = images[activeIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Main Large Photo Carousel */}
      <View style={styles.carouselWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {images.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);
            return (
              <TouchableOpacity
                key={img.id}
                activeOpacity={0.92}
                onPress={() => handlePhotoPress(img)}
                onLongPress={() => handlePhotoLongPress(img)}
                delayLongPress={280}
                style={styles.slide}
              >
                <Image
                  source={{ uri: img.local_uri }}
                  style={[
                    styles.photo,
                    isSelected && isSelectMode && { borderWidth: 3.5, borderColor: selectedBorderColor },
                  ]}
                  resizeMode="contain"
                />

                {/* Selection Checkbox on Carousel Photo */}
                {isSelectMode && (
                  <View style={styles.selectCheckbox}>
                    {isSelected ? (
                      <View style={[styles.selectedCircle, { backgroundColor: checkCircleBg, borderColor: isDark ? '#121212' : '#FFFFFF' }]}>
                        <Check size={18} color={checkIconColor} strokeWidth={3.2} />
                      </View>
                    ) : (
                      <View style={styles.unselectedCircle} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Counter Badge (e.g. 2 / 8) */}
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {activeIndex + 1} / {images.length}
          </Text>
        </View>

        {/* Fullscreen Expand Button (when not in select mode) */}
        {!isSelectMode && currentImage && (
          <TouchableOpacity
            style={styles.expandButton}
            onPress={() => setFullscreenImage(currentImage.local_uri)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="View full screen photo"
          >
            <Maximize2 size={16} color={Colors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      {/* Selection Mode Hint */}
      {isSelectMode && (
        <View style={[styles.hintBar, { backgroundColor: colors.surfaceSubtle }]}>
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Touch any photo below to select or deselect
          </Text>
        </View>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <ScrollView
          ref={thumbScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbStripContainer}
        >
          {images.map((img, index) => {
            const isActive = index === activeIndex;
            const isSelected = selectedImageIds.includes(img.id);

            return (
              <TouchableOpacity
                key={img.id}
                onPress={() => handleThumbPress(img, index)}
                onLongPress={() => handleThumbLongPress(img)}
                delayLongPress={280}
                style={[
                  styles.thumbButton,
                  { borderColor: colors.border },
                  isActive && !isSelectMode && { borderColor: colors.primary, borderWidth: 2.5 },
                  isSelected && isSelectMode && { borderColor: selectedBorderColor, borderWidth: 2.5 },
                ]}
              >
                <Image
                  source={{ uri: img.thumbnail_uri || img.local_uri }}
                  style={styles.thumbImage}
                  resizeMode="cover"
                />

                {/* Checkbox overlay in select mode */}
                {isSelectMode && (
                  <View
                    style={[
                      styles.thumbCheckOverlay,
                      isSelected && { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.25)' },
                    ]}
                  >
                    {isSelected ? (
                      <View style={[styles.thumbMiniCheck, { backgroundColor: checkCircleBg, borderColor: isDark ? '#121212' : '#FFFFFF' }]}>
                        <Check size={12} color={checkIconColor} strokeWidth={3.5} />
                      </View>
                    ) : (
                      <View style={styles.thumbMiniUncheck} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Fullscreen Modal */}
      <Modal
        visible={!!fullscreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeFullscreenButton}
            onPress={() => setFullscreenImage(null)}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            accessibilityLabel="Close full screen"
          >
            <View style={styles.closeCircle}>
              <X size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  carouselWrapper: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    backgroundColor: '#05070A',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoSelectedBorder: {
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  selectCheckbox: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
  },
  selectedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 4,
  },
  unselectedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  counterBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'center',
  },
  counterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  expandButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    padding: Spacing.sm,
    borderRadius: Radius.full,
  },
  hintBar: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    ...Typography.bodySmall,
    fontSize: 12,
    fontWeight: '500',
  },
  thumbStripContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thumbButton: {
    width: THUMB_STRIP_SIZE,
    height: THUMB_STRIP_SIZE,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    borderWidth: 1.5,
    position: 'relative',
  },
  thumbButtonSelected: {
    borderColor: '#2563EB',
    borderWidth: 2.5,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbCheckOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 3,
  },
  thumbCheckOverlayActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.45)',
  },
  thumbMiniCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  thumbMiniUncheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  emptyContainer: {
    width: SCREEN_WIDTH,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.bodyMedium,
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullscreenButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenPhoto: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
});
