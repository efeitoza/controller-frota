"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Atalhos } from "@/components/Atalhos";
import { HomeSupervisao } from "@/components/HomeSupervisao";
import { useSessao } from "@/components/SessaoProvider";
import { Card, Carregando, Vazio } from "@/components/ui";
import {
  jornadaAberta,
  listarAbastecimentos,
  listarJornadas,
  listarManutencoes,
  mediaHistorica,
} from "@/lib/api";
import { gerarAlertas } from "@/lib/alertas";
import { brl, dataBR, kml, num, periodo } from "@/lib/format";
import { Alerta, FuelRecord, Journey } from "@/lib/types";

export default function Home() {
  const { sessao, veiculoAtual, ehAdmin, ehSupervisor } = useSessao();
  const driverId = sessao?.driver?.id ?? "";

  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<Journey | null>(null);
  const [ultimo, setUltimo] = useState<FuelRecord | null>(null);
  const [media, setMedia] = useState<number | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);

  const carregar = useCallback(async () => {
    if (ehSupervisor || !veiculoAtual) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const { de, ate } = periodo("mes");
    const [j, fVeic, m, js, mh] = await Promise.all([
      driverId ? jornadaAberta(driverId) : Promise.resolve(null),
      listarAbastecimentos({ vehicleId: veiculoAtual.id }),
      listarManutencoes({ vehicleId: veiculoAtual.id }),
      listarJornadas({ de, ate, vehicleId: veiculoAtual.id, ...(ehAdmin ? {} : { driverId }) }),
      mediaHistorica(veiculoAtual.id),
    ]);
    setAberta(j);
    setUltimo(fVeic[0] ?? null);
    setMedia(mh.media);
    setAlertas(
      gerarAlertas({
        veiculo: veiculoAtual,
        abastecimentos: fVeic,
        manutencoes: m,
        jornadas: js,
        mediaHistorica: mh.media,
      })
    );
    setCarregando(false);
  }, [veiculoAtual, driverId, ehAdmin, ehSupervisor]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <>
      <AppHeader />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        {ehSupervisor ? (
          <HomeSupervisao />
        ) : carregando ? (
          <Carregando />
        ) : !veiculoAtual ? (
          <Card titulo="Nenhum veículo">
            <Vazio texto="Cadastre um veículo em Mais › Veículos para começar." />
          </Card>
        ) : (
          <>
            <Atalhos
              destaques={{ "/jornada": aberta ? "Em andamento" : "Iniciar" }}
            />

            {/* último abastecimento e alertas, no mesmo cartão */}
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-soft">Último abastecimento</p>
                  <p className="mt-0.5 truncate text-[14px] font-medium">
                    {ultimo
                      ? `${dataBR(ultimo.date)} · ${num(ultimo.km)} km · ${brl(ultimo.total_value)}`
                      : "Nenhum registro ainda"}
                  </p>
                </div>
                <div className="flex-none rounded-xl bg-brand-900 px-3 py-2 text-right text-white">
                  <p className="text-[10.5px] text-brand-200">consumo</p>
                  <p className="text-[15px] font-semibold leading-tight">
                    {kml(ultimo?.consumption ?? null)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[11.5px] text-ink-muted">
                {media ? `Média do veículo ${num(media, 2)} km/L · ` : ""}
                hodômetro {num(veiculoAtual.current_km)} km
              </p>

              <div className="mt-4 flex items-start justify-between gap-3 border-t border-slate-100 pt-4">
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-soft">Alertas</p>
                  {alertas.length === 0 ? (
                    <p className="mt-0.5 text-[14px] font-medium text-emerald-700">Tudo em ordem</p>
                  ) : (
                    <>
                      <p className="mt-0.5 truncate text-[14px] font-medium text-amber-800">
                        {alertas[0].titulo}
                      </p>
                      {alertas.length > 1 && (
                        <p className="text-[11.5px] text-ink-muted">
                          e mais {alertas.length - 1} pendência{alertas.length > 2 ? "s" : ""}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <Link href="/relatorios" className="flex-none text-[13px] font-semibold text-brand-900">
                  ver detalhes
                </Link>
              </div>
            </Card>
          </>
        )}
      </main>
    </>
  );
}
