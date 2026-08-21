"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AnexoInput } from "@/components/AnexoInput";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Etiqueta, Vazio, toast } from "@/components/ui";
import {
  enviarArquivo,
  listarManutencoes,
  registrarAnexo,
  registrarManutencao,
} from "@/lib/api";
import { brl, dataBR, hoje, num, paraNumero } from "@/lib/format";
import { MaintenanceRecord } from "@/lib/types";

const TIPOS = [
  "Troca de óleo",
  "Pneus",
  "Freios",
  "Farol",
  "Lâmpada",
  "Corrente",
  "Bateria",
  "Revisão",
  "Outro",
];

export default function Manutencao() {
  const { sessao, veiculos, veiculoAtual } = useSessao();
  const driverId = sessao?.driver?.id ?? "";

  const [vehicleId, setVehicleId] = useState("");
  const [data, setData] = useState(hoje());
  const [km, setKm] = useState("");
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [tipoOutro, setTipoOutro] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [oficina, setOficina] = useState("");
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState<MaintenanceRecord[]>([]);

  useEffect(() => {
    if (!vehicleId && veiculoAtual) {
      setVehicleId(veiculoAtual.id);
      setKm(veiculoAtual.current_km ? String(veiculoAtual.current_km) : "");
    }
  }, [veiculoAtual, vehicleId]);

  const carregar = useCallback(async (id: string) => {
    if (!id) return;
    const l = await listarManutencoes({ vehicleId: id });
    setLista(l.slice(0, 8));
  }, []);

  useEffect(() => {
    void carregar(vehicleId);
  }, [vehicleId, carregar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = paraNumero(valor);
    const tipoFinal = tipo === "Outro" ? tipoOutro.trim() : tipo;
    if (!vehicleId) return toast("Selecione o veículo.", "erro");
    if (!tipoFinal) return toast("Descreva o tipo de manutenção.", "erro");
    if (v === null) return toast("Informe o valor.", "erro");

    setEnviando(true);
    try {
      let url: string | null = null;
      if (arquivo) url = await enviarArquivo(arquivo, "manutencao");

      const registro = await registrarManutencao({
        driver_id: driverId,
        vehicle_id: vehicleId,
        date: data,
        km: paraNumero(km),
        type: tipoFinal,
        description: descricao || null,
        value: v,
        supplier: oficina || null,
        notes: obs || null,
        receipt_url: url,
      });
      if (url && url !== "demo") {
        await registrarAnexo("maintenance", registro.id, url, arquivo?.type ?? "image");
      }

      toast("Manutenção registrada.", "ok");
      setDescricao("");
      setValor("");
      setOficina("");
      setObs("");
      setTipoOutro("");
      setArquivo(null);
      await carregar(vehicleId);
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <AppHeader titulo="Manutenção" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        <Card titulo="Nova manutenção">
          <form onSubmit={enviar} className="space-y-3">
            <Campo label="Veículo">
              <select
                className="campo"
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  const v = veiculos.find((x) => x.id === e.target.value);
                  setKm(v?.current_km ? String(v.current_km) : "");
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
              <Campo label="Data">
                <input
                  type="date"
                  className="campo"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </Campo>
              <Campo label="Quilometragem">
                <input
                  type="number"
                  inputMode="decimal"
                  className="campo"
                  value={km}
                  onChange={(e) => setKm(e.target.value)}
                />
              </Campo>
            </div>

            <Campo label="Tipo de manutenção">
              <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Campo>

            {tipo === "Outro" && (
              <Campo label="Qual?">
                <input
                  className="campo"
                  value={tipoOutro}
                  onChange={(e) => setTipoOutro(e.target.value)}
                  placeholder="Descreva o serviço"
                  required
                />
              </Campo>
            )}

            <Campo label="Descrição">
              <input
                className="campo"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: óleo 10W30 + filtro"
              />
            </Campo>

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Valor (R$)">
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
              <Campo label="Oficina">
                <input
                  className="campo"
                  value={oficina}
                  onChange={(e) => setOficina(e.target.value)}
                  placeholder="Fornecedor"
                />
              </Campo>
            </div>

            <AnexoInput arquivo={arquivo} onChange={setArquivo} label="Comprovante" />

            <Campo label="Observações">
              <textarea
                className="campo min-h-[60px]"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Opcional"
              />
            </Campo>

            <button className="btn" disabled={enviando}>
              {enviando ? "Salvando..." : "Registrar Manutenção"}
            </button>
          </form>
        </Card>

        <Card titulo="Histórico do veículo">
          {lista.length === 0 ? (
            <Vazio texto="Nenhuma manutenção registrada." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lista.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium">{m.type}</p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {dataBR(m.date)} · {num(m.km)} km{m.supplier ? ` · ${m.supplier}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    {!m.receipt_url && <Etiqueta texto="sem nota" cor="ambar" />}
                    <span className="text-[13.5px] font-semibold">{brl(m.value)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
