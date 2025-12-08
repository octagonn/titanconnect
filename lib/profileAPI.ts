//lib/profileAPI.ts

import { supabase } from "@/lib/supabase";
//  Emulates the update of a user's bio in the Supabase 'profiles' table.
// used in profiles.tsx tab of the app
export async function updateUserBio(id: string, bio: string) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ bio })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error };
  }

  return { success: true, data };
}
