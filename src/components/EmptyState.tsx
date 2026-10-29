import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LucideIcon, Plus } from 'lucide-react-native';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
}) => {
  const { colors, isDark } = useTheme();

  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onAction) onAction();
  };

  return (
    <View style={styles.container}>
      {Icon && (
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Icon size={36} color={colors.textMuted} strokeWidth={1.5} />
        </View>
      )}

      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      {description && <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? colors.surfaceElevated : colors.primary }]}
          onPress={handleAction}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          {ActionIcon && <ActionIcon size={18} color={isDark ? colors.textPrimary : '#FFFFFF'} style={{ marginRight: 6 }} />}
          <Text style={[styles.actionText, { color: isDark ? colors.textPrimary : '#FFFFFF' }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.xxxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  title: {
    ...Typography.titleMedium,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    maxWidth: 280,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    elevation: 3,
  },
  actionText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});
