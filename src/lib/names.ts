const NAME_RE = /^[\p{L}][\p{L}\p{M}' .-]{0,39}$/u;

// Returns a cleaned name, or '' if it is not valid
export function cleanName(v: unknown): string {
  const s = String(v ?? '').trim().replace(/\s+/g, ' ');
  return NAME_RE.test(s) ? s : '';
}

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, p: string, c: string) => p + c.toUpperCase());

const letters = (s: string, n: number) =>
  Array.from(s.replace(/[^\p{L}]/gu, '')).slice(0, n).join('');

// Simon Kristiansen -> ["Simon K.", "S. Kristiansen", "Si. Kr."]
export function nameSuggestions(firstName: string, lastName: string): string[] {
  const first = titleCase(firstName.trim().split(/\s+/)[0] ?? '');
  const last = titleCase(lastName.trim());
  if (!first || !last) return [];
  return Array.from(
    new Set([
      `${first} ${letters(last, 1)}.`,
      `${letters(first, 1)}. ${last}`,
      `${letters(first, 2)}. ${letters(last, 2)}.`,
    ])
  );
}
