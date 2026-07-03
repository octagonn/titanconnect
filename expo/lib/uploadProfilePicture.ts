//lib/uploadProfilePicture.ts
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { showAlert } from "@/lib/alert";
import { Buffer } from "buffer";
// Uploads or updates a user's profile picture in Supabase Storage and
// returns the public URL whcih is then uploaded to the profiles table under column avatar_url
export async function uploadProfilePicture(uri: string, userId: string) {
  try {
    let fileBytes: Buffer | Blob;
    if (Platform.OS === "web") {
      // expo-file-system is unavailable on web; the picker returns a blob:/data: URI
      const response = await fetch(uri);
      fileBytes = await response.blob();
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
      fileBytes = Buffer.from(base64, "base64");
    }
    const filePath = `${userId}.jpg`;

    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list("", { search: filePath });

    const exists = existingFiles?.some(f => f.name === filePath);

    let result, error;

    if (exists) {
      ({ data: result, error } = await supabase.storage
        .from("avatars")
        .update(filePath, fileBytes, { contentType: "image/jpeg" }));
    } else {
      ({ data: result, error } = await supabase.storage
        .from("avatars")
        .upload(filePath, fileBytes, { contentType: "image/jpeg" }));
    }

    if (error) {
      showAlert("Upload Failed", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return `${urlData.publicUrl}?v=${Date.now()}`;
  } catch (err: any) {
    showAlert("Unexpected Error", err.message);
    return null;
  }
}
