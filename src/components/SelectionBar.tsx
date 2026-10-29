import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share2, Download, X } from 'lucide-react-native';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface SelectionBarProps {
  selectedCount: number;
  totalCount: number;
  onShare: () => void;
  onDownload: () => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export const SelectionBar: React.FC<SelectionBarProps> = ({
  selectedCount,
  totalCount,
  onShare,
  onDownload,
  onClear,
  onSelectAll,
}) => {
  const { colors } = useTheme();

  if (selectedCount === 0) return null;

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShare();
  };

  const handleDownload = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDownload();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClear();
  };

  const isAllSelected = selectedCount === totalCount;

  return (
    <View style={styles.floatingWrapper}>
      <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {/* Left: Close & Count */}
        <View style={styles.leftGroup}>
          <TouchableOpacity
            onPress={handleClear}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Cancel selection"
          >
            <X size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.countText, { color: colors.textPrimary }]}>
            {selectedCount} selected
          </Text>
        </View>

        {/* Center: Select All / None toggle */}
        <TouchableOpacity
          onPress={isAllSelected ? onClear : onSelectAll}
          style={styles.selectAllBtn}
        >
          <Text style={[styles.selectAllText, { color: colors.selectionBlue }]}>
            {isAllSelected ? 'Deselect' : 'Select All'}
          </Text>
        </TouchableOpacity>

        {/* Right: Actions */}
        <View style={styles.actionsGroup}>
          <TouchableOpacity
            onPress={handleDownload}
            style={[styles.iconActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Download selected photos"
          >
            <Download size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareActionBtn}
            accessibilityRole="button"
            accessibilityLabel="Share to WhatsApp"
          >
            <Share2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.shareActionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingWrapper: {
    position: 'absolute',
    bottom: 28,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    ...Shadows.floating,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  countText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    fontSize: 14,
  },
  selectAllBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  selectAllText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: Radius.full,
  },
  shareActionText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 14,
  },
});
