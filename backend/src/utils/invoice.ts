/**
 * Generates a reasonably unique, human-readable invoice/reference number.
 * Format: PREFIX-YYYYMMDD-XXXXX (XXXXX = random base36 chars)
 */
export function generateReference(prefix: string): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${datePart}-${randomPart}`;
}
