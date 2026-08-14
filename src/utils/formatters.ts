export function formatStars(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return n.toString();
}

export function padIndex(n: number): string {
  return String(n).padStart(2, "0");
}
