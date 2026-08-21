"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Etiqueta, Stat, Vazio, toast } from "@/components/ui";
import { listarAbastecimentos, listarManutencoes, salvarVeiculo } from "@/lib/api";
import { brl, dataBR, kml, num, paraNumero } from "@/lib/format";
import { Vehicle } from "@/lib/types";

interface Historico {
  km: number | null;
  gastoComb: number;
  gastoManut: number;
  consumo: number | null;
  ultima: string | null;
}

export default function Veiculos() {
  const { veiculos, condutores, ehAdmin, recarregar } = useSessao();
  const [aberto, setAberto] = useState<string | null>(null);
  const [novo, setNovo] = useState(false);
  const [hist, setHist] = useState<Record<string, Historico>>({});
  const [form, setForm] = useState<Partial<Vehicle>>({ type: "moto", status: "ativo" });
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    (async () => {
      const resultado: Record<string, Historico> = {};
      for (const v of veiculos) {
        const [f, m] = await Promise.all([
          listarAbastecimentos({ vehicleId: v.id }),
          listarManutencoes({ vehicleId: v.id }),
        ]);
        const litros = f.reduce((s, r) => s + (r.liters ?? 0), 0);
        const dist = f.reduce((s, r) => s + (r.distance ?? 0), 0);
        resultado[v.id] = {
          km: v.current_km,
          gastoComb: f.reduce((s, r) => s + (r.total_value ?? 0), 0),
          gastoManut: m.reduce((s, r) => s + (r.value ?? 0), 0),
          consumo: litros ? dist / litros : null,
          ultima: m[0]?.date ?? null,
        };
      }
      setHist(resultado);
    })();
  }, [veiculos]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.plate) return toast("Informe nome e placa.", "erro");
    setEnviando(true);
    try {
      await salvarVeiculo({
        ...form,
        year: paraNumero(String(form.year ?? "")) ?? null,
        current_km: paraNumero(String(form.current_km ?? "")) ?? 0,
      });
      toast("Veículo salvo.", "ok");
      setNovo(false);
      setForm({ type: "moto", status: "ativo" });
      await recarregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <AppHeader titulo="Veículos" voltar="/mais" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        {ehAdmin && (
          <Card
            titulo={novo ? "Novo veículo" : "Frota"}
            acao={
              <button
                className="text-[13px] font-semibold text-brand-900"
                onClick={() => setNovo((v) => !v)}
              >
                {novo ? "cancelar" : "+ adicionar"}
              </button>
            }
          >
            {novo ? (
              <form onSubmit={salvar} className="space-y-3">
                <Campo label="Identificação">
                  <input
                    className="campo"
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="01 Moto Honda Biz"
                    required
                  />
                </Campo>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Placa">
                    <input
                      className="campo uppercase"
                      value={form.plate ?? ""}
                      onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                      required
                    />
                  </Campo>
                  <Campo label="Tipo">
                    <select
                      className="campo"
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: e.target.value as Vehicle["type"] })
                      }
                    >
                      <option value="moto">Moto</option>
                      <option value="carro">Carro</option>
                    </select>
                  </Campo>
                  <Campo label="Marca">
                    <input
                      className="campo"
                      value={form.brand ?? ""}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    />
                  </Campo>
                  <Campo label="Modelo">
                    <input
                      className="campo"
                      value={form.model ?? ""}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                    />
                  </Campo>
                  <Campo label="Ano">
                    <input
                      type="number"
                      className="campo"
                      value={form.year ?? ""}
                      onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    />
                  </Campo>
                  <Campo label="Km atual">
                    <input
                      type="number"
                      className="campo"
                      value={form.current_km ?? ""}
                      onChange={(e) => setForm({ ...form, current_km: Number(e.target.value) })}
                    />
                  </Campo>
                </div>
                <Campo label="Condutor responsável">
                  <select
                    className="campo"
                    value={form.driver_id ?? ""}
                    onChange={(e) => setForm({ ...form, driver_id: e.target.value || null })}
                  >
                    <option value="">Sem responsável</option>
                    {condutores.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Campo>
                <button className="btn" disabled={enviando}>
                  {enviando ? "Salvando..." : "Salvar veículo"}
                </button>
              </form>
            ) : (
              <p className="text-[13px] text-ink-soft">
                {veiculos.length} veículo{veiculos.length === 1 ? "" : "s"} cadastrado
                {veiculos.length === 1 ? "" : "s"}.
              </p>
            )}
          </Card>
        )}

        {veiculos.length === 0 ? (
          <Card>
            <Vazio texto="Nenhum veículo cadastrado." />
          </Card>
        ) : (
          veiculos.map((v) => {
            const h = hist[v.id];
            const expandido = aberto === v.id;
            return (
              <Card
                key={v.id}
                titulo={
                  <div>
                    <p className="text-[15px] font-semibold">{v.name}</p>
                    <p className="text-[12px] text-ink-muted">
                      {v.plate} · {v.brand ?? ""} {v.model ?? ""} {v.year ?? ""}
                    </p>
                  </div>
                }
                acao={
                  <Etiqueta
                    texto={v.status === "ativo" ? "ativo" : v.status}
                    cor={v.status === "ativo" ? "verde" : "ambar"}
                  />
                }
              >
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat rotulo="Hodômetro" valor={`${num(v.current_km)} km`} />
                  <Stat rotulo="Consumo médio" valor={kml(h?.consumo ?? null)} />
                </div>
                <button
                  className="mt-3 w-full text-[13px] font-semibold text-brand-900"
                  onClick={() => setAberto(expandido ? null : v.id)}
                >
                  {expandido ? "ocultar histórico" : "ver histórico"}
                </button>
                {expandido && h && (
                  <div className="mt-2 space-y-1.5 rounded-xl bg-slate-50 p-3 text-[13px]">
                    <p className="flex justify-between">
                      <span className="text-ink-soft">Combustível (total)</span>
                      <b>{brl(h.gastoComb)}</b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-ink-soft">Manutenção (total)</span>
                      <b>{brl(h.gastoManut)}</b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-ink-soft">Última manutenção</span>
                      <b>{h.ultima ? dataBR(h.ultima) : "—"}</b>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-ink-soft">Responsável</span>
                      <b>{condutores.find((c) => c.id === v.driver_id)?.name ?? "—"}</b>
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </main>
    </>
  );
}
