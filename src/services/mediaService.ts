import * as MediaLibrary from 'expo-media-library/legacy';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

/**
 * Request photo library permissions with simple, non-technical explanation
 */
export async function requestMediaLibraryPermissions(): Promise<boolean> {
  try {
    // Check existing permissions first
    const current = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (
      current.status === 'granted' ||
      current.accessPrivileges === 'all' ||
      current.accessPrivileges === 'limited'
    ) {
      return true;
    }

    if (current.canAskAgain) {
      const requested = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (
        requested.status === 'granted' ||
        requested.accessPrivileges === 'all' ||
        requested.accessPrivileges === 'limited'
      ) {
        return true;
      }
    }

    // Secondary attempt with writeOnly = true for platforms that prefer write-only permissions
    try {
      const writeOnly = await MediaLibrary.requestPermissionsAsync(true);
      if (writeOnly.status === 'granted') {
        return true;
      }
    } catch {
      // Ignore secondary error
    }

    Alert.alert(
      'Photo Access Needed',
      'Please allow Photo access in your phone Settings so you can save product photos to your phone gallery.'
    );
    return false;
  } catch (error) {
    console.warn('Permission request error:', error);
    // Allow saving attempt to proceed in case the OS handles it on demand
    return true;
  }
}

/**
 * Save selected photos to the device's photo gallery
 */
export async function saveImagesToGallery(
  imageUris: string[]
): Promise<{ success: boolean; count: number }> {
  if (!imageUris || imageUris.length === 0) {
    Alert.alert('No Photos Selected', 'Select at least one photo to download.');
    return { success: false, count: 0 };
  }

  const hasPermission = await requestMediaLibraryPermissions();
  if (!hasPermission) {
    return { success: false, count: 0 };
  }

  let savedCount = 0;

  for (const uri of imageUris) {
    try {
      if (!uri) continue;
      const validUri = uri.startsWith('file://') ? uri : `file://${uri}`;

      // Verify file exists
      const info = await FileSystem.getInfoAsync(validUri);
      if (!info.exists) {
        console.warn('Image file does not exist at uri:', validUri);
        continue;
      }

      // Try saveToLibraryAsync (recommended by Expo for saving to camera roll)
      if (MediaLibrary.saveToLibraryAsync) {
        await MediaLibrary.saveToLibraryAsync(validUri);
        savedCount++;
      } else if (MediaLibrary.createAssetAsync) {
        await MediaLibrary.createAssetAsync(validUri);
        savedCount++;
      }
    } catch (err: any) {
      console.warn('Error saving individual asset with primary method:', err);
      // Fallback to createAssetAsync if saveToLibraryAsync had an issue
      try {
        const validUri = uri.startsWith('file://') ? uri : `file://${uri}`;
        if (MediaLibrary.createAssetAsync) {
          await MediaLibrary.createAssetAsync(validUri);
          savedCount++;
        }
      } catch (fallbackErr) {
        console.warn('Fallback createAssetAsync also failed for uri:', uri, fallbackErr);
      }
    }
  }

  if (savedCount > 0) {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics is optional
    }

    const message =
      savedCount === 1
        ? 'Saved 1 photo directly to your phone gallery.'
        : `Saved ${savedCount} photos directly to your phone gallery.`;

    Alert.alert('Saved to Photos', message);
    return { success: true, count: savedCount };
  } else {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics is optional
    }
    Alert.alert(
      'Download Failed',
      'Unable to save images to your phone gallery. Please check storage permissions in Settings.'
    );
    return { success: false, count: 0 };
  }
}
