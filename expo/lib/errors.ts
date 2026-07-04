// A raw JSON.parse SyntaxError ("Unexpected token X is not valid JSON",
// "Unexpected end of JSON input") means the network/server returned
// something that wasn't a real API response — a rate-limit page, a proxy
// timeout, a deploy in progress — not an application error. Surfacing the
// parser's own message to the user ("Unexpected token T...") is confusing;
// show a generic retry message instead.
export function getFriendlyErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  if (/json/i.test(message) && /unexpected|not valid/i.test(message)) {
    return 'Server is temporarily unavailable. Please try again in a moment.';
  }

  return message || fallback;
}
