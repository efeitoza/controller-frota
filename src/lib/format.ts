export const brl = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (v: number | null | undefined, casas = 0) =>
  v === null || v === undefined || Number.isNaN(v)
    ? "—"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      });

export const kml = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "—" : `${num(v, 2)} km/L`;

export const dataBR = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
};

export const hora = (h: string | null | undefined) => (h ? h.slice(0, 5) : "—");

export const hoje = () => new Date().toISOString().slice(0, 10);

export const agoraHora = () => new Date().toTimeString().slice(0, 5);

export const paraNumero = (v: string): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
};

export function periodo(chave: string): { de: string; ate: string } {
  const fim = new Date();
  const inicio = new Date();
  switch (chave) {
    case "hoje":
      break;
    case "7d":
      inicio.setDate(inicio.getDate() - 6);
      break;
    case "mes":
      inicio.setDate(1);
      break;
    case "3m":
      inicio.setMonth(inicio.getMonth() - 3);
      break;
    case "6m":
      inicio.setMonth(inicio.getMonth() - 6);
      break;
    default:
      inicio.setDate(1);
  }
  return { de: inicio.toISOString().slice(0, 10), ate: fim.toISOString().slice(0, 10) };
}

export const mesRotulo = (iso: string) => {
  const [a, m] = iso.slice(0, 7).split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m) - 1]}/${a.slice(2)}`;
};
