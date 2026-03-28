//lib/uploadProfilePicture.ts
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { Alert } from "react-native";
import { Buffer } from "buffer";
// Uploads or updates a user's profile picture in Supabase Storage and 
// returns the public URL whcih is then uploaded to the profiles table under column avatar_url
export async function uploadProfilePicture(uri: string, userId: string) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
    const fileBytes = Buffer.from(base64, "base64");
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
      Alert.alert("Upload Failed", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return `${urlData.publicUrl}?v=${Date.now()}`;
  } catch (err: any) {
    Alert.alert("Unexpected Error", err.message);
    return null;
  }
}
