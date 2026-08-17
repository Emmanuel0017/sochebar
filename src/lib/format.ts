export function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('en-MW', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatMWK(value: number | string): string {
  return `MWK ${formatMoney(value)}`;
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
