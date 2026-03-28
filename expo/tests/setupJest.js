// React Native mocks
jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios" }, // or "android"
}));

// Supabase mock
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
      update: jest.fn().mockResolvedValue({ data: { path: 'test' }, error: null }),
      list: jest.fn().mockResolvedValue({ data: [], error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: "https://fake-url.com/avatar.jpg" }
      })
    }
  }
}));

// Expo FileSystem mock
jest.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: jest.fn().mockResolvedValue("fake-base64")
}));

// ImagePicker mock
jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: "fake-uri.jpg" }]
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: "fake-uri.jpg" }]
  }),
  MediaTypeOptions: { Images: "images" }
}));
