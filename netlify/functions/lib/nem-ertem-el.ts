/** „24 óra”, „48 óra”, „2 nap” → órákban */
export function parseNemErtemElOrak(szoveg: string | null | undefined): number {
  if (!szoveg?.trim()) return 24;
  const ora = szoveg.match(/(\d+)\s*(óra|ora|h)\b/i);
  if (ora) return Math.max(1, Number(ora[1]));
  const nap = szoveg.match(/(\d+)\s*(nap)\b/i);
  if (nap) return Math.max(1, Number(nap[1])) * 24;
  const szam = szoveg.match(/(\d+)/);
  if (szam) return Math.max(1, Number(szam[1]));
  return 24;
}

export function nemErtemElLejart(nemErtemElAt: string | Date, limitOrak: number): boolean {
  const at = nemErtemElAt instanceof Date ? nemErtemElAt : new Date(nemErtemElAt);
  if (Number.isNaN(at.getTime())) return false;
  const ms = Date.now() - at.getTime();
  return ms >= limitOrak * 60 * 60 * 1000;
}
