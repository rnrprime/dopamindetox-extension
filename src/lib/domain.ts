// Domain parsing/validation shared by the popup, options page, and blocking.
// Accepts a bare domain, a "host/path", or a full URL, and returns a normalized
// registrable host (lowercased, no scheme/port/path, no leading "www.").

const DOMAIN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function normalizeDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;

  if (s.includes('://')) {
    try {
      s = new URL(s).hostname;
    } catch {
      return null;
    }
  } else {
    // "host/path" or "host?query" -> host
    s = s.split('/')[0] ?? s;
    s = s.split('?')[0] ?? s;
  }

  // strip port and any leading www.
  s = s.split(':')[0] ?? s;
  if (s.startsWith('www.')) s = s.slice(4);

  return isValidDomain(s) ? s : null;
}

export function isValidDomain(s: string): boolean {
  return DOMAIN_RE.test(s);
}
