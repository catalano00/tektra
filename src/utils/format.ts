export function formatAddress(project: {
  streetaddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
}) {
  const { streetaddress, city, state, zipcode } = project;

  return [
    streetaddress,
    [city, state].filter(Boolean).join(', '),
    zipcode,
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatMinutesAndSeconds(minutes: number) {
  const totalSeconds = Math.round(minutes * 60)
  const mm = Math.floor(totalSeconds / 60)
  const ss = totalSeconds % 60
  return `${mm}:${ss.toString().padStart(2, '0')}`
}

export function formatTime(seconds: number): string {
  const weeks = Math.floor(seconds / (7 * 24 * 3600));
  const days = Math.floor((seconds % (7 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export function formatDate(date: Date): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}


