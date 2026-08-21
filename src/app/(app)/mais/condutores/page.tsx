"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Etiqueta, Vazio, toast } from "@/components/ui";
import { salvarCondutor } from "@/lib/api";
import { Driver } from "@/lib/types";

export default function Condutores() {
  const { condutores, veiculos, ehAdmin, recarregar } = useSessao();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<Partial<Driver>>({ status: "ativo" });
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!ehAdmin) router.replace("/mais");
  }, [ehAdmin, router]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return toast("Informe o nome.", "erro");
    setEnviando(true);
    try {
      await salvarCondutor(form);
      toast("Condutor salvo.", "ok");
      setForm({ status: "ativo" });
      setNovo(false);
      await recarregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <AppHeader titulo="Condutores" voltar="/mais" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        <Card
          titulo={novo ? "Novo condutor" : `Equipe (${condutores.length})`}
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
              <Campo label="Nome">
                <input
                  className="campo"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Matrícula">
                  <input
                    className="campo"
                    value={form.registration ?? ""}
                    onChange={(e) => setForm({ ...form, registration: e.target.value })}
                  />
                </Campo>
                <Campo label="Telefone">
                  <input
                    className="campo"
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Campo>
              </div>
              <Campo label="E-mail">
                <input
                  type="email"
                  className="campo"
                  value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Campo>
              <Campo label="Veículo principal">
                <select
                  className="campo"
                  value={form.primary_vehicle_id ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, primary_vehicle_id: e.target.value || null })
                  }
                >
                  <option value="">Nenhum</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} · {v.plate}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Status">
                <select
                  className="campo"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Driver["status"] })}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Campo>
              <p className="rounded-xl bg-amber-50 p-3 text-[12.5px] text-amber-900">
                O acesso ao app é criado separadamente: o condutor entra pela tela de login com o
                próprio usuário e senha.
              </p>
              <button className="btn" disabled={enviando}>
                {enviando ? "Salvando..." : "Salvar condutor"}
              </button>
            </form>
          ) : condutores.length === 0 ? (
            <Vazio texto="Nenhum condutor cadastrado." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {condutores.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{c.name}</p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {c.registration ? `mat. ${c.registration} · ` : ""}
                      {c.phone ?? c.email ?? "—"}
                    </p>
                    <p className="truncate text-[12px] text-ink-muted">
                      {veiculos.find((v) => v.id === c.primary_vehicle_id)?.plate ?? "sem veículo"}
                    </p>
                  </div>
                  <Etiqueta
                    texto={c.status}
                    cor={c.status === "ativo" ? "verde" : "slate"}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
