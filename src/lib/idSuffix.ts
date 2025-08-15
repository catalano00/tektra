// Utility to suggest a unique componentId suffix (A..Z, AA..ZZ then 01..99)
export function suggestSuffix(base: string, taken: Set<string>): string {
  const cleanBase = base.trim();
  if (!taken.has(cleanBase)) return cleanBase; // base itself free (unlikely if we're here)
  const make = (s: string) => `${cleanBase}-${s}`;
  // Single letters A..Z
  for (let i = 0; i < 26; i++) {
    const cand = make(String.fromCharCode(65 + i));
    if (!taken.has(cand)) return cand;
  }
  // Double letters AA..ZZ (26^2 = 676)
  for (let a = 0; a < 26; a++) {
    for (let b = 0; b < 26; b++) {
      const cand = make(String.fromCharCode(65 + a) + String.fromCharCode(65 + b));
      if (!taken.has(cand)) return cand;
    }
  }
  // Numeric 01..99
  for (let n = 1; n < 100; n++) {
    const cand = make(n.toString().padStart(2, '0'));
    if (!taken.has(cand)) return cand;
  }
  // Last resort timestamp fragment
  const ts = Date.now().toString().slice(-5);
  return make(ts);
}

export function nextAvailableId(base: string, existingIds: (string | null | undefined)[]): string {
  return suggestSuffix(base, new Set(existingIds.filter(Boolean) as string[]));
}
