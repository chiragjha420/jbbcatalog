import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Alert, Linking, Platform } from 'react-native';
import RNShare, { Social } from 'react-native-share';
import { saveImagesToGallery } from './mediaService';

export interface ShareOptions {
  productTitle?: string;
  sku?: string;
  dialogTitle?: string;
}

let isSharingActive = false;

/**
 * Ensure image URIs are located in the app's cache directory so Android's
 * FileProvider (<cache-path name="rnshare2" path="/" />) can grant access to WhatsApp.
 */
async function prepareCacheUris(imageUris: string[]): Promise<string[]> {
  const shareDir = `${FileSystem.cacheDirectory || ''}share_temp/`;
  try {
    const dirInfo = await FileSystem.getInfoAsync(shareDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(shareDir, { intermediates: true });
    }
  } catch {}

  const cached: string[] = [];
  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];
    try {
      const validUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const destUri = `${shareDir}share_${i}_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: validUri, to: destUri });
      cached.push(destUri);
    } catch {
      cached.push(uri.startsWith('file://') ? uri : `file://${uri}`);
    }
  }
  return cached;
}

/**
 * Open WhatsApp directly on the device
 */
export async function openWhatsApp(): Promise<boolean> {
  const whatsappUrl = Platform.OS === 'ios' ? 'whatsapp://' : 'whatsapp://send';
  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      const canOpenScheme = await Linking.canOpenURL('whatsapp://');
      if (canOpenScheme) {
        await Linking.openURL('whatsapp://');
        return true;
      }
      Alert.alert(
        'WhatsApp Not Installed',
        'WhatsApp does not appear to be installed on this device. Photos are saved in your phone gallery.'
      );
      return false;
    }
  } catch (err) {
    console.warn('Error opening WhatsApp:', err);
    return false;
  }
}

/**
 * Share single image directly into OS native share sheet (WhatsApp, etc.)
 */
export async function shareSingleImage(imageUri: string, options: ShareOptions = {}): Promise<boolean> {
  if (isSharingActive) {
    console.warn('Share is already in progress, skipping concurrent call.');
    return false;
  }

  try {
    isSharingActive = true;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const cachedUris = await prepareCacheUris([imageUri]);
    const targetUri = cachedUris[0] || imageUri;

    // 1. Try react-native-share native module directly targeting WhatsApp
    try {
      if (RNShare && typeof RNShare.open === 'function') {
        const isWAPresent = await RNShare.isPackageInstalled('com.whatsapp');
        const isW4BPresent = await RNShare.isPackageInstalled('com.whatsapp.w4b');

        if (isWAPresent?.isInstalled) {
          const res = await RNShare.shareSingle({
            social: Social.Whatsapp,
            url: targetUri,
            type: 'image/jpeg',
          });
          return res?.success ?? true;
        } else if (isW4BPresent?.isInstalled) {
          const res = await RNShare.shareSingle({
            social: Social.Whatsappbusiness,
            url: targetUri,
            type: 'image/jpeg',
          });
          return res?.success ?? true;
        }

        // Otherwise open system share sheet
        const res = await RNShare.open({
          title: options.dialogTitle || (options.productTitle ? `Share ${options.productTitle}` : 'Share Product Photo'),
          url: targetUri,
          type: 'image/jpeg',
          failOnCancel: false,
        });
        return res?.success ?? true;
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('User did not share') || msg.includes('CANCELLED') || msg.includes('dismissed')) {
        return false;
      }
      console.warn('Native single share fallback to expo-sharing:', msg);
    }

    // 2. Fallback to expo-sharing
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
      return false;
    }

    const dialogTitle =
      options.dialogTitle || (options.productTitle ? `Share ${options.productTitle}` : 'Share Product Photo');

    await Sharing.shareAsync(targetUri, {
      mimeType: 'image/jpeg',
      dialogTitle,
      UTI: 'public.jpeg',
    });

    return true;
  } catch (error: any) {
    const msg = error?.message || '';
    if (
      msg.includes('User did not share') ||
      msg.includes('cancelled') ||
      msg.includes('dismissed') ||
      msg.includes('Canceled')
    ) {
      return false;
    }
    console.error('Error sharing image:', error);
    Alert.alert('Sharing Notice', 'Unable to share photo. Please try again.');
    return false;
  } finally {
    setTimeout(() => {
      isSharingActive = false;
    }, 400);
  }
}

/**
 * Share multiple photos:
 * 1. Native Build (APK): Uses react-native-share with cached URIs to send all photos simultaneously into WhatsApp in 1 tap.
 * 2. Fallback: Automatically saves photos to gallery and opens WhatsApp.
 */
export async function shareMultipleImages(
  imageUris: string[],
  options: ShareOptions = {}
): Promise<boolean> {
  if (!imageUris || imageUris.length === 0) {
    Alert.alert('No Photos Selected', 'Please select at least one photo to share.');
    return false;
  }

  // Single photo: Direct native share
  if (imageUris.length === 1) {
    return await shareSingleImage(imageUris[0], options);
  }

  if (isSharingActive) {
    return false;
  }

  try {
    isSharingActive = true;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Prepare files in cache directory so FileProvider has full permission
    const cachedUris = await prepareCacheUris(imageUris);

    // 1. Attempt true 1-tap direct WhatsApp sharing via react-native-share
    try {
      if (RNShare && typeof RNShare.open === 'function') {
        const isWAPresent = await RNShare.isPackageInstalled('com.whatsapp');
        const isW4BPresent = await RNShare.isPackageInstalled('com.whatsapp.w4b');

        if (isWAPresent?.isInstalled) {
          const res = await RNShare.shareSingle({
            social: Social.Whatsapp,
            urls: cachedUris,
            type: 'image/jpeg',
          });
          return res?.success ?? true;
        } else if (isW4BPresent?.isInstalled) {
          const res = await RNShare.shareSingle({
            social: Social.Whatsappbusiness,
            urls: cachedUris,
            type: 'image/jpeg',
          });
          return res?.success ?? true;
        }

        // Fallback to open chooser if WhatsApp package check didn't match
        const shareResult = await RNShare.open({
          title: options.productTitle ? `Share ${options.productTitle}` : 'Share Product Photos',
          urls: cachedUris,
          type: 'image/jpeg',
          failOnCancel: false,
        });

        return shareResult?.success ?? true;
      }
    } catch (nativeErr: any) {
      const errorMsg = nativeErr?.message || '';
      if (
        errorMsg.includes('User did not share') ||
        errorMsg.includes('CANCELLED') ||
        errorMsg.includes('dismissed') ||
        errorMsg.includes('canceled')
      ) {
        return false;
      }
      console.warn('Native multi-share error, falling back to gallery+whatsapp helper:', nativeErr);
    }

    // 2. Fallback helper (when testing in Expo Go or if native intent fails)
    return new Promise<boolean>((resolve) => {
      const count = imageUris.length;
      Alert.alert(
        `Share ${count} Photos to WhatsApp`,
        `Save all ${count} photos to your phone gallery to send them together in WhatsApp, or share the first photo directly.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Share 1st Photo',
            onPress: async () => {
              const res = await shareSingleImage(imageUris[0], options);
              resolve(res);
            },
          },
          {
            text: 'Save & Open WhatsApp',
            onPress: async () => {
              const saveRes = await saveImagesToGallery(imageUris);
              if (saveRes.success) {
                await openWhatsApp();
                resolve(true);
              } else {
                resolve(false);
              }
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  } finally {
    setTimeout(() => {
      isSharingActive = false;
    }, 400);
  }
}
