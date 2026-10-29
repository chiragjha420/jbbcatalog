export interface ShareOptions {
  productTitle?: string;
  sku?: string;
  dialogTitle?: string;
}

let isSharingActive = false;

/**
 * Open WhatsApp on Web/Mobile browser
 */
export async function openWhatsApp(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      window.open('https://api.whatsapp.com/send', '_blank');
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error opening WhatsApp on web:', err);
    return false;
  }
}

/**
 * Convert a Data URL or Blob URI to a browser File object for Web Share API
 */
async function uriToFile(uri: string, filename: string): Promise<File> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], filename, { type: mimeType });
}

/**
 * Share a single image via iOS Web Share API
 */
export async function shareSingleImage(
  imageUri: string,
  options: ShareOptions = {}
): Promise<boolean> {
  if (isSharingActive) return false;

  try {
    isSharingActive = true;
    const title = options.productTitle ? `Share ${options.productTitle}` : 'Share Product Photo';

    if (typeof navigator !== 'undefined' && navigator.share) {
      const file = await uriToFile(imageUri, 'product_photo.jpg');
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
        });
        return true;
      }
    }

    // Fallback if browser doesn't support file sharing: trigger direct image download
    if (typeof document !== 'undefined') {
      const a = document.createElement('a');
      a.href = imageUri;
      a.download = 'product_photo.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    return false;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return false; // User cancelled the share dialog
    }
    console.warn('Web share single photo error:', err);
    return false;
  } finally {
    setTimeout(() => {
      isSharingActive = false;
    }, 400);
  }
}

/**
 * Share multiple images via iOS Web Share API (native iOS share sheet with WhatsApp)
 */
export async function shareMultipleImages(
  imageUris: string[],
  options: ShareOptions = {}
): Promise<boolean> {
  if (!imageUris || imageUris.length === 0) return false;
  if (imageUris.length === 1) return await shareSingleImage(imageUris[0], options);
  if (isSharingActive) return false;

  try {
    isSharingActive = true;
    const title = options.productTitle ? `Share ${options.productTitle}` : `Share ${imageUris.length} Product Photos`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      const files: File[] = [];
      for (let i = 0; i < imageUris.length; i++) {
        const file = await uriToFile(imageUris[i], `photo_${i + 1}.jpg`);
        files.push(file);
      }

      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title,
        });
        return true;
      }
    }

    // Fallback: download all selected images
    if (typeof document !== 'undefined') {
      for (let i = 0; i < imageUris.length; i++) {
        const a = document.createElement('a');
        a.href = imageUris[i];
        a.download = `photo_${i + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      return true;
    }

    return false;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return false; // User dismissed share sheet
    }
    console.warn('Web share multiple photos error:', err);
    return false;
  } finally {
    setTimeout(() => {
      isSharingActive = false;
    }, 400);
  }
}
