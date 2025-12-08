// lib/profileUtils.ts
// To test key functions in profile.tsx

// Used to limit bio length and format join date using same char limit as Instagram
export function limitBio(bio: string): string {
  return bio.length <= 150 ? bio : bio.slice(0, 150);
}

// Formats a date string (ISO format) to "Month Year" format, e.g., "March 2024"
export function formatJoinDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00Z");

  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
    timeZone: "UTC",   // <<< KEY FIX to ensure consistent timezone
  };

  return date.toLocaleDateString("en-US", options);
}
