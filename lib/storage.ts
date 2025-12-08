import { supabase } from './supabase';
// Use the legacy API to avoid runtime errors in SDK 54+ while we migrate to the
// new File/Directory-based filesystem API.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

export async function uploadImage(bucket: string, uri: string): Promise<string | null> {
  try {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    let blobOrBuffer: Blob | ArrayBuffer;
    let options: any = {
      contentType: `image/${ext}`,
      upsert: false,
    };

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      blobOrBuffer = await response.blob();
    } else {
      // Read file as base64 (string literal avoids missing enum on some runtimes)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      // Convert to ArrayBuffer for Supabase storage
      blobOrBuffer = decode(base64);
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blobOrBuffer, options);

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload image exception:', error);
    return null;
  }
}
