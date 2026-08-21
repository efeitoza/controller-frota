"use client";

import Link from "next/link";
import { useSessao } from "./SessaoProvider";
import { IconeMais } from "./icons";

export function AppHeader({ titulo, voltar }: { titulo?: string; voltar?: string }) {
  const { sessao, veiculoAtual, ehAdmin, ehSupervisor } = useSessao();
  const data = new Date().toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });

  return (
    <header className="bg-gradient-to-b from-brand-800 to-brand-700 px-4 pb-5 pt-[calc(env(safe-area-inset-top)+16px)] text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {voltar ? (
            <Link href={voltar} className="mb-1 inline-block text-[13px] text-brand-100">
              ‹ voltar
            </Link>
          ) : (
            <p className="text-[12.5px] text-brand-100">{data}</p>
          )}
          <h1 className="truncate text-[19px] font-semibold leading-tight">
            {titulo ?? sessao?.user.name ?? "Condutor"}
          </h1>
          {!titulo && veiculoAtual && !ehSupervisor && (
            <p className="mt-0.5 truncate text-[13px] text-brand-100">
              {veiculoAtual.name} · {veiculoAtual.plate}
            </p>
          )}
          {!titulo && ehSupervisor && (
            <p className="mt-0.5 truncate text-[13px] text-brand-100">Supervisão de operação</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(ehAdmin || ehSupervisor) && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10.5px] font-semibold">
              {ehAdmin ? "ADMIN" : "SUPERVISÃO"}
            </span>
          )}
          <Link
            href="/mais"
            aria-label="Mais opções"
            className="rounded-full bg-white/15 p-2 transition active:scale-95"
          >
            <IconeMais className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
