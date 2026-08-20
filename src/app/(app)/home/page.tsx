"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { HomeSupervisao } from "@/components/HomeSupervisao";
import { useSessao } from "@/components/SessaoProvider";
import { Aviso, Card, Carregando, Etiqueta, Stat, Vazio } from "@/components/ui";
import { IconeSeta } from "@/components/icons";
import {
  jornadaAberta,
  listarAbastecimentos,
  listarJornadas,
  listarManutencoes,
  mediaHistorica,
} from "@/lib/api";
import { gerarAlertas } from "@/lib/alertas";
import { brl, dataBR, hora, kml, num, periodo } from "@/lib/format";
import { Alerta, FuelRecord, Journey, MaintenanceRecord } from "@/lib/types";

export default function Home() {
  const { sessao, veiculoAtual, ehAdmin, ehSupervisor } = useSessao();
  const driverId = sessao?.driver?.id ?? "";
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<Journey | null>(null);
  const [fuelMes, setFuelMes] = useState<FuelRecord[]>([]);
  const [fuelVeiculo, setFuelVeiculo] = useState<FuelRecord[]>([]);
  const [manut, setManut] = useState<MaintenanceRecord[]>([]);
  const [jornadas, setJornadas] = useState<Journey[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [media, setMedia] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    if (ehSupervisor) {
      setCarregando(false);
      return;
    }
    if (!veiculoAtual) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const { de, ate } = periodo("mes");
    const filtroPessoal = ehAdmin ? {} : { driverId };
    const [j, fMes, fVeic, m, js, mh] = await Promise.all([
      driverId ? jornadaAberta(driverId) : Promise.resolve(null),
      listarAbastecimentos({ de, ate, vehicleId: veiculoAtual.id, ...filtroPessoal }),
      listarAbastecimentos({ vehicleId: veiculoAtual.id }),
      listarManutencoes({ vehicleId: veiculoAtual.id }),
      listarJornadas({ de, ate, vehicleId: veiculoAtual.id, ...filtroPessoal }),
      mediaHistorica(veiculoAtual.id),
    ]);
    setAberta(j);
    setFuelMes(fMes);
    setFuelVeiculo(fVeic);
    setManut(m);
    setJornadas(js);
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

  const ultimo = fuelVeiculo[0] ?? null;
  const kmMes = jornadas.reduce((s, j) => s + (j.km_total ?? 0), 0);
  const gastoCombustivel = fuelMes.reduce((s, r) => s + (r.total_value ?? 0), 0);
  const litrosMes = fuelMes.reduce((s, r) => s + (r.liters ?? 0), 0);
  const { de: deMes } = periodo("mes");
  const gastoManutencao = manut
    .filter((m) => m.date >= deMes)
    .reduce((s, m) => s + (m.value ?? 0), 0);

  return (
    <>
      <AppHeader />
      <main className="-mt-3 space-y-3 px-4">
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
            {/* -------- Jornada atual -------- */}
            <Card
              titulo="Jornada atual"
              acao={
                <Etiqueta
                  texto={aberta ? "Em andamento" : "Finalizada"}
                  cor={aberta ? "verde" : "slate"}
                />
              }
            >
              {aberta ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat rotulo="Início" valor={hora(aberta.start_time)} sub={dataBR(aberta.date)} />
                  <Stat rotulo="Km inicial" valor={num(aberta.start_km)} />
                </div>
              ) : (
                <p className="text-[13.5px] text-ink-soft">
                  Nenhuma jornada aberta. Registre o início para começar o dia.
                </p>
              )}
              <Link href="/jornada" className="btn mt-3">
                {aberta ? "Finalizar jornada" : "Iniciar jornada"}
                <IconeSeta className="h-4 w-4" />
              </Link>
            </Card>

            {/* -------- Último abastecimento -------- */}
            <Card
              titulo="Último abastecimento"
              acao={
                <Link href="/abastecimento" className="text-[13px] font-semibold text-brand-700">
                  registrar
                </Link>
              }
            >
              {ultimo ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Stat rotulo="Data" valor={dataBR(ultimo.date)} sub={`Km ${num(ultimo.km)}`} />
                    <Stat
                      rotulo="Consumo"
                      valor={kml(ultimo.consumption)}
                      sub={media ? `média ${num(media, 2)}` : undefined}
                      destaque
                    />
                    <Stat rotulo="Litros" valor={`${num(ultimo.liters, 2)} L`} />
                    <Stat
                      rotulo="Valor"
                      valor={brl(ultimo.total_value)}
                      sub={`${brl(ultimo.price_per_liter)}/L`}
                    />
                  </div>
                  {!ultimo.receipt_url && (
                    <p className="mt-2 text-[12px] text-amber-700">Sem comprovante anexado.</p>
                  )}
                </>
              ) : (
                <Vazio texto="Nenhum abastecimento registrado ainda." />
              )}
            </Card>

            {/* -------- Resumo do veículo -------- */}
            <Card titulo={`Resumo do mês · ${veiculoAtual.plate}`}>
              <div className="grid grid-cols-2 gap-2.5">
                <Stat rotulo="Km rodados" valor={num(kmMes)} sub="jornadas do mês" />
                <Stat rotulo="Combustível" valor={brl(gastoCombustivel)} sub={`${num(litrosMes, 2)} L`} />
                <Stat rotulo="Média de consumo" valor={kml(media)} sub="mediana histórica" />
                <Stat rotulo="Manutenção" valor={brl(gastoManutencao)} sub="no mês" />
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-[13px]">
                <span className="text-ink-soft">Hodômetro atual</span>
                <span className="font-semibold">{num(veiculoAtual.current_km)} km</span>
              </div>
            </Card>

            {/* -------- Alertas -------- */}
            <Card titulo="Alertas">
              {alertas.length === 0 ? (
                <Aviso nivel="ok" titulo="Tudo em ordem">
                  Nenhuma pendência para este veículo.
                </Aviso>
              ) : (
                <div className="space-y-2">
                  {alertas.map((a, i) => (
                    <Aviso key={i} nivel={a.nivel} titulo={a.titulo}>
                      {a.detalhe}
                    </Aviso>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}
