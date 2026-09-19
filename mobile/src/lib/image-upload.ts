import type { ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

export function appendImageAsset(
  formData: FormData,
  asset: ImagePickerAsset,
  field = 'image',
) {
  const filename = asset.fileName ?? `product-${Date.now()}.jpg`;
  if (Platform.OS === 'web' && asset.file) {
    formData.append(field, asset.file, filename);
    return;
  }

  // React Native FormData file shape (Expo Go / classic FileSystem).
  formData.append(field, {
    uri: asset.uri,
    name: filename,
    type: asset.mimeType ?? 'image/jpeg',
  } as unknown as Blob);
}
