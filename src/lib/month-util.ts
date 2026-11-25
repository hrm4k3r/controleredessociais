/** Soma `n` meses a uma data aaaa-mm-dd (dia 1 do mês resultante). */
export function toISOAfterMonths(iso: string, n: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}
