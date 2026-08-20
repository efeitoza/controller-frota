import { Occurrence } from "./types";
import { dataBR, hora } from "./format";

/**
 * Monta o texto da ocorrência no mesmo formato usado hoje no WhatsApp.
 * Os asteriscos deixam os rótulos em negrito no aplicativo.
 */
export function formatarMensagem(o: Partial<Occurrence>): string {
  const titulo = o.terminal ? `OCORRÊNCIA DISCIPLINAR - ${o.terminal}` : "OCORRÊNCIA DISCIPLINAR";
  const linhas = [
    `*${titulo}*`,
    "",
    `*Data:* ${dataBR(o.date)}`,
    `*Local:* ${o.terminal ?? "—"}`,
    `*Horário:* ${hora(o.time)} hs`,
    `*Consorciada:* ${o.consortium ?? "—"}`,
    "",
    `*Linha:* ${o.line ?? "—"}`,
    `*Veículo:* ${o.bus_code ?? "—"}`,
    `*Motorista:* ${o.driver_code ?? "—"}${o.driver_name ? ` - ${o.driver_name}` : ""}`,
    `*Posição:* ${o.position || "_°"}`,
    "",
    `*Motivo:* ${o.reason ?? "—"}`,
    "",
    "*Descrição:*",
    o.description ?? "",
  ];
  return linhas.join("\n").trim();
}

/**
 * Link que abre o WhatsApp com o texto pronto.
 * Sem número definido, o WhatsApp mostra a lista de conversas para
 * escolher o grupo — não existe link que poste direto em um grupo.
 */
export function linkWhatsApp(texto: string, numero?: string | null) {
  const t = encodeURIComponent(texto);
  const n = (numero ?? "").replace(/\D/g, "");
  return n ? `https://wa.me/${n}?text=${t}` : `https://wa.me/?text=${t}`;
}

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Preferência local do número/grupo de destino. */
const CHAVE_ZAP = "controller_whatsapp_destino";

export function lerDestinoWhatsApp(): string {
  try {
    return localStorage.getItem(CHAVE_ZAP) ?? "";
  } catch {
    return "";
  }
}

export function salvarDestinoWhatsApp(valor: string) {
  try {
    localStorage.setItem(CHAVE_ZAP, valor);
  } catch {
    /* ignora */
  }
}
