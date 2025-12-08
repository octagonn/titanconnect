export function limitBio(bio: string): string {
  return bio.length <= 150 ? bio : bio.slice(0, 150);
}

export function formatJoinDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00Z");

  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    year: "numeric",
    timeZone: "UTC",   // <<< KEY FIX to ensure consistent timezone
  };

  return date.toLocaleDateString("en-US", options);
}
