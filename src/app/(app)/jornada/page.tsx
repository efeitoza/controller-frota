"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Carregando, Etiqueta, Stat, Vazio, toast } from "@/components/ui";
import {
  finalizarJornada,
  iniciarJornada,
  jornadaAberta,
  listarJornadas,
} from "@/lib/api";
import { agoraHora, dataBR, hora, hoje, num, paraNumero, periodo } from "@/lib/format";
import { Journey } from "@/lib/types";

export default function JornadaPage() {
  const { sessao, veiculos, veiculoAtual } = useSessao();
  const driverId = sessao?.driver?.id ?? "";

  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<Journey | null>(null);
  const [historico, setHistorico] = useState<Journey[]>([]);
  const [enviando, setEnviando] = useState(false);

  // formulário de início
  const [data, setData] = useState(hoje());
  const [vehicleId, setVehicleId] = useState("");
  const [horaInicial, setHoraInicial] = useState(agoraHora());
  const [kmInicial, setKmInicial] = useState("");
  const [obs, setObs] = useState("");

  // formulário de fim
  const [horaFinal, setHoraFinal] = useState(agoraHora());
  const [kmFinal, setKmFinal] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { de, ate } = periodo("mes");
    const [j, h] = await Promise.all([
      driverId ? jornadaAberta(driverId) : Promise.resolve(null),
      listarJornadas({ de, ate, driverId: driverId || undefined }),
    ]);
    setAberta(j);
    setHistorico(h.filter((x) => x.status === "finalizada").slice(0, 10));
    setCarregando(false);
  }, [driverId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!vehicleId && veiculoAtual) {
      setVehicleId(veiculoAtual.id);
      setKmInicial(veiculoAtual.current_km ? String(veiculoAtual.current_km) : "");
    }
  }, [veiculoAtual, vehicleId]);

  async function iniciar(e: React.FormEvent) {
    e.preventDefault();
    const km = paraNumero(kmInicial);
    if (!vehicleId) return toast("Selecione o veículo.", "erro");
    if (km === null) return toast("Informe a quilometragem inicial.", "erro");
    setEnviando(true);
    try {
      await iniciarJornada({
        driver_id: driverId,
        vehicle_id: vehicleId,
        date: data,
        start_time: horaInicial,
        start_km: km,
        notes: obs || null,
      });
      toast("Jornada iniciada.", "ok");
      setObs("");
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    if (!aberta) return;
    const km = paraNumero(kmFinal);
    if (km === null) return toast("Informe a quilometragem final.", "erro");
    if (aberta.start_km !== null && km < aberta.start_km)
      return toast("Km final não pode ser menor que o inicial.", "erro");
    setEnviando(true);
    try {
      await finalizarJornada(aberta.id, {
        end_time: horaFinal,
        end_km: km,
        notes: obs || aberta.notes,
      });
      toast("Jornada finalizada.", "ok");
      setKmFinal("");
      setObs("");
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  const kmPrevisto =
    aberta && paraNumero(kmFinal) !== null && aberta.start_km !== null
      ? (paraNumero(kmFinal) as number) - aberta.start_km
      : null;

  return (
    <>
      <AppHeader titulo="Jornada" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        {carregando ? (
          <Carregando />
        ) : aberta ? (
          <Card
            titulo="Finalizar jornada"
            acao={<Etiqueta texto="Em andamento" cor="verde" />}
          >
            <div className="mb-3 grid grid-cols-3 gap-2.5">
              <Stat rotulo="Início" valor={hora(aberta.start_time)} />
              <Stat rotulo="Km inicial" valor={num(aberta.start_km)} />
              <Stat
                rotulo="Km rodado"
                valor={kmPrevisto === null ? "—" : num(kmPrevisto)}
                destaque
              />
            </div>
            <form onSubmit={finalizar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Hora final">
                  <input
                    type="time"
                    className="campo"
                    value={horaFinal}
                    onChange={(e) => setHoraFinal(e.target.value)}
                    required
                  />
                </Campo>
                <Campo label="Km final">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="campo"
                    value={kmFinal}
                    onChange={(e) => setKmFinal(e.target.value)}
                    placeholder={String(aberta.start_km ?? "")}
                    required
                  />
                </Campo>
              </div>
              <Campo label="Observações">
                <textarea
                  className="campo min-h-[70px]"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Ocorrências do dia (opcional)"
                />
              </Campo>
              <button className="btn" disabled={enviando}>
                {enviando ? "Salvando..." : "Finalizar jornada"}
              </button>
            </form>
          </Card>
        ) : (
          <Card titulo="Iniciar jornada">
            <form onSubmit={iniciar} className="space-y-3">
              <Campo label="Data">
                <input
                  type="date"
                  className="campo"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </Campo>
              <Campo label="Veículo">
                <select
                  className="campo"
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value);
                    const v = veiculos.find((x) => x.id === e.target.value);
                    setKmInicial(v?.current_km ? String(v.current_km) : "");
                  }}
                >
                  <option value="">Selecione</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.plate}
                    </option>
                  ))}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Hora inicial">
                  <input
                    type="time"
                    className="campo"
                    value={horaInicial}
                    onChange={(e) => setHoraInicial(e.target.value)}
                    required
                  />
                </Campo>
                <Campo label="Km inicial">
                  <input
                    type="number"
                    inputMode="decimal"
                    className="campo"
                    value={kmInicial}
                    onChange={(e) => setKmInicial(e.target.value)}
                    required
                  />
                </Campo>
              </div>
              <Campo label="Observações">
                <textarea
                  className="campo min-h-[70px]"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  placeholder="Opcional"
                />
              </Campo>
              <button className="btn" disabled={enviando}>
                {enviando ? "Salvando..." : "Iniciar jornada"}
              </button>
            </form>
          </Card>
        )}

        <Card titulo="Últimas jornadas">
          {historico.length === 0 ? (
            <Vazio texto="Nenhuma jornada finalizada este mês." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {historico.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-[13.5px] font-medium">{dataBR(j.date)}</p>
                    <p className="text-[12px] text-ink-muted">
                      {hora(j.start_time)} às {hora(j.end_time)} · {num(j.start_km)} →{" "}
                      {num(j.end_km)}
                    </p>
                  </div>
                  <span className="text-[14px] font-semibold text-brand-900">
                    {num(j.km_total)} km
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
