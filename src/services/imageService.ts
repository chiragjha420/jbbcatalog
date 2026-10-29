import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';

// Base document directory for permanent local storage
const BASE_DIR = `${FileSystem.documentDirectory || ''}jbb_library/`;
const IMAGES_DIR = `${BASE_DIR}images/`;
const THUMBNAILS_DIR = `${BASE_DIR}thumbnails/`;
const BACKUPS_DIR = `${BASE_DIR}backups/`;

let isInitialized = false;

/**
 * Ensure all required local library directories exist
 */
export async function ensureDirectoriesExist(): Promise<void> {
  if (isInitialized) return;

  try {
    const baseInfo = await FileSystem.getInfoAsync(BASE_DIR);
    if (!baseInfo.exists) {
      await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
    }

    const imagesInfo = await FileSystem.getInfoAsync(IMAGES_DIR);
    if (!imagesInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGES_DIR, { intermediates: true });
    }

    const thumbsInfo = await FileSystem.getInfoAsync(THUMBNAILS_DIR);
    if (!thumbsInfo.exists) {
      await FileSystem.makeDirectoryAsync(THUMBNAILS_DIR, { intermediates: true });
    }

    const backupsInfo = await FileSystem.getInfoAsync(BACKUPS_DIR);
    if (!backupsInfo.exists) {
      await FileSystem.makeDirectoryAsync(BACKUPS_DIR, { intermediates: true });
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error ensuring library directories exist:', error);
  }
}

/**
 * Process and save an image to local device filesystem.
 * Stores original resolution in images/ and generates an optimized 400px thumbnail in thumbnails/.
 */
export async function saveProductImageLocally(
  sourceUri: string,
  customImageId?: string
): Promise<{
  id: string;
  localUri: string;
  thumbnailUri: string;
  width?: number;
  height?: number;
}> {
  await ensureDirectoriesExist();

  const id = customImageId || Crypto.randomUUID();
  const destOriginalUri = `${IMAGES_DIR}${id}.jpg`;
  const destThumbnailUri = `${THUMBNAILS_DIR}${id}_thumb.jpg`;

  try {
    // 1. Copy source file to permanent images directory
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destOriginalUri,
    });

    // 2. Generate optimized 400x400 max thumbnail for instant, stutter-free 60fps grid scrolling
    const thumbResult = await ImageManipulator.manipulateAsync(
      destOriginalUri,
      [{ resize: { width: 420 } }],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // 3. Move/copy the manipulated thumbnail to permanent thumbnails folder
    await FileSystem.copyAsync({
      from: thumbResult.uri,
      to: destThumbnailUri,
    });

    // Clean up temporary manipulation file if different
    if (thumbResult.uri !== destThumbnailUri) {
      try {
        await FileSystem.deleteAsync(thumbResult.uri, { idempotent: true });
      } catch {}
    }

    return {
      id,
      localUri: destOriginalUri,
      thumbnailUri: destThumbnailUri,
      width: thumbResult.width,
      height: thumbResult.height,
    };
  } catch (error) {
    console.error('Failed to save image locally:', error);
    // Fallback: if manipulation fails, use original as thumbnail
    return {
      id,
      localUri: sourceUri,
      thumbnailUri: sourceUri,
    };
  }
}

/**
 * Delete image and thumbnail files from device storage
 */
export async function deleteLocalImageFiles(localUri: string, thumbnailUri: string): Promise<void> {
  try {
    if (localUri) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    }
    if (thumbnailUri && thumbnailUri !== localUri) {
      await FileSystem.deleteAsync(thumbnailUri, { idempotent: true });
    }
  } catch (error) {
    console.warn('Could not delete image file:', error);
  }
}

/**
 * Calculate total disk space consumed by library photos and thumbnails
 */
export async function getLibraryStorageUsage(): Promise<{ bytes: number; formatted: string }> {
  await ensureDirectoriesExist();

  let totalBytes = 0;

  async function calculateDirSize(dirPath: string): Promise<number> {
    try {
      const files = await FileSystem.readDirectoryAsync(dirPath);
      let size = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${dirPath}${file}`);
        if (fileInfo.exists && !fileInfo.isDirectory && typeof fileInfo.size === 'number') {
          size += fileInfo.size;
        }
      }
      return size;
    } catch {
      return 0;
    }
  }

  const imagesBytes = await calculateDirSize(IMAGES_DIR);
  const thumbsBytes = await calculateDirSize(THUMBNAILS_DIR);
  totalBytes = imagesBytes + thumbsBytes;

  let formatted = '0 KB';
  if (totalBytes > 1024 * 1024 * 1024) {
    formatted = `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (totalBytes > 1024 * 1024) {
    formatted = `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else if (totalBytes > 1024) {
    formatted = `${Math.round(totalBytes / 1024)} KB`;
  } else if (totalBytes > 0) {
    formatted = `${totalBytes} B`;
  }

  return { bytes: totalBytes, formatted };
}

/**
 * Get directory paths for backup / export operations
 */
export function getStoragePaths() {
  return {
    BASE_DIR,
    IMAGES_DIR,
    THUMBNAILS_DIR,
    BACKUPS_DIR,
  };
}
