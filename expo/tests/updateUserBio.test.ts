//tests/updateUserBio.test.ts

import { updateUserBio } from "@/lib/profileAPI";
import { supabase } from "../mocks/supabase";

// tESTS for updateUserBio function in profileAPI.ts
// Use the mock supabase implementation (not the real one in lib)
jest.mock("@/lib/supabase", () => require("../mocks/supabase")); 

describe("updateUserBio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls supabase with correct arguments", async () => {
    supabase.single.mockReturnValueOnce({
      data: { bio: "Hello world" },
      error: null
    });

    const result = await updateUserBio("123", "Hello world");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(supabase.update).toHaveBeenCalledWith({ bio: "Hello world" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "123");
    expect(result).toEqual({ success: true, data: { bio: "Hello world" } });
  });

  test("returns error when Supabase fails", async () => {
    supabase.single.mockReturnValueOnce({
      data: null,
      error: {
        message: "DB error",
        details: "",
        hint: "",
        code: "400",
        name: "PostgrestError"
      }
    });

    const result = await updateUserBio("123", "Hello world");

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("DB error");
  });
});
