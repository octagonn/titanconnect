//tests/uploadProfilePicture.test.ts
import { supabase } from "@/lib/supabase";
import * as FileSystem from "expo-file-system/legacy";
import { uploadProfilePicture } from "@/lib/uploadProfilePicture"; 
// Test for uploadProfilePicture function in profile.tsx
// ensures that profile picture upload and update works correctly
describe("uploadProfilePicture", () => {
  test("uploads or updates an image and returns public URL", async () => {
    const url = await uploadProfilePicture("fake-uri", "123");

    expect(FileSystem.readAsStringAsync).toHaveBeenCalled();
    expect(supabase.storage.from).toHaveBeenCalledWith("avatars");
    expect(url).toContain("https://fake-url.com/avatar.jpg");
  });
});
