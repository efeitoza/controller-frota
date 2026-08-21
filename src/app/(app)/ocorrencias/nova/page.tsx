"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { CampoSugerido } from "@/components/CampoSugerido";
import { useSessao } from "@/components/SessaoProvider";
import { Aviso, Campo, Card, Etiqueta, toast } from "@/components/ui";
import { IconeWhatsApp } from "@/components/icons";
import { listarCatalogo, registrarOcorrencia, salvarCatalogo } from "@/lib/api";
import { agoraHora, dataBR, hoje } from "@/lib/format";
import {
  copiar,
  formatarMensagem,
  lerDestinoWhatsApp,
  linkWhatsApp,
} from "@/lib/ocorrencia";
import { CatalogItem, CatalogKind, Occurrence } from "@/lib/types";

export default function NovaOcorrencia() {
  const { sessao } = useSessao();

  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [data, setData] = useState(hoje());
  const [horaCampo, setHoraCampo] = useState(agoraHora());
  const [terminal, setTerminal] = useState("");
  const [consorciada, setConsorciada] = useState("");
  const [linha, setLinha] = useState("");
  const [onibus, setOnibus] = useState("");
  const [motorista, setMotorista] = useState("");
  const [nomeMotorista, setNomeMotorista] = useState("");
  const [posicao, setPosicao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoOutro, setMotivoOutro] = useState("");
  const [descricao, setDescricao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [salva, setSalva] = useState<Occurrence | null>(null);

  useEffect(() => {
    void listarCatalogo().then(setCatalogo);
  }, []);

  const opcoes = useCallback(
    (kind: CatalogKind) => catalogo.filter((c) => c.kind === kind).map((c) => c.code),
    [catalogo]
  );

  const motivoFinal = motivo === "Outro" ? motivoOutro.trim() : motivo;

  const rascunho: Partial<Occurrence> = useMemo(
    () => ({
      date: data,
      time: horaCampo,
      terminal: terminal || null,
      consortium: consorciada || null,
      line: linha || null,
      bus_code: onibus || null,
      driver_code: motorista || null,
      driver_name: nomeMotorista || null,
      position: posicao || null,
      reason: motivoFinal || "—",
      description: descricao || null,
    }),
    [
      data,
      horaCampo,
      terminal,
      consorciada,
      linha,
      onibus,
      motorista,
      nomeMotorista,
      posicao,
      motivoFinal,
      descricao,
    ]
  );

  const mensagem = useMemo(() => formatarMensagem(rascunho), [rascunho]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoFinal) return toast("Informe o motivo.", "erro");
    if (!descricao.trim()) return toast("Descreva a ocorrência.", "erro");
    setEnviando(true);
    try {
      const registro = await registrarOcorrencia({
        ...rascunho,
        supervisor_id: sessao!.user.id,
        reason: motivoFinal,
        status: "registrada",
        message: mensagem,
      });

      // memoriza os códigos digitados para virarem sugestão da próxima vez
      const novos: { kind: CatalogKind; code: string }[] = [];
      const registra = (kind: CatalogKind, valor: string) => {
        if (valor.trim() && !opcoes(kind).includes(valor.trim()))
          novos.push({ kind, code: valor.trim() });
      };
      registra("terminal", terminal);
      registra("consorciada", consorciada);
      registra("linha", linha);
      registra("onibus", onibus);
      registra("motorista", motorista);
      if (motivo === "Outro") registra("motivo", motivoFinal);
      if (novos.length) {
        await salvarCatalogo(novos);
        setCatalogo(await listarCatalogo());
      }

      setSalva(registro);
      toast("Ocorrência registrada.", "ok");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  function novaOcorrencia() {
    setSalva(null);
    setMotivo("");
    setMotivoOutro("");
    setDescricao("");
    setPosicao("");
    setHoraCampo(agoraHora());
  }

  /* ---------------- tela de confirmação ---------------- */
  if (salva) {
    const texto = salva.message ?? mensagem;
    return (
      <>
        <AppHeader titulo="Ocorrência registrada" voltar="/ocorrencias" />
        <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
          <Card>
            <Aviso nivel="ok" titulo="Salva no sistema">
              Registro de {dataBR(salva.date)} guardado. Agora é só encaminhar.
            </Aviso>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[12.5px] leading-relaxed text-ink">
              {texto}
            </pre>
            <a
              href={linkWhatsApp(texto, lerDestinoWhatsApp())}
              target="_blank"
              rel="noreferrer"
              className="btn mt-3 !bg-emerald-600"
            >
              <IconeWhatsApp className="h-4 w-4" /> Enviar no WhatsApp
            </a>
            <button
              className="btn-claro mt-2"
              onClick={async () => {
                const ok = await copiar(texto);
                toast(ok ? "Texto copiado." : "Não foi possível copiar.", ok ? "ok" : "erro");
              }}
            >
              Copiar texto
            </button>
            <div className="mt-2 flex gap-2">
              <button className="btn-claro" onClick={novaOcorrencia}>
                Nova ocorrência
              </button>
              <Link href="/ocorrencias" className="btn-claro">
                Ver lista
              </Link>
            </div>
            <p className="mt-3 text-center text-[11.5px] text-ink-muted">
              O WhatsApp abre com o texto pronto e você escolhe o grupo de destino.
            </p>
          </Card>
        </main>
      </>
    );
  }

  /* ---------------- formulário ---------------- */
  return (
    <>
      <AppHeader titulo="Nova ocorrência" voltar="/ocorrencias" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
        <Card titulo="Dados da ocorrência">
          <form onSubmit={salvar} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Data">
                <input
                  type="date"
                  className="campo"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </Campo>
              <Campo label="Horário">
                <input
                  type="time"
                  className="campo"
                  value={horaCampo}
                  onChange={(e) => setHoraCampo(e.target.value)}
                />
              </Campo>
            </div>

            <CampoSugerido
              label="Local / Terminal"
              valor={terminal}
              onChange={setTerminal}
              opcoes={opcoes("terminal")}
              placeholder="TI-PE-15"
            />
            <CampoSugerido
              label="Consorciada"
              valor={consorciada}
              onChange={setConsorciada}
              opcoes={opcoes("consorciada")}
              placeholder="CDA"
            />

            <div className="grid grid-cols-2 gap-3">
              <CampoSugerido
                label="Linha"
                valor={linha}
                onChange={setLinha}
                opcoes={opcoes("linha")}
                placeholder="1966"
                inputMode="numeric"
              />
              <CampoSugerido
                label="Veículo"
                valor={onibus}
                onChange={setOnibus}
                opcoes={opcoes("onibus")}
                placeholder="1386"
                inputMode="numeric"
              />
              <CampoSugerido
                label="Motorista (matrícula)"
                valor={motorista}
                onChange={setMotorista}
                opcoes={opcoes("motorista")}
                placeholder="1438"
                inputMode="numeric"
              />
              <Campo label="Posição">
                <input
                  className="campo"
                  value={posicao}
                  onChange={(e) => setPosicao(e.target.value)}
                  placeholder="_°"
                />
              </Campo>
            </div>


            <Campo label="Nome do motorista (opcional)">
              <input
                className="campo"
                value={nomeMotorista}
                onChange={(e) => setNomeMotorista(e.target.value)}
                placeholder="Se souber"
              />
            </Campo>

            <Campo label="Motivo">
              <select className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option value="">Selecione</option>
                {opcoes("motivo").map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Campo>

            {motivo === "Outro" && (
              <Campo label="Qual motivo?">
                <input
                  className="campo"
                  value={motivoOutro}
                  onChange={(e) => setMotivoOutro(e.target.value)}
                  required
                />
              </Campo>
            )}

            <Campo label="Descrição">
              <textarea
                className="campo min-h-[130px]"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="O que aconteceu, com os detalhes que o gestor precisa saber."
                required
              />
            </Campo>

            <button className="btn" disabled={enviando}>
              {enviando ? "Salvando..." : "Registrar ocorrência"}
            </button>
          </form>
        </Card>

        <Card
          titulo="Prévia da mensagem"
          acao={<Etiqueta texto="WhatsApp" cor="verde" />}
        >
          <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[12.5px] leading-relaxed text-ink-soft">
            {mensagem}
          </pre>
          <p className="mt-2 text-[11.5px] text-ink-muted">
            O texto é gerado enquanto você preenche. Ao salvar, aparece o botão para enviar.
          </p>
        </Card>
      </main>
    </>
  );
}
