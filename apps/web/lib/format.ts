/** Client-safe display formatters for quantity and money. */

export function formatKg(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/** 45,000 kg → "45,000 kg"; 1,248,000 → "1,248 t" at the tonne threshold. */
export function formatKgWithUnit(value: number): string {
  if (value >= 1000 && value % 1000 === 0) {
    return `${formatKg(value / 1000)} t`;
  }
  return `${formatKg(value)} kg`;
}

export function formatBirr(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(value);
  return `${formatted} ETB`;
}

/** 54.30 ETB — per-kg card price, always two decimals. */
export function formatPricePerKg(value: number): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ETB`;
}

/** 08 Oct 2026 · 10:02 — the timeline timestamps. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace(',', ' ·');
}

/** 08 Oct 2026 (date only, for compact list rows). */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}