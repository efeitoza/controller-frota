import { Alerta, FuelRecord, Journey, MaintenanceRecord, Vehicle } from "./types";

const DIAS_MS = 86_400_000;

/** Limite abaixo do qual o consumo é considerado fora do padrão. */
export const LIMITE_DESVIO = 0.2; // 20%

export function desvioConsumo(atual: number | null, media: number | null) {
  if (!atual || !media) return null;
  return (atual - media) / media; // negativo = pior que a média
}

export function gerarAlertas(params: {
  veiculo: Vehicle | null;
  abastecimentos: FuelRecord[]; // do veículo, mais recentes primeiro
  manutencoes: MaintenanceRecord[];
  jornadas: Journey[];
  mediaHistorica: number | null;
}): Alerta[] {
  const { veiculo, abastecimentos, manutencoes, jornadas, mediaHistorica } = params;
  const lista: Alerta[] = [];

  // 1. consumo fora do padrão no último abastecimento
  const ultimo = abastecimentos[0];
  const desvio = desvioConsumo(ultimo?.consumption ?? null, mediaHistorica);
  if (desvio !== null && desvio < -LIMITE_DESVIO) {
    lista.push({
      nivel: "critico",
      titulo: "Consumo fora do padrão",
      detalhe: `Último abastecimento rendeu ${ultimo.consumption?.toFixed(2)} km/L contra ${mediaHistorica?.toFixed(
        2
      )} km/L da média (${(desvio * 100).toFixed(0)}%).`,
    });
  }

  // 2. abastecimento sem comprovante
  const semNota = abastecimentos.filter((r) => !r.receipt_url).length;
  if (semNota > 0) {
    lista.push({
      nivel: "atencao",
      titulo: `${semNota} abastecimento${semNota > 1 ? "s" : ""} sem comprovante`,
      detalhe: "Anexe a foto da nota para fechar a prestação de contas.",
    });
  }

  // 3. manutenção pendente (troca de óleo por km ou por tempo)
  const oleo = manutencoes
    .filter((m) => m.type.toLowerCase().includes("óleo") || m.type.toLowerCase().includes("oleo"))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const kmAtual = veiculo?.current_km ?? null;
  if (oleo && kmAtual && oleo.km && kmAtual - oleo.km > 3000) {
    lista.push({
      nivel: "atencao",
      titulo: "Troca de óleo pendente",
      detalhe: `Já são ${Math.round(kmAtual - oleo.km).toLocaleString("pt-BR")} km desde a última troca (${
        oleo.date.split("-").reverse().join("/")
      }).`,
    });
  }
  if (!manutencoes.length && kmAtual) {
    lista.push({
      nivel: "atencao",
      titulo: "Nenhuma manutenção registrada",
      detalhe: "Registre as manutenções para acompanhar o custo real do veículo.",
    });
  } else if (oleo && Date.now() - new Date(oleo.date).getTime() > 180 * DIAS_MS) {
    lista.push({
      nivel: "atencao",
      titulo: "Revisão vencida por tempo",
      detalhe: "A última troca de óleo tem mais de 6 meses.",
    });
  }

  // 4. quilometragem inconsistente
  for (let i = 0; i < abastecimentos.length - 1; i++) {
    if (abastecimentos[i].km < abastecimentos[i + 1].km) {
      lista.push({
        nivel: "critico",
        titulo: "Quilometragem inconsistente",
        detalhe: `O abastecimento de ${abastecimentos[i].date
          .split("-")
          .reverse()
          .join("/")} tem km menor que o anterior.`,
      });
      break;
    }
  }
  const jornadaRuim = jornadas.find(
    (j) => j.end_km !== null && j.start_km !== null && j.end_km < j.start_km
  );
  if (jornadaRuim) {
    lista.push({
      nivel: "critico",
      titulo: "Jornada com km invertido",
      detalhe: `Em ${jornadaRuim.date.split("-").reverse().join("/")} o km final é menor que o inicial.`,
    });
  }

  return lista;
}
