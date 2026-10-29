/**
 * Web Media Service adapter for saving images in browser / iOS Safari
 */

export async function requestMediaLibraryPermissions(): Promise<boolean> {
  return true;
}

export async function saveImagesToGallery(
  imageUris: string[]
): Promise<{ success: boolean; count: number }> {
  if (!imageUris || imageUris.length === 0) {
    return { success: false, count: 0 };
  }

  let count = 0;
  if (typeof document !== 'undefined') {
    for (let i = 0; i < imageUris.length; i++) {
      try {
        const a = document.createElement('a');
        a.href = imageUris[i];
        a.download = `jbb_photo_${i + 1}_${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        count++;
      } catch (err) {
        console.warn('Error downloading photo on web:', err);
      }
    }
  }

  return { success: count > 0, count };
}
