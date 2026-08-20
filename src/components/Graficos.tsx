"use client";

import { useState } from "react";

export interface Ponto {
  rotulo: string;
  valor: number;
}

const COR = "#254deb"; // hue única (série única — sem legenda)
const GRADE = "#e2e8f0";
const TEXTO = "#94a3b8";

const L = 38; // margem esquerda
const R = 20; // espaço para o último rótulo não ser cortado
const T = 12;
const B = 22;
const W = 320;
const H = 150;

function escalas(dados: Ponto[]) {
  const max = Math.max(...dados.map((d) => d.valor), 0);
  const teto = max === 0 ? 1 : max * 1.15;
  const y = (v: number) => H - B - (v / teto) * (H - T - B);
  return { teto, y };
}

function eixoY(teto: number, formata: (v: number) => string) {
  const passos = [0, teto / 2, teto];
  return passos.map((v, i) => ({ v, texto: formata(v), key: i }));
}

/* -------------------------------------------------------------- */
export function GraficoBarras({
  titulo,
  dados,
  formata = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 }),
  unidade = "",
}: {
  titulo: string;
  dados: Ponto[];
  formata?: (v: number) => string;
  unidade?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  if (!dados.length) return <p className="py-6 text-center text-[13px] text-ink-muted">{titulo}: sem dados</p>;

  const { teto, y } = escalas(dados);
  const faixa = (W - L - R) / dados.length;
  const largura = Math.max(8, faixa - 6); // 2px+ de respiro entre barras
  const destaque = ativo ?? dados.length - 1;

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink">{titulo}</span>
        <span className="text-[12px] text-ink-soft">
          {dados[destaque].rotulo}: <b className="text-ink">{formata(dados[destaque].valor)}</b>
          {unidade}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={titulo}>
        {eixoY(teto, formata).map(({ v, texto, key }) => (
          <g key={key}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={GRADE} strokeWidth={1} />
            <text x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize={9} fill={TEXTO}>
              {texto}
            </text>
          </g>
        ))}
        {dados.map((d, i) => {
          const x = L + i * faixa + (faixa - largura) / 2;
          const altura = Math.max(2, H - B - y(d.valor));
          const selecionado = i === destaque;
          return (
            <g
              key={d.rotulo + i}
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              onClick={() => setAtivo(i)}
            >
              <rect x={L + i * faixa} y={T} width={faixa} height={H - T - B} fill="transparent" />
              <rect
                x={x}
                y={y(d.valor)}
                width={largura}
                height={altura}
                rx={4}
                fill={COR}
                opacity={selecionado ? 1 : 0.62}
              />
              {(dados.length <= 8 || i % 2 === 0 || selecionado) && (
                <text
                  x={x + largura / 2}
                  y={H - B + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill={selecionado ? "#475569" : TEXTO}
                >
                  {d.rotulo}
                </text>
              )}
            </g>
          );
        })}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    </figure>
  );
}

/* -------------------------------------------------------------- */
export function GraficoLinha({
  titulo,
  dados,
  formata = (v) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }),
  unidade = "",
}: {
  titulo: string;
  dados: Ponto[];
  formata?: (v: number) => string;
  unidade?: string;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  if (!dados.length) return <p className="py-6 text-center text-[13px] text-ink-muted">{titulo}: sem dados</p>;

  const { teto, y } = escalas(dados);
  const passo = dados.length > 1 ? (W - L - R) / (dados.length - 1) : 0;
  const x = (i: number) => L + i * passo + (dados.length === 1 ? (W - L - R) / 2 : 0);
  const destaque = ativo ?? dados.length - 1;
  const caminho = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.valor)}`).join(" ");

  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold text-ink">{titulo}</span>
        <span className="text-[12px] text-ink-soft">
          {dados[destaque].rotulo}: <b className="text-ink">{formata(dados[destaque].valor)}</b>
          {unidade}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={titulo}>
        {eixoY(teto, formata).map(({ v, texto, key }) => (
          <g key={key}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={GRADE} strokeWidth={1} />
            <text x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize={9} fill={TEXTO}>
              {texto}
            </text>
          </g>
        ))}
        <path d={caminho} fill="none" stroke={COR} strokeWidth={2} strokeLinejoin="round" />
        {dados.map((d, i) => (
          <g
            key={d.rotulo + i}
            onMouseEnter={() => setAtivo(i)}
            onMouseLeave={() => setAtivo(null)}
            onClick={() => setAtivo(i)}
          >
            <rect
              x={x(i) - passo / 2}
              y={T}
              width={Math.max(passo, 16)}
              height={H - T - B}
              fill="transparent"
            />
            {i === destaque && (
              <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="#cbd5e1" strokeWidth={1} />
            )}
            <circle
              cx={x(i)}
              cy={y(d.valor)}
              r={i === destaque ? 5 : 3.4}
              fill={COR}
              stroke="#fff"
              strokeWidth={2}
            />
            {(i === 0 || i === dados.length - 1 || i === destaque) && (
              <text
                x={x(i)}
                y={H - B + 12}
                textAnchor={i === 0 ? "start" : i === dados.length - 1 ? "end" : "middle"}
                fontSize={9}
                fill={TEXTO}
              >
                {d.rotulo}
              </text>
            )}
          </g>
        ))}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    </figure>
  );
}
