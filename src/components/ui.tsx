"use client";

import { ReactNode } from "react";

/* ---------------- Toast ---------------- */
export function toast(mensagem: string, tipo: "ok" | "erro" | "info" = "info") {
  if (typeof document === "undefined") return;
  const cores = {
    ok: "bg-emerald-600",
    erro: "bg-rose-600",
    info: "bg-slate-900",
  } as const;
  const el = document.createElement("div");
  el.className = `fixed left-1/2 bottom-24 z-[90] -translate-x-1/2 rounded-full px-5 py-3 text-[13.5px]
    font-semibold text-white shadow-lg transition-opacity duration-200 max-w-[88%] text-center ${cores[tipo]}`;
  el.textContent = mensagem;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

/* ---------------- Blocos ---------------- */
export function Card({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(titulo || acao) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {typeof titulo === "string" ? (
            <h2 className="text-[15px] font-semibold text-ink">{titulo}</h2>
          ) : (
            titulo
          )}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function Campo({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="rotulo">{label}</span>
      {children}
    </label>
  );
}

export function Stat({
  rotulo,
  valor,
  sub,
  destaque = false,
}: {
  rotulo: string;
  valor: ReactNode;
  sub?: ReactNode;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        destaque ? "bg-brand-700 text-white" : "bg-slate-50 text-ink"
      }`}
    >
      <div className={`text-[11.5px] ${destaque ? "text-brand-100" : "text-ink-soft"}`}>
        {rotulo}
      </div>
      <div className="mt-0.5 text-[19px] font-semibold leading-tight">{valor}</div>
      {sub && (
        <div className={`text-[11.5px] ${destaque ? "text-brand-100" : "text-ink-muted"}`}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Aviso({
  nivel = "atencao",
  titulo,
  children,
}: {
  nivel?: "atencao" | "critico" | "ok";
  titulo: string;
  children?: ReactNode;
}) {
  const estilo = {
    atencao: "border-amber-200 bg-amber-50 text-amber-900",
    critico: "border-rose-200 bg-rose-50 text-rose-900",
    ok: "border-emerald-200 bg-emerald-50 text-emerald-900",
  }[nivel];
  const icone = { atencao: "!", critico: "!", ok: "✓" }[nivel];
  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${estilo}`}>
      <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/70 text-[12px] font-bold">
        {icone}
      </span>
      <div className="text-[13px] leading-snug">
        <div className="font-semibold">{titulo}</div>
        {children && <div className="opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function Vazio({ texto }: { texto: string }) {
  return <p className="py-8 text-center text-[13.5px] text-ink-muted">{texto}</p>;
}

export function Carregando() {
  return (
    <div className="flex justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
    </div>
  );
}

export function Etiqueta({
  texto,
  cor = "slate",
}: {
  texto: string;
  cor?: "slate" | "verde" | "azul" | "ambar" | "rosa";
}) {
  const cores = {
    slate: "bg-slate-100 text-ink-soft",
    verde: "bg-emerald-100 text-emerald-800",
    azul: "bg-brand-100 text-brand-800",
    ambar: "bg-amber-100 text-amber-800",
    rosa: "bg-rose-100 text-rose-800",
  }[cor];
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${cores}`}>{texto}</span>
  );
}
