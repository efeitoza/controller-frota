"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Carregando, Etiqueta, Stat, Vazio } from "@/components/ui";
import { GraficoBarras, GraficoLinha, Ponto } from "@/components/Graficos";
import {
  listarAbastecimentos,
  listarEpis,
  listarJornadas,
  listarManutencoes,
  listarOcorrencias,
} from "@/lib/api";
import { brl, dataBR, hora, hoje, kml, mesRotulo, num, periodo } from "@/lib/format";
import { EpiRecord, FuelRecord, Journey, MaintenanceRecord, Occurrence } from "@/lib/types";

type Tipo = "todos" | "jornada" | "abastecimento" | "manutencao" | "epi" | "ocorrencia";

const PERIODOS = [
  { chave: "hoje", texto: "Hoje" },
  { chave: "7d", texto: "7 dias" },
  { chave: "mes", texto: "Mês atual" },
  { chave: "3m", texto: "3 meses" },
  { chave: "6m", texto: "6 meses" },
  { chave: "custom", texto: "Personalizado" },
];

export default function Relatorios() {
  const { sessao, veiculos, condutores, ehAdmin, ehSupervisor } = useSessao();
  const meuDriverId = sessao?.driver?.id ?? "";
  const veOcorrencias = ehAdmin || ehSupervisor;

  const [chavePeriodo, setChavePeriodo] = useState("mes");
  const [de, setDe] = useState(periodo("mes").de);
  const [ate, setAte] = useState(hoje());
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState(ehAdmin ? "" : meuDriverId);
  const [tipo, setTipo] = useState<Tipo>("todos");
  const [carregando, setCarregando] = useState(true);

  const [fuel, setFuel] = useState<FuelRecord[]>([]);
  const [manut, setManut] = useState<MaintenanceRecord[]>([]);
  const [jornadas, setJornadas] = useState<Journey[]>([]);
  const [epis, setEpis] = useState<EpiRecord[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Occurrence[]>([]);

  useEffect(() => {
    if (chavePeriodo === "custom") return;
    const p = periodo(chavePeriodo);
    setDe(p.de);
    setAte(p.ate);
  }, [chavePeriodo]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const f = {
      de,
      ate,
      vehicleId: vehicleId || undefined,
      driverId: ehAdmin ? driverId || undefined : meuDriverId || undefined,
    };
    const [a, m, j, e, oc] = await Promise.all([
      ehSupervisor ? Promise.resolve([]) : listarAbastecimentos(f),
      ehSupervisor ? Promise.resolve([]) : listarManutencoes(f),
      ehSupervisor ? Promise.resolve([]) : listarJornadas(f),
      ehSupervisor ? Promise.resolve([]) : listarEpis({ de, ate, driverId: f.driverId }),
      veOcorrencias
        ? listarOcorrencias({
            de,
            ate,
            supervisorId: ehAdmin ? undefined : sessao?.user.id,
          })
        : Promise.resolve([]),
    ]);
    setFuel(a);
    setManut(m);
    setJornadas(j);
    setEpis(e);
    setOcorrencias(oc);
    setCarregando(false);
  }, [de, ate, vehicleId, driverId, ehAdmin, ehSupervisor, veOcorrencias, meuDriverId, sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /* ---------------- indicadores ---------------- */
  const ind = useMemo(() => {
    const kmJornada = jornadas.reduce((s, j) => s + (j.km_total ?? 0), 0);
    const kmAbast = fuel.reduce((s, r) => s + (r.distance ?? 0), 0);
    const litros = fuel.reduce((s, r) => s + (r.liters ?? 0), 0);
    const combustivel = fuel.reduce((s, r) => s + (r.total_value ?? 0), 0);
    const manutencao = manut.reduce((s, r) => s + (r.value ?? 0), 0);
    const epi = epis.reduce((s, r) => s + (r.value ?? 0), 0);
    // jornadas e abastecimentos medem a mesma distância por caminhos diferentes;
    // usamos o maior para não subestimar o custo por km.
    const kmRef = Math.max(kmJornada, kmAbast);
    return {
      kmJornada,
      kmAbast,
      kmRef,
      litros,
      combustivel,
      manutencao,
      epi,
      consumoMedio: litros ? kmAbast / litros : null,
      custoKm: kmRef ? (combustivel + manutencao) / kmRef : null,
      total: combustivel + manutencao + epi,
    };
  }, [jornadas, fuel, manut, epis]);

  /* ---------------- séries mensais ---------------- */
  const series = useMemo(() => {
    const meses = new Map<
      string,
      { kmJornada: number; kmFuel: number; litros: number; combustivel: number; manutencao: number }
    >();
    const garante = (iso: string) => {
      const k = iso.slice(0, 7);
      if (!meses.has(k))
        meses.set(k, { kmJornada: 0, kmFuel: 0, litros: 0, combustivel: 0, manutencao: 0 });
      return meses.get(k)!;
    };
    jornadas.forEach((j) => (garante(j.date).kmJornada += j.km_total ?? 0));
    fuel.forEach((r) => {
      const m = garante(r.date);
      m.litros += r.liters ?? 0;
      m.combustivel += r.total_value ?? 0;
      m.kmFuel += r.distance ?? 0;
    });
    manut.forEach((r) => (garante(r.date).manutencao += r.value ?? 0));

    const ordem = [...meses.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    // consumo sempre pela distância entre abastecimentos (tanque cheio a tanque cheio)
    const consumo: Ponto[] = ordem
      .filter(([, v]) => v.litros > 0 && v.kmFuel > 0)
      .map(([k, v]) => ({ rotulo: mesRotulo(k), valor: Number((v.kmFuel / v.litros).toFixed(2)) }));
    const gastoComb: Ponto[] = ordem.map(([k, v]) => ({
      rotulo: mesRotulo(k),
      valor: Number(v.combustivel.toFixed(2)),
    }));
    const gastoManut: Ponto[] = ordem.map(([k, v]) => ({
      rotulo: mesRotulo(k),
      valor: Number(v.manutencao.toFixed(2)),
    }));
    const km: Ponto[] = ordem.map(([k, v]) => ({
      rotulo: mesRotulo(k),
      valor: Math.round(Math.max(v.kmJornada, v.kmFuel)),
    }));
    return { consumo, gastoComb, gastoManut, km };
  }, [jornadas, fuel, manut]);

  const nomeVeiculo = (id: string) => veiculos.find((v) => v.id === id)?.plate ?? "—";
  const nomeCondutor = (id: string) => condutores.find((c) => c.id === id)?.name ?? "—";

  /* ---------------- exportações ---------------- */
  function baixarCSV() {
    const linhas: string[][] = [];
    const cab = [
      "tipo",
      "data",
      "veiculo",
      "condutor",
      "km",
      "km_percorrido",
      "litros",
      "preco_litro",
      "consumo_km_l",
      "descricao",
      "valor",
      "comprovante",
    ];
    if (tipo === "todos" || tipo === "abastecimento")
      fuel.forEach((r) =>
        linhas.push([
          "Abastecimento",
          r.date,
          nomeVeiculo(r.vehicle_id),
          nomeCondutor(r.driver_id),
          String(r.km ?? ""),
          String(r.distance ?? ""),
          String(r.liters ?? ""),
          String(r.price_per_liter ?? ""),
          String(r.consumption ?? ""),
          r.station ?? "",
          String(r.total_value ?? ""),
          r.receipt_url ? "sim" : "não",
        ])
      );
    if (tipo === "todos" || tipo === "manutencao")
      manut.forEach((r) =>
        linhas.push([
          "Manutenção",
          r.date,
          nomeVeiculo(r.vehicle_id),
          nomeCondutor(r.driver_id),
          String(r.km ?? ""),
          "",
          "",
          "",
          "",
          `${r.type}${r.description ? " - " + r.description : ""}`,
          String(r.value ?? ""),
          r.receipt_url ? "sim" : "não",
        ])
      );
    if (tipo === "todos" || tipo === "jornada")
      jornadas.forEach((r) =>
        linhas.push([
          "Jornada",
          r.date,
          nomeVeiculo(r.vehicle_id),
          nomeCondutor(r.driver_id),
          String(r.end_km ?? ""),
          String(r.km_total ?? ""),
          "",
          "",
          "",
          `${r.start_time ?? ""} - ${r.end_time ?? ""}`,
          "",
          "",
        ])
      );
    if (tipo === "todos" || tipo === "epi")
      epis.forEach((r) =>
        linhas.push([
          "EPI",
          r.date,
          "",
          nomeCondutor(r.driver_id),
          "",
          "",
          "",
          "",
          "",
          `${r.item} x${r.quantity}`,
          String(r.value ?? ""),
          r.receipt_url ? "sim" : "não",
        ])
      );

    if (mostra("ocorrencia"))
      ocorrencias.forEach((o) =>
        linhas.push([
          "Ocorrência",
          o.date,
          o.bus_code ?? "",
          o.driver_code ?? "",
          "",
          "",
          "",
          "",
          "",
          `${o.reason}${o.description ? " - " + o.description.replace(/;/g, ",") : ""}`,
          "",
          o.status,
        ])
      );

    const csv =
      "﻿" + [cab, ...linhas].map((l) => l.map((c) => `"${c}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `relatorio_${de}_a_${ate}.csv`;
    a.click();
  }

  const mostra = (t: Tipo) =>
    (tipo === "todos" || tipo === t) &&
    (t === "ocorrencia" ? veOcorrencias : !ehSupervisor);

  return (
    <>
      <AppHeader titulo="Relatórios" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        {/* -------- filtros -------- */}
        <Card titulo="Filtros" className="no-print">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.chave}
                onClick={() => setChavePeriodo(p.chave)}
                className={`chip ${
                  chavePeriodo === p.chave
                    ? "bg-brand-900 text-white"
                    : "bg-slate-100 text-ink-soft"
                }`}
              >
                {p.texto}
              </button>
            ))}
          </div>

          {chavePeriodo === "custom" && (
            <div className="mb-3 grid grid-cols-2 gap-3">
              <Campo label="De">
                <input
                  type="date"
                  className="campo"
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                />
              </Campo>
              <Campo label="Até">
                <input
                  type="date"
                  className="campo"
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </Campo>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {!ehSupervisor && (
            <Campo label="Veículo">
              <select
                className="campo"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Todos</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate}
                  </option>
                ))}
              </select>
            </Campo>
            )}
            {!ehSupervisor && (
            <Campo label="Tipo">
              <select
                className="campo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as Tipo)}
              >
                <option value="todos">Todos</option>
                <option value="jornada">Jornada</option>
                <option value="abastecimento">Abastecimento</option>
                <option value="manutencao">Manutenção</option>
                <option value="epi">EPI</option>
                {veOcorrencias && <option value="ocorrencia">Ocorrência</option>}
              </select>
            </Campo>
            )}
            {ehAdmin && (
              <Campo label="Condutor" className="col-span-2">
                <select
                  className="campo"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                >
                  <option value="">Todos os condutores</option>
                  {condutores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button className="btn-claro btn-sm flex-1" onClick={baixarCSV}>
              Exportar Excel/CSV
            </button>
            <button className="btn-claro btn-sm flex-1" onClick={() => window.print()}>
              Exportar PDF
            </button>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-ink-muted">
            Período: {dataBR(de)} a {dataBR(ate)}
          </p>
        </Card>

        {carregando ? (
          <Carregando />
        ) : (
          <>
            {/* -------- indicadores de ocorrências -------- */}
            {veOcorrencias && (
              <Card titulo="Ocorrências no período">
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat rotulo="Registradas" valor={ocorrencias.length} destaque />
                  <Stat
                    rotulo="Motoristas envolvidos"
                    valor={new Set(ocorrencias.map((o) => o.driver_code).filter(Boolean)).size}
                  />
                  <Stat
                    rotulo="Encaminhadas"
                    valor={ocorrencias.filter((o) => o.status === "encaminhada").length}
                  />
                  <Stat
                    rotulo="Linhas envolvidas"
                    valor={new Set(ocorrencias.map((o) => o.line).filter(Boolean)).size}
                  />
                </div>
              </Card>
            )}

            {/* -------- indicadores -------- */}
            {!ehSupervisor && (
            <Card titulo="Indicadores">
              <div className="grid grid-cols-2 gap-2.5">
                <Stat
                  rotulo="Km rodados"
                  valor={num(ind.kmRef)}
                  sub={ind.kmJornada >= ind.kmAbast ? "por jornadas" : "entre abastecimentos"}
                />
                <Stat rotulo="Litros" valor={num(ind.litros, 2)} />
                <Stat rotulo="Combustível" valor={brl(ind.combustivel)} />
                <Stat rotulo="Consumo médio" valor={kml(ind.consumoMedio)} destaque />
                <Stat rotulo="Custo por km" valor={ind.custoKm ? brl(ind.custoKm) : "—"} />
                <Stat rotulo="Manutenção" valor={brl(ind.manutencao)} />
                <Stat rotulo="EPI" valor={brl(ind.epi)} />
                <Stat rotulo="Custo total" valor={brl(ind.total)} destaque />
              </div>
            </Card>
            )}

            {/* -------- gráficos -------- */}
            {!ehSupervisor && (
            <Card titulo="Evolução">
              <div className="space-y-5">
                <GraficoLinha titulo="Consumo médio por mês" dados={series.consumo} unidade=" km/L" />
                <GraficoBarras
                  titulo="Gasto com combustível"
                  dados={series.gastoComb}
                  formata={(v) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                />
                <GraficoBarras
                  titulo="Gasto com manutenção"
                  dados={series.gastoManut}
                  formata={(v) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
                />
                <GraficoLinha
                  titulo="Quilometragem por mês"
                  dados={series.km}
                  formata={(v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                  unidade=" km"
                />
              </div>
            </Card>
            )}

            {/* -------- ocorrências -------- */}
            {mostra("ocorrencia") && (
              <Card titulo={`Ocorrências (${ocorrencias.length})`}>
                {ocorrencias.length === 0 ? (
                  <Vazio texto="Nenhuma ocorrência no período." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {ocorrencias.map((o) => (
                      <li key={o.id} className="py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium">{o.reason}</p>
                            <p className="text-[12px] text-ink-muted">
                              {dataBR(o.date)} · {hora(o.time)} · {o.terminal ?? "—"} · linha{" "}
                              {o.line ?? "—"}
                            </p>
                            <p className="text-[12px] text-ink-muted">
                              veículo {o.bus_code ?? "—"} · motorista {o.driver_code ?? "—"}
                            </p>
                          </div>
                          <div className="flex flex-none flex-col items-end gap-1">
                            <Etiqueta
                              texto={o.status}
                              cor={o.status === "encaminhada" ? "verde" : "azul"}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* -------- tabela de abastecimento -------- */}
            {mostra("abastecimento") && (
              <Card titulo={`Abastecimentos (${fuel.length})`}>
                {fuel.length === 0 ? (
                  <Vazio texto="Nenhum abastecimento no período." />
                ) : (
                  <div className="-mx-1 overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-[12.5px]">
                      <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-2">Data</th>
                          <th className="py-2 pr-2">Placa</th>
                          {ehAdmin && <th className="py-2 pr-2">Condutor</th>}
                          <th className="py-2 pr-2 text-right">Km</th>
                          <th className="py-2 pr-2 text-right">Percorrido</th>
                          <th className="py-2 pr-2 text-right">Litros</th>
                          <th className="py-2 pr-2 text-right">Valor</th>
                          <th className="py-2 pr-2 text-right">R$/L</th>
                          <th className="py-2 pr-2 text-right">km/L</th>
                          <th className="py-2 pr-1">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {fuel.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 pr-2 whitespace-nowrap">{dataBR(r.date)}</td>
                            <td className="py-2 pr-2 whitespace-nowrap">{nomeVeiculo(r.vehicle_id)}</td>
                            {ehAdmin && (
                              <td className="py-2 pr-2 whitespace-nowrap">
                                {nomeCondutor(r.driver_id)}
                              </td>
                            )}
                            <td className="py-2 pr-2 text-right">{num(r.km)}</td>
                            <td className="py-2 pr-2 text-right">{num(r.distance)}</td>
                            <td className="py-2 pr-2 text-right">{num(r.liters, 2)}</td>
                            <td className="py-2 pr-2 text-right">{brl(r.total_value)}</td>
                            <td className="py-2 pr-2 text-right">{brl(r.price_per_liter)}</td>
                            <td className="py-2 pr-2 text-right font-semibold">
                              {num(r.consumption, 2)}
                            </td>
                            <td className="py-2 pr-1">
                              {r.receipt_url ? (
                                r.receipt_url === "demo" ? (
                                  <Etiqueta texto="ok" cor="verde" />
                                ) : (
                                  <a
                                    href={r.receipt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold text-brand-900"
                                  >
                                    ver
                                  </a>
                                )
                              ) : (
                                <Etiqueta texto="falta" cor="ambar" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* -------- jornadas -------- */}
            {mostra("jornada") && (
              <Card titulo={`Jornadas (${jornadas.length})`}>
                {jornadas.length === 0 ? (
                  <Vazio texto="Nenhuma jornada no período." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {jornadas.map((j) => (
                      <li key={j.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-[13.5px] font-medium">
                            {dataBR(j.date)} · {nomeVeiculo(j.vehicle_id)}
                          </p>
                          <p className="text-[12px] text-ink-muted">
                            {nomeCondutor(j.driver_id)} · {num(j.start_km)} → {num(j.end_km)}
                          </p>
                        </div>
                        <span className="text-[13.5px] font-semibold text-brand-900">
                          {num(j.km_total)} km
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* -------- manutenções -------- */}
            {mostra("manutencao") && (
              <Card titulo={`Manutenções (${manut.length})`}>
                {manut.length === 0 ? (
                  <Vazio texto="Nenhuma manutenção no período." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {manut.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-2.5">
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-medium">{m.type}</p>
                          <p className="truncate text-[12px] text-ink-muted">
                            {dataBR(m.date)} · {nomeVeiculo(m.vehicle_id)} · {num(m.km)} km
                            {ehAdmin && m.driver_id ? ` · ${nomeCondutor(m.driver_id)}` : ""}
                          </p>
                        </div>
                        <span className="text-[13.5px] font-semibold">{brl(m.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* -------- EPI -------- */}
            {mostra("epi") && (
              <Card titulo={`EPI (${epis.length})`}>
                {epis.length === 0 ? (
                  <Vazio texto="Nenhum EPI no período." />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {epis.map((e) => (
                      <li key={e.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-[13.5px] font-medium">
                            {e.item} <span className="text-ink-muted">x{e.quantity}</span>
                          </p>
                          <p className="text-[12px] text-ink-muted">
                            {dataBR(e.date)} · {nomeCondutor(e.driver_id)}
                          </p>
                        </div>
                        <span className="text-[13.5px] font-semibold">{brl(e.value)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
