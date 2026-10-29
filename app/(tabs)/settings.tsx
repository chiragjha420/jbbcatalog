import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HardDrive,
  Download,
  Upload,
  Trash2,
  FolderTree,
  Sun,
  Moon,
  Smartphone,
  Check,
} from 'lucide-react-native';
import { useLibraryStore } from '@/store/useLibraryStore';
import { exportLibraryBackup, restoreLibraryBackup } from '@/services/backupService';
import { clearEntireLibrary } from '@/db/productsRepository';
import { Radius, Spacing, Typography, ThemeMode } from '@/constants/theme';
import { useTheme } from '@/store/useThemeStore';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const router = useRouter();
  const { stats, fetchStats, refreshAll } = useLibraryStore();
  const { mode, setMode, colors } = useTheme();

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleSelectTheme = (newMode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
  };

  const handleBackup = async () => {
    setIsExporting(true);
    try {
      await exportLibraryBackup();
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Library',
      'Select a JBB backup JSON file to import. All products, photos, categories, and keywords from the file will be imported onto this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select File',
          onPress: async () => {
            setIsRestoring(true);
            try {
              const res = await restoreLibraryBackup();
              if (res.success) {
                await refreshAll();
              }
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const handleClearLibrary = () => {
    Alert.alert(
      'Wipe Entire Library',
      'Are you sure you want to delete all products, categories, and photos? This cannot be undone unless you have a backup.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await clearEntireLibrary();
            await refreshAll();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Library Cleared', 'All local records and images have been removed.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Catalogue preferences & backups</Text>
        </View>

        {/* Theme / Appearance Selection */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APPEARANCE</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          {/* Device Theme Option */}
          <TouchableOpacity
            style={styles.themeOptionRow}
            onPress={() => handleSelectTheme('system')}
            activeOpacity={0.7}
          >
            <View style={styles.themeOptionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <Smartphone size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Device theme</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>Match phone system theme</Text>
              </View>
            </View>
            {mode === 'system' && <Check size={20} color={colors.selectionBlue} strokeWidth={2.5} />}
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          {/* Light Theme Option */}
          <TouchableOpacity
            style={styles.themeOptionRow}
            onPress={() => handleSelectTheme('light')}
            activeOpacity={0.7}
          >
            <View style={styles.themeOptionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <Sun size={18} color="#D97706" />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Light</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>Always use light appearance</Text>
              </View>
            </View>
            {mode === 'light' && <Check size={20} color={colors.selectionBlue} strokeWidth={2.5} />}
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          {/* Dark Theme Option */}
          <TouchableOpacity
            style={styles.themeOptionRow}
            onPress={() => handleSelectTheme('dark')}
            activeOpacity={0.7}
          >
            <View style={styles.themeOptionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <Moon size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Dark</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>Always use dark appearance</Text>
              </View>
            </View>
            {mode === 'dark' && <Check size={20} color={colors.selectionBlue} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>

        {/* Library Storage Stats Card */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>LOCAL STORAGE</Text>
        <View style={[styles.statsCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <View style={styles.statsHeader}>
            <HardDrive size={18} color={colors.textPrimary} />
            <Text style={[styles.statsTitle, { color: colors.textPrimary }]}>Device Usage</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.productCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Products</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.imageCount ?? 0}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Photos</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats?.storageFormatted ?? '0 KB'}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Disk Space</Text>
            </View>
          </View>
        </View>

        {/* Backup & Transfer Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>CATALOGUE BACKUP & TRANSFER</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleBackup}
            disabled={isExporting}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.accentLight }]}>
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.accentDark} />
                ) : (
                  <Upload size={18} color={colors.accentDark} />
                )}
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Backup Library</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                  Export catalogue with all photos to share via WhatsApp
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRestore}
            disabled={isRestoring}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
                {isRestoring ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Download size={18} color={colors.textPrimary} />
                )}
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Restore Library</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                  Import a backup JSON from another phone
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Catalogue Management Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ORGANIZATION</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(tabs)/categories')}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
                <FolderTree size={18} color={colors.textPrimary} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.textPrimary }]}>Manage Categories</Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                  {stats?.categoryCount ?? 0} active categories
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionHeader, { color: colors.destructive }]}>DANGER ZONE</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleClearLibrary}>
            <View style={styles.menuLeft}>
              <View style={[styles.iconCircle, { backgroundColor: colors.destructiveLight }]}>
                <Trash2 size={18} color={colors.destructive} />
              </View>
              <View>
                <Text style={[styles.menuTitle, { color: colors.destructive }]}>
                  Wipe Entire Library
                </Text>
                <Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>
                  Delete all products, photos, and categories
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Version Info */}
        <View style={styles.aboutFooter}>
          <Text style={[styles.aboutAppName, { color: colors.textMuted }]}>JBB Product Gallery v1.1.0</Text>
          <Text style={[styles.aboutTagline, { color: colors.textMuted }]}>
            Fast Offline Product Photo Catalogue for Sales
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl * 2,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.titleLarge,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  statsCard: {
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  statsTitle: {
    ...Typography.caption,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.titleMedium,
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionHeader: {
    ...Typography.caption,
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  menuGroup: {
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    fontSize: 15,
  },
  menuSubtitle: {
    ...Typography.bodySmall,
    fontSize: 12,
    marginTop: 1,
  },
  menuDivider: {
    height: 1,
    marginLeft: 58,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  aboutAppName: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  aboutTagline: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});
