// jest.config.js
module.exports = {
  preset: "jest-expo",

  testEnvironment: "node",

  transformIgnorePatterns: [
    "node_modules/(?!(expo|expo-.*|@expo|@expo/.*|react-native|@react-native|expo-modules-core)/)"
  ],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "\\.(png|jpg|jpeg)$": "<rootDir>/tests/fileMock.js"
  },

  setupFiles: ["<rootDir>/tests/setupJest.js"]
};
