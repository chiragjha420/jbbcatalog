import * as Crypto from 'expo-crypto';
import { idbGetAll, idbPut, idbDelete } from '@/db/indexedDb';

export interface WebBlobRecord {
  id: string;
  dataUrl: string;
  size: number;
}

export async function ensureDirectoriesExist(): Promise<void> {
  // Web does not need directory creation
}

/**
 * Resizes an image Data URL using HTML Canvas for optimized, fast thumbnail rendering
 */
async function generateThumbnailDataUrl(
  dataUrl: string,
  maxWidth = 420
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { dataUrl, width: 420, height: 420 };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ dataUrl: thumbUrl, width, height });
      } else {
        resolve({ dataUrl, width: img.width, height: img.height });
      }
    };

    img.onerror = () => {
      resolve({ dataUrl, width: 400, height: 400 });
    };

    img.src = dataUrl;
  });
}

/**
 * Converts a URI (blob:, file:, or data:) to a persistent Base64 Data URL
 */
async function uriToDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;

  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Could not convert URI to Data URL:', err);
    return uri;
  }
}

/**
 * Process and save an image to Web IndexedDB
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
  const id = customImageId || Crypto.randomUUID();
  const originalDataUrl = await uriToDataUrl(sourceUri);
  const { dataUrl: thumbDataUrl, width, height } = await generateThumbnailDataUrl(originalDataUrl, 420);

  // Store in IndexedDB blobs
  const approxSize = Math.round((originalDataUrl.length * 3) / 4);
  await idbPut<WebBlobRecord>('blobs', {
    id: `img_${id}`,
    dataUrl: originalDataUrl,
    size: approxSize,
  });

  const approxThumbSize = Math.round((thumbDataUrl.length * 3) / 4);
  await idbPut<WebBlobRecord>('blobs', {
    id: `thumb_${id}`,
    dataUrl: thumbDataUrl,
    size: approxThumbSize,
  });

  return {
    id,
    localUri: originalDataUrl,
    thumbnailUri: thumbDataUrl,
    width,
    height,
  };
}

/**
 * Delete local image records from IndexedDB
 */
export async function deleteLocalImageFiles(
  localUri: string,
  thumbnailUri: string
): Promise<void> {
  try {
    const allBlobs = await idbGetAll<WebBlobRecord>('blobs');
    for (const b of allBlobs) {
      if (b.dataUrl === localUri || b.dataUrl === thumbnailUri) {
        await idbDelete('blobs', b.id);
      }
    }
  } catch (err) {
    console.warn('Error deleting web image blob:', err);
  }
}

/**
 * Compute total library storage usage in Web IndexedDB
 */
export async function getLibraryStorageUsage(): Promise<{ bytes: number; formatted: string }> {
  try {
    const allBlobs = await idbGetAll<WebBlobRecord>('blobs');
    const totalBytes = allBlobs.reduce((acc, b) => acc + (b.size || 0), 0);

    if (totalBytes === 0) return { bytes: 0, formatted: '0 MB' };
    const mb = totalBytes / (1024 * 1024);
    if (mb < 0.1) {
      const kb = totalBytes / 1024;
      return { bytes: totalBytes, formatted: `${kb.toFixed(1)} KB` };
    }
    return { bytes: totalBytes, formatted: `${mb.toFixed(1)} MB` };
  } catch {
    return { bytes: 0, formatted: '0 MB' };
  }
}
