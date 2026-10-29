import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { getDatabase } from '@/db/database';
import { Product, ProductImage, Category, BackupData } from '@/types';
import { saveProductImageLocally } from './imageService';

/**
 * Export complete local product catalogue (metadata + images) into a single portable backup file.
 * Automatically opens the native OS share sheet so the user can send it to WhatsApp, Drive, AirDrop, etc.
 */
export async function exportLibraryBackup(): Promise<boolean> {
  const db = await getDatabase();

  try {
    const products = await db.getAllAsync<Product>('SELECT * FROM products');
    const categories = await db.getAllAsync<Category>('SELECT * FROM categories');
    const images = await db.getAllAsync<ProductImage>('SELECT * FROM images');

    if (products.length === 0 && categories.length === 0) {
      Alert.alert('Empty Library', 'There is no data in your library to backup.');
      return false;
    }

    // Pack images into base64 for self-contained portability across phones
    const packedImages = [];
    for (const img of images) {
      let base64 = '';
      try {
        const fileInfo = await FileSystem.getInfoAsync(img.local_uri);
        if (fileInfo.exists) {
          base64 = await FileSystem.readAsStringAsync(img.local_uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      } catch (readErr) {
        console.warn(`Could not read image file ${img.id}:`, readErr);
      }

      packedImages.push({
        id: img.id,
        product_id: img.product_id,
        sort_order: img.sort_order,
        created_at: img.created_at,
        base64_data: base64,
        mime_type: 'image/jpeg',
      });
    }

    const backupPayload: BackupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      app_name: 'JBB Product Gallery',
      categories,
      products,
      images: packedImages,
    };

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `JBB_Library_Backup_${dateStr}.json`;
    const tempFilePath = `${FileSystem.cacheDirectory || ''}${fileName}`;

    await FileSystem.writeAsStringAsync(tempFilePath, JSON.stringify(backupPayload), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Backup Created', `Backup file saved locally at: ${tempFilePath}`);
      return true;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await Sharing.shareAsync(tempFilePath, {
      mimeType: 'application/json',
      dialogTitle: 'Save or Share Library Backup',
      UTI: 'public.json',
    });

    return true;
  } catch (error) {
    console.error('Error generating backup:', error);
    Alert.alert('Backup Failed', 'An error occurred while creating the backup file.');
    return false;
  }
}

/**
 * Restore complete catalogue from a picked backup file.
 * Restores all categories, products, images, and search indexes.
 */
export async function restoreLibraryBackup(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, message: 'Restore cancelled.' };
    }

    const pickedFile = result.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(pickedFile.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let backupData: BackupData;
    try {
      backupData = JSON.parse(fileContent);
    } catch {
      Alert.alert('Invalid Backup File', 'The selected file is not a valid JBB Gallery backup.');
      return { success: false, message: 'Invalid JSON format.' };
    }

    if (!backupData.products || !backupData.categories || !backupData.images) {
      Alert.alert('Invalid Format', 'This file does not match the JBB Gallery backup schema.');
      return { success: false, message: 'Missing schema fields.' };
    }

    const db = await getDatabase();

    // 1. Restore categories
    for (const cat of backupData.categories) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name, sort_order, created_at)
         VALUES (?, ?, ?, ?)`,
        [cat.id, cat.name, cat.sort_order, cat.created_at || Date.now()]
      );
    }

    // 2. Restore images to filesystem and database
    let restoredImageCount = 0;
    for (const img of backupData.images) {
      if (img.base64_data) {
        const tempImgPath = `${FileSystem.cacheDirectory || ''}restore_${img.id}.jpg`;
        await FileSystem.writeAsStringAsync(tempImgPath, img.base64_data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const saved = await saveProductImageLocally(tempImgPath, img.id);

        await db.runAsync(
          `INSERT OR REPLACE INTO images (id, product_id, local_uri, thumbnail_uri, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [img.id, img.product_id, saved.localUri, saved.thumbnailUri, img.sort_order, img.created_at || Date.now()]
        );
        restoredImageCount++;

        // Clean up temp file
        try {
          await FileSystem.deleteAsync(tempImgPath, { idempotent: true });
        } catch {}
      }
    }

    // 3. Restore products
    for (const prod of backupData.products) {
      // Find primary thumbnail
      const firstImg = await db.getFirstAsync<ProductImage>(
        'SELECT thumbnail_uri FROM images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1',
        [prod.id]
      );

      const imgCountRow = await db.getFirstAsync<{ count: number }>(
        'SELECT count(*) as count FROM images WHERE product_id = ?',
        [prod.id]
      );

      await db.runAsync(
        `INSERT OR REPLACE INTO products (
          id, name, sku, category_id, category_name, keywords, aliases,
          description, is_favorite, image_count, primary_thumbnail_uri,
          created_at, updated_at, recently_viewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prod.id,
          prod.name,
          prod.sku || null,
          prod.category_id || null,
          prod.category_name || null,
          prod.keywords || '',
          prod.aliases || '',
          prod.description || null,
          prod.is_favorite || 0,
          imgCountRow?.count || 0,
          firstImg?.thumbnail_uri || null,
          prod.created_at || Date.now(),
          prod.updated_at || Date.now(),
          prod.recently_viewed_at || null,
        ]
      );
    }

    // 4. Rebuild FTS5 table
    try {
      await db.runAsync('DELETE FROM products_fts;');
      await db.runAsync(`
        INSERT INTO products_fts (id, name, sku, category_name, keywords, aliases)
        SELECT id, name, coalesce(sku, ''), coalesce(category_name, ''), keywords, aliases FROM products;
      `);
    } catch {}

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const message = `Successfully restored ${backupData.products.length} products, ${backupData.categories.length} categories, and ${restoredImageCount} photos.`;
    Alert.alert('Library Restored', message);
    return { success: true, message };
  } catch (error) {
    console.error('Error restoring backup:', error);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert('Restore Failed', 'Unable to restore catalogue from the selected file.');
    return { success: false, message: 'Restore failed.' };
  }
}
