import { supabase } from './supabase';
// Use the legacy API to avoid runtime errors in SDK 54+ while we migrate to the
// new File/Directory-based filesystem API.
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

// Web image picks come back as `blob:http://...` URIs with no filename or
// extension at all — `uri.split('.').pop()` on one of those returns the
// entire URI (colons and slashes included), which then gets used verbatim
// as the storage object's "extension", producing a mangled key. Only trust
// a dot that appears in the last path segment of a real file path/URL.
function getFileExtension(uri: string): string {
  if (uri.startsWith('blob:') || uri.startsWith('data:')) return 'jpg';
  const lastSegment = uri.split('?')[0].split('#')[0].split('/').pop() || '';
  const dotIndex = lastSegment.lastIndexOf('.');
  return dotIndex >= 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : 'jpg';
}

const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
};

function getContentType(ext: string): string {
  return MIME_TYPES[ext] ?? `image/${ext}`;
}

// Maps a blob's real MIME subtype back to a file extension — web picks come
// back as `blob:`/`data:` URIs with no extension in the path, so the
// filename-based guess above defaults to "jpg" even for videos. The blob's
// own `.type` (set by the browser from the source file) is the only
// reliable signal there, and matters for the upload's Content-Type header
// (wrong header breaks <video> playback/range requests).
const EXT_FROM_MIME_SUBTYPE: Record<string, string> = {
  jpeg: 'jpg',
  quicktime: 'mov',
  'x-m4v': 'm4v',
};

export async function uploadImage(bucket: string, uri: string): Promise<string | null> {
  try {
    let ext = getFileExtension(uri);
    let contentType = getContentType(ext);
    let blobOrBuffer: Blob | ArrayBuffer;

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      blobOrBuffer = blob;
      if (blob.type) {
        contentType = blob.type;
        const subtype = blob.type.split('/')[1];
        if (subtype) ext = EXT_FROM_MIME_SUBTYPE[subtype] ?? subtype;
      }
    } else {
      // Read file as base64 (string literal avoids missing enum on some runtimes)
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      // Convert to ArrayBuffer for Supabase storage
      blobOrBuffer = decode(base64);
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const options: any = { contentType, upsert: false };

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
