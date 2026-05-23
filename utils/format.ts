export const money = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

export const number1 = (value: number) =>
  new Intl.NumberFormat("en-AU", {
    maximumFractionDigits: 1
  }).format(Number.isFinite(value) ? value : 0);

export const todayIso = () => new Date().toISOString();

export const addDays = (iso: string, days: number) => {
  const date = new Date(iso);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};
