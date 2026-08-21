"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Vazio, toast } from "@/components/ui";
import { listarCatalogo, removerCatalogo, salvarCatalogo } from "@/lib/api";
import { CatalogItem, CatalogKind } from "@/lib/types";

const TIPOS: { chave: CatalogKind; texto: string; exemplo: string }[] = [
  { chave: "terminal", texto: "Terminais", exemplo: "TI-PE-15" },
  { chave: "consorciada", texto: "Consorciadas", exemplo: "CDA" },
  { chave: "linha", texto: "Linhas", exemplo: "1966" },
  { chave: "onibus", texto: "Veículos", exemplo: "1386" },
  { chave: "motorista", texto: "Motoristas", exemplo: "1438;João da Silva" },
  { chave: "motivo", texto: "Motivos", exemplo: "Acoplou fora da parada" },
];

export default function Operacao() {
  const { ehAdmin, ehSupervisor } = useSessao();
  const router = useRouter();
  const [tipo, setTipo] = useState<CatalogKind>("linha");
  const [itens, setItens] = useState<CatalogItem[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [lote, setLote] = useState("");
  const [importando, setImportando] = useState(false);

  useEffect(() => {
    if (!ehAdmin && !ehSupervisor) router.replace("/mais");
  }, [ehAdmin, ehSupervisor, router]);

  const carregar = useCallback(async () => {
    setItens(await listarCatalogo(tipo));
  }, [tipo]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo.trim()) return toast("Informe o código.", "erro");
    try {
      await salvarCatalogo([{ kind: tipo, code: codigo, name: nome || null }]);
      setCodigo("");
      setNome("");
      toast("Cadastrado.", "ok");
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    }
  }

  /** Importa uma lista colada, um item por linha: "codigo" ou "codigo;nome". */
  async function importar() {
    const linhas = lote
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!linhas.length) return toast("Cole a lista primeiro.", "erro");
    setImportando(true);
    try {
      const registros = linhas.map((l) => {
        const [code, name] = l.split(/[;,\t]/);
        return { kind: tipo, code: (code ?? "").trim(), name: (name ?? "").trim() || null };
      });
      await salvarCatalogo(registros);
      toast(`${registros.length} itens importados.`, "ok");
      setLote("");
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setImportando(false);
    }
  }

  async function importarArquivo(arquivo: File) {
    const texto = await arquivo.text();
    setLote(texto.trim());
    toast("Arquivo carregado — confira e clique em importar.", "ok");
  }

  const atual = TIPOS.find((t) => t.chave === tipo)!;

  return (
    <>
      <AppHeader titulo="Operação" voltar="/mais" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        <Card titulo="Cadastros usados nas ocorrências">
          <p className="mb-3 text-[13px] text-ink-soft">
            Estes valores viram sugestões no formulário. O supervisor continua podendo digitar um
            código novo — o app aprende e guarda sozinho.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS.map((t) => (
              <button
                key={t.chave}
                onClick={() => setTipo(t.chave)}
                className={`chip ${
                  tipo === t.chave ? "bg-brand-900 text-white" : "bg-slate-100 text-ink-soft"
                }`}
              >
                {t.texto}
              </button>
            ))}
          </div>
        </Card>

        <Card titulo={`Adicionar em ${atual.texto.toLowerCase()}`}>
          <form onSubmit={adicionar} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Código">
                <input
                  className="campo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder={atual.exemplo.split(";")[0]}
                />
              </Campo>
              <Campo label="Nome (opcional)">
                <input
                  className="campo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Descrição"
                />
              </Campo>
            </div>
            <button className="btn">Adicionar</button>
          </form>
        </Card>

        <Card titulo="Importar lista">
          <p className="mb-2 text-[12.5px] text-ink-soft">
            Um por linha, no formato <code>codigo</code> ou <code>codigo;nome</code>. Aceita colar
            de uma planilha ou carregar um arquivo .csv/.txt.
          </p>
          <textarea
            className="campo min-h-[110px] font-mono text-[13px]"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            placeholder={`${atual.exemplo}\n...`}
          />
          <div className="mt-2 flex gap-2">
            <label className="btn-claro btn-sm cursor-pointer">
              Carregar arquivo
              <input
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importarArquivo(f);
                }}
              />
            </label>
            <button className="btn btn-sm" onClick={importar} disabled={importando}>
              {importando ? "Importando..." : "Importar"}
            </button>
          </div>
        </Card>

        <Card titulo={`${atual.texto} cadastrados (${itens.length})`}>
          {itens.length === 0 ? (
            <Vazio texto="Nada cadastrado ainda." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {itens.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{i.code}</p>
                    {i.name && <p className="truncate text-[12px] text-ink-muted">{i.name}</p>}
                  </div>
                  {ehAdmin && (
                    <button
                      className="text-[12.5px] font-semibold text-rose-600"
                      onClick={async () => {
                        await removerCatalogo(i.id);
                        await carregar();
                      }}
                    >
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </>
  );
}
