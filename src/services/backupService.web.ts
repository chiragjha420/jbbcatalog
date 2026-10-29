import { Product, ProductImage, Category, BackupData } from '@/types';
import { idbGetAll, idbPut } from '@/db/indexedDb';
import { WebBlobRecord } from './imageService.web';

/**
 * Export complete product catalogue into a single JSON backup file on Web/iOS PWA
 */
export async function exportLibraryBackup(): Promise<boolean> {
  try {
    const [products, categories, images, blobs] = await Promise.all([
      idbGetAll<Product>('products'),
      idbGetAll<Category>('categories'),
      idbGetAll<ProductImage>('images'),
      idbGetAll<WebBlobRecord>('blobs'),
    ]);

    if (products.length === 0 && categories.length === 0) {
      alert('There is no data in your catalogue to backup.');
      return false;
    }

    const blobMap = new Map<string, string>();
    for (const b of blobs) {
      blobMap.set(b.id, b.dataUrl);
    }

    const packedImages = images.map((img) => {
      // Find base64/dataUrl
      const dataUrl = blobMap.get(`img_${img.id}`) || img.local_uri || '';
      const base64Only = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      return {
        id: img.id,
        product_id: img.product_id,
        sort_order: img.sort_order,
        created_at: img.created_at,
        base64_data: base64Only,
        mime_type: 'image/jpeg',
      };
    });

    const backupPayload: BackupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      app_name: 'JBB Product Gallery',
      categories,
      products,
      images: packedImages,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `JBB_Library_Backup_${dateStr}.json`;
    const blob = new Blob([jsonString], { type: 'application/json' });

    // If Web Share API supports file sharing, offer native share (e.g., Save to Files, WhatsApp)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const file = new File([blob], fileName, { type: 'application/json' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'JBB Catalogue Backup',
          });
          return true;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return false;
          // Fall back to direct file download
        }
      }
    }

    // Direct browser download
    if (typeof document !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error generating web backup:', error);
    alert('An error occurred while creating the backup file.');
    return false;
  }
}

/**
 * Restore complete catalogue from a JSON backup file in Web/iOS PWA
 */
export async function restoreLibraryBackup(): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ success: false, message: 'Browser environment unavailable' });
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = async (event: any) => {
      const file = event.target?.files?.[0];
      if (!file) {
        resolve({ success: false, message: 'No backup file selected' });
        return;
      }

      try {
        const text = await file.text();
        const backup: BackupData = JSON.parse(text);

        if (!backup.version || !Array.isArray(backup.products)) {
          resolve({
            success: false,
            message: 'Invalid backup file format. Missing catalogue data.',
          });
          return;
        }

        // Restore Categories
        if (Array.isArray(backup.categories)) {
          for (const cat of backup.categories) {
            await idbPut('categories', cat);
          }
        }

        // Restore Products
        for (const prod of backup.products) {
          await idbPut('products', prod);
        }

        // Restore Images & Image Blobs
        if (Array.isArray(backup.images)) {
          for (const img of backup.images) {
            const rawData = img.base64_data || '';
            const dataUrl = rawData.startsWith('data:')
              ? rawData
              : rawData
              ? `data:${img.mime_type || 'image/jpeg'};base64,${rawData}`
              : '';

            const prodImg: ProductImage = {
              id: img.id,
              product_id: img.product_id,
              local_uri: dataUrl,
              thumbnail_uri: dataUrl,
              sort_order: img.sort_order,
              created_at: img.created_at,
            };
            await idbPut('images', prodImg);

            if (dataUrl) {
              // Store in blob store for persistence and storage calculations
              await idbPut<WebBlobRecord>('blobs', {
                id: `img_${img.id}`,
                dataUrl,
                size: Math.round((dataUrl.length * 3) / 4),
              });
              await idbPut<WebBlobRecord>('blobs', {
                id: `thumb_${img.id}`,
                dataUrl,
                size: Math.round((dataUrl.length * 3) / 4),
              });
            }
          }
        }

        resolve({
          success: true,
          message: `Successfully imported ${backup.products.length} products and ${(backup.categories || []).length} categories!`,
        });
      } catch (err: any) {
        console.error('Error importing backup:', err);
        resolve({
          success: false,
          message: `Failed to import backup: ${err.message || 'Corrupted file'}`,
        });
      }
    };

    input.click();
  });
}
