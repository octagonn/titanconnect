// tests/profileUtils.test.ts

import { limitBio, formatJoinDate } from "@/lib/profileUtils";

// Tests for export functions in
//  /lib/profileUtils.ts
// use `npm tests` to run Jest tests from root
describe("limitBio", () => {
  test("allows bio under 150 chars", () => {
    expect(limitBio("hello")).toBe("hello");
  });

  test("trims bio over 150 chars", () => {
    const longText = "a".repeat(200);
    expect(limitBio(longText).length).toBe(150);
  });
});

describe("formatJoinDate", () => {
  test("formats date correctly", () => {
    expect(formatJoinDate("2024-03-01")).toBe("March 2024");
  });
});
