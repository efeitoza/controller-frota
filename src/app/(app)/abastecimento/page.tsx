"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AnexoInput } from "@/components/AnexoInput";
import { useSessao } from "@/components/SessaoProvider";
import { Aviso, Campo, Card, Etiqueta, Stat, Vazio, toast } from "@/components/ui";
import {
  enviarArquivo,
  listarAbastecimentos,
  mediaHistorica,
  registrarAbastecimento,
  registrarAnexo,
  ultimoAbastecimento,
} from "@/lib/api";
import { LIMITE_DESVIO, desvioConsumo } from "@/lib/alertas";
import { agoraHora, brl, dataBR, hoje, kml, num, paraNumero } from "@/lib/format";
import { FuelRecord } from "@/lib/types";

export default function Abastecimento() {
  const { sessao, veiculos, veiculoAtual } = useSessao();
  const driverId = sessao?.driver?.id ?? "";

  const [vehicleId, setVehicleId] = useState("");
  const [data, setData] = useState(hoje());
  const [horaCampo, setHoraCampo] = useState(agoraHora());
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");
  const [valor, setValor] = useState("");
  const [posto, setPosto] = useState("");
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [anterior, setAnterior] = useState<FuelRecord | null>(null);
  const [media, setMedia] = useState<number | null>(null);
  const [amostras, setAmostras] = useState(0);
  const [ultimos, setUltimos] = useState<FuelRecord[]>([]);

  useEffect(() => {
    if (!vehicleId && veiculoAtual) setVehicleId(veiculoAtual.id);
  }, [veiculoAtual, vehicleId]);

  const carregarVeiculo = useCallback(async (id: string) => {
    if (!id) return;
    const [ant, mh, lista] = await Promise.all([
      ultimoAbastecimento(id),
      mediaHistorica(id),
      listarAbastecimentos({ vehicleId: id }),
    ]);
    setAnterior(ant);
    setMedia(mh.media);
    setAmostras(mh.amostras);
    setUltimos(lista.slice(0, 5));
  }, []);

  useEffect(() => {
    void carregarVeiculo(vehicleId);
  }, [vehicleId, carregarVeiculo]);

  /* ---------- cálculos automáticos ---------- */
  const calc = useMemo(() => {
    const kmAtual = paraNumero(km);
    const l = paraNumero(litros);
    const v = paraNumero(valor);
    const kmAnterior = anterior?.km ?? null;
    const distancia =
      kmAtual !== null && kmAnterior !== null && kmAtual > kmAnterior ? kmAtual - kmAnterior : null;
    const consumo = distancia !== null && l ? Number((distancia / l).toFixed(2)) : null;
    const precoLitro = v !== null && l ? Number((v / l).toFixed(3)) : null;
    const desvio = desvioConsumo(consumo, media);
    return { kmAtual, l, v, kmAnterior, distancia, consumo, precoLitro, desvio };
  }, [km, litros, valor, anterior, media]);

  const foraDoPadrao = calc.desvio !== null && Math.abs(calc.desvio) > LIMITE_DESVIO;
  const kmInvertido =
    calc.kmAtual !== null && calc.kmAnterior !== null && calc.kmAtual <= calc.kmAnterior;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) return toast("Selecione o veículo.", "erro");
    if (calc.kmAtual === null) return toast("Informe a quilometragem atual.", "erro");
    if (!calc.l) return toast("Informe os litros abastecidos.", "erro");
    if (calc.v === null) return toast("Informe o valor total.", "erro");

    setEnviando(true);
    try {
      let url: string | null = null;
      if (arquivo) url = await enviarArquivo(arquivo, "abastecimento");

      const registro = await registrarAbastecimento({
        driver_id: driverId,
        vehicle_id: vehicleId,
        date: data,
        time: horaCampo,
        km: calc.kmAtual,
        liters: calc.l,
        total_value: calc.v,
        price_per_liter: calc.precoLitro,
        previous_km: calc.kmAnterior,
        distance: calc.distancia,
        consumption: calc.consumo,
        station: posto || null,
        notes: obs || null,
        receipt_url: url,
      });

      if (url && url !== "demo") {
        await registrarAnexo("fuel", registro.id, url, arquivo?.type ?? "image");
      }

      toast("Abastecimento registrado.", "ok");
      setKm("");
      setLitros("");
      setValor("");
      setObs("");
      setArquivo(null);
      await carregarVeiculo(vehicleId);
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <AppHeader titulo="Abastecimento" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        <Card titulo="Novo abastecimento">
          <form onSubmit={enviar} className="space-y-3">
            <Campo label="Veículo">
              <select
                className="campo"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">Selecione</option>
                {veiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.plate}
                  </option>
                ))}
              </select>
            </Campo>

            {anterior && (
              <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-[12.5px] text-brand-900">
                Último registro: <b>{num(anterior.km)} km</b> em {dataBR(anterior.date)} ·{" "}
                {kml(anterior.consumption)}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Data">
                <input
                  type="date"
                  className="campo"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </Campo>
              <Campo label="Hora">
                <input
                  type="time"
                  className="campo"
                  value={horaCampo}
                  onChange={(e) => setHoraCampo(e.target.value)}
                />
              </Campo>
            </div>

            <Campo label="Quilometragem atual">
              <input
                type="number"
                inputMode="decimal"
                className="campo"
                value={km}
                onChange={(e) => setKm(e.target.value)}
                placeholder={anterior ? `maior que ${anterior.km}` : "km do painel"}
                required
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Litros">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="campo"
                  value={litros}
                  onChange={(e) => setLitros(e.target.value)}
                  required
                />
              </Campo>
              <Campo label="Valor total (R$)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  className="campo"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </Campo>
            </div>

            {/* resultado calculado */}
            <div className="grid grid-cols-3 gap-2.5">
              <Stat rotulo="Distância" valor={calc.distancia === null ? "—" : `${num(calc.distancia)} km`} />
              <Stat rotulo="Consumo" valor={kml(calc.consumo)} destaque />
              <Stat rotulo="Preço/L" valor={brl(calc.precoLitro)} />
            </div>

            {kmInvertido && (
              <Aviso nivel="critico" titulo="Quilometragem menor que a anterior">
                O último registro foi {num(calc.kmAnterior)} km. Confira o valor digitado.
              </Aviso>
            )}

            {foraDoPadrao && calc.consumo && (
              <Aviso
                nivel={calc.desvio! < 0 ? "critico" : "atencao"}
                titulo="Consumo fora do padrão"
              >
                Atual {num(calc.consumo, 2)} km/L · média histórica {num(media, 2)} km/L ·{" "}
                {(calc.desvio! * 100).toFixed(0)}% de diferença ({amostras} registros). O
                lançamento não é bloqueado.
              </Aviso>
            )}

            <Campo label="Posto">
              <input
                className="campo"
                value={posto}
                onChange={(e) => setPosto(e.target.value)}
                placeholder="Nome do posto (opcional)"
              />
            </Campo>

            <AnexoInput arquivo={arquivo} onChange={setArquivo} label="Comprovante" />

            <Campo label="Observação">
              <textarea
                className="campo min-h-[60px]"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Opcional"
              />
            </Campo>

            <button className="btn" disabled={enviando}>
              {enviando ? "Salvando..." : "Registrar Abastecimento"}
            </button>
          </form>
        </Card>

        <Card titulo="Últimos abastecimentos">
          {ultimos.length === 0 ? (
            <Vazio texto="Nenhum abastecimento para este veículo." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {ultimos.map((r) => {
                const d = desvioConsumo(r.consumption, media);
                const ruim = d !== null && d < -LIMITE_DESVIO;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium">
                        {dataBR(r.date)} · {num(r.km)} km
                      </p>
                      <p className="truncate text-[12px] text-ink-muted">
                        {num(r.liters, 2)} L · {brl(r.total_value)}
                        {r.station ? ` · ${r.station}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      {!r.receipt_url && <Etiqueta texto="sem nota" cor="ambar" />}
                      <span
                        className={`text-[13.5px] font-semibold ${
                          ruim ? "text-rose-600" : "text-brand-900"
                        }`}
                      >
                        {kml(r.consumption)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
