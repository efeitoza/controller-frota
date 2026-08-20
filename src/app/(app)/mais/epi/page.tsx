"use client";

import { useCallback, useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { AnexoInput } from "@/components/AnexoInput";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Vazio, toast } from "@/components/ui";
import { enviarArquivo, listarEpis, registrarAnexo, registrarEpi } from "@/lib/api";
import { brl, dataBR, hoje, paraNumero, periodo } from "@/lib/format";
import { EpiRecord } from "@/lib/types";

const ITENS = ["Capacete", "Luvas", "Colete", "Capa de chuva", "Botas", "Outro"];

export default function Epi() {
  const { sessao, condutores, ehAdmin } = useSessao();
  const meuId = sessao?.driver?.id ?? "";

  const [driverId, setDriverId] = useState(meuId);
  const [data, setData] = useState(hoje());
  const [item, setItem] = useState(ITENS[0]);
  const [itemOutro, setItemOutro] = useState("");
  const [qtd, setQtd] = useState("1");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [lista, setLista] = useState<EpiRecord[]>([]);

  useEffect(() => {
    if (!driverId && meuId) setDriverId(meuId);
  }, [meuId, driverId]);

  const carregar = useCallback(async () => {
    const { de } = periodo("6m");
    const l = await listarEpis({ de, ate: hoje(), driverId: ehAdmin ? undefined : meuId });
    setLista(l);
  }, [ehAdmin, meuId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const itemFinal = item === "Outro" ? itemOutro.trim() : item;
    const v = paraNumero(valor);
    if (!itemFinal) return toast("Informe o item.", "erro");
    if (v === null) return toast("Informe o valor.", "erro");
    setEnviando(true);
    try {
      let url: string | null = null;
      if (arquivo) url = await enviarArquivo(arquivo, "epi");
      const registro = await registrarEpi({
        driver_id: driverId || meuId,
        date: data,
        item: itemFinal,
        quantity: paraNumero(qtd) ?? 1,
        value: v,
        notes: obs || null,
        receipt_url: url,
      });
      if (url && url !== "demo")
        await registrarAnexo("epi", registro.id, url, arquivo?.type ?? "image");
      toast("EPI registrado.", "ok");
      setValor("");
      setObs("");
      setItemOutro("");
      setArquivo(null);
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <AppHeader titulo="EPI" voltar="/mais" />
      <main className="-mt-3 space-y-3 px-4">
        <Card titulo="Registrar EPI">
          <form onSubmit={enviar} className="space-y-3">
            {ehAdmin && (
              <Campo label="Condutor">
                <select
                  className="campo"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                >
                  {condutores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Campo>
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
              <Campo label="Quantidade">
                <input
                  type="number"
                  min="1"
                  className="campo"
                  value={qtd}
                  onChange={(e) => setQtd(e.target.value)}
                />
              </Campo>
            </div>
            <Campo label="Item">
              <select className="campo" value={item} onChange={(e) => setItem(e.target.value)}>
                {ITENS.map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </Campo>
            {item === "Outro" && (
              <Campo label="Qual?">
                <input
                  className="campo"
                  value={itemOutro}
                  onChange={(e) => setItemOutro(e.target.value)}
                  required
                />
              </Campo>
            )}
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
            <AnexoInput arquivo={arquivo} onChange={setArquivo} />
            <Campo label="Observação">
              <textarea
                className="campo min-h-[60px]"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </Campo>
            <button className="btn" disabled={enviando}>
              {enviando ? "Salvando..." : "Registrar EPI"}
            </button>
          </form>
        </Card>

        <Card titulo="Entregas recentes">
          {lista.length === 0 ? (
            <Vazio texto="Nenhum EPI registrado." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {lista.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-[13.5px] font-medium">
                      {e.item} <span className="text-ink-muted">x{e.quantity}</span>
                    </p>
                    <p className="text-[12px] text-ink-muted">
                      {dataBR(e.date)} ·{" "}
                      {condutores.find((c) => c.id === e.driver_id)?.name ?? "—"}
                    </p>
                  </div>
                  <span className="text-[13.5px] font-semibold">{brl(e.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
