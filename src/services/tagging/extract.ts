/**
 * Pure narration → key extraction for the tagging engine.
 *
 * Deterministic and side-effect free: no I/O, no clock, no randomness, no
 * module-level mutable state. Ported and hardened from the old app's
 * `TransactionService.createSearchIndex`.
 *
 * See `docs/auto-tagging-design.md` §6 and `docs/tagging-engine-spec.md` §3.
 */

// Transport / rail noise. A token is noise when it shares a prefix relationship
// with one of these keywords — `startsWith` catches glued fragments like
// `UPIINT`, and the reverse prefix catches PDF-split fragments such as the `PA`
// in a broken `PA YMENT` (`pay` starts with `pa`). (design §6.2)
const NOISE_WORDS: readonly string[] = [
  "upi",
  "neft",
  "imps",
  "ach",
  "pay",
  "paytm",
  "phonepe",
  "gpay",
  "googlepay",
  "bhim",
  "razorpay",
  "rzp",
];

// Value-date boilerplate, dropped wholesale. (design §6.2)
const BOILERPLATE_WORDS: readonly string[] = ["value", "dt", "ref"];

// Spelled-out date phrases, dropped by EXACT match (never prefix — `mar` must
// not kill `marketplace`). Recurring narration suffixes like
// `... SALARY PAYMENT FOR MAY 2026` would otherwise give every month's payment
// a distinct signature (the month name + `for` survive stripping), breaking
// recurrence/similar detection. These are date noise, like the numeric dates
// already stripped. (design §6.2)
const DATE_FILLER_WORDS: readonly string[] = [
  "for",
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec",
  "january", "february", "march", "april", "june", "july", "august",
  "september", "october", "november", "december",
];

// UPI handle `<local>@<bank>`, tolerant of a single PDF-injected space after
// `@` (design §6.1). `-` is intentionally excluded from the local part: the bank
// narration format uses `-` as a field delimiter (`...LTD-ZERODHA.PAYU@ AXIS`),
// so allowing it would greedily swallow the preceding `LTD-` field. Dropping it
// keeps the handle precise and lets that field word survive into the signature.
const UPI_HANDLE_PATTERN = "([a-z0-9._]{2,256})@\\s?([a-z]{2,64})";

/**
 * Extracts the first UPI handle from a narration, lowercased, with the single
 * space after `@` collapsed. Returns `undefined` when no handle is present.
 */
export function extractUpiId(narration: string): string | undefined {
  const match = narration.match(new RegExp(UPI_HANDLE_PATTERN, "i"));
  if (!match) return undefined;
  return `${match[1]}@${match[2]}`.toLowerCase();
}

/**
 * Builds a stable, order-independent signature for a narration: strips the UPI
 * handle, numeric/date/IFSC/account tokens, value-date boilerplate, and
 * transport noise, then lowercases, de-duplicates, sorts, and joins the
 * remaining identity-bearing words with single spaces.
 */
export function buildSignature(narration: string): string {
  const withoutHandles = narration.replace(new RegExp(UPI_HANDLE_PATTERN, "gi"), " ");
  const tokens = withoutHandles.toLowerCase().split(/[^a-z0-9]+/);
  const kept = tokens.filter(isIdentityToken);
  return Array.from(new Set(kept)).sort().join(" ");
}

/**
 * Derives the rule key: `upi:<handle>` when a handle exists, otherwise
 * `sig:<hash>` over the signature. Deterministic across devices.
 *
 * Dots are replaced with `_` because the key doubles as the rule entity id
 * (`tagRuleEntity.deriveId`), and fyre-db reserves `.` as its id path
 * separator. UPI handles legitimately contain dots (e.g. `zerodha.payu@axis`),
 * so they are sanitised here. The key is opaque — matching compares the
 * un-sanitised `rule.upiId`/`rule.signature`, never the key — so this is purely
 * an id-safety transform.
 */
export function keyOf(upiId?: string, signature?: string): string {
  const raw = upiId ? `upi:${upiId}` : `sig:${hashSignature(signature ?? "")}`;
  return raw.replace(/\./g, "_");
}

function isIdentityToken(token: string): boolean {
  if (token.length === 0) return false;
  if (hasDigit(token)) return false; // long numbers, dates, IFSC, account ids
  if (BOILERPLATE_WORDS.includes(token)) return false;
  if (DATE_FILLER_WORDS.includes(token)) return false; // spelled-out months + `for`
  if (isNoise(token)) return false;
  return true;
}

function hasDigit(token: string): boolean {
  return /\d/.test(token);
}

function isNoise(token: string): boolean {
  return NOISE_WORDS.some(
    (word) => token.startsWith(word) || (token.length >= 2 && word.startsWith(token)),
  );
}

// FNV-1a (32-bit), rendered base36 — a tiny, dependency-free hash that
// round-trips identically on any device. (tagging-engine-spec.md §3)
function hashSignature(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}
