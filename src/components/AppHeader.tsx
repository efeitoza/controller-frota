"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "./SessaoProvider";
import { IconeMais } from "./icons";
import { moduloDoCaminho } from "@/lib/modulos";

export function AppHeader({ titulo, voltar }: { titulo?: string; voltar?: string }) {
  const { sessao, veiculoAtual, ehAdmin, ehSupervisor } = useSessao();
  const caminho = usePathname();
  const modulo = moduloDoCaminho(caminho);

  const data = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const primeiroNome = (sessao?.user.name ?? "").split(" ")[0] || "Condutor";
  const papel = ehAdmin ? "Gestor" : ehSupervisor ? "Supervisão" : "Condutor";

  return (
    <header className="bg-brand-900 px-5 pb-8 pt-[calc(env(safe-area-inset-top)+12px)] text-white">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-semibold tracking-wide">
          Controller
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] uppercase tracking-wider text-brand-200">{papel}</span>
          <Link
            href="/mais"
            aria-label="Mais opções"
            className="rounded-full bg-white/10 p-2 transition active:scale-95"
          >
            <IconeMais className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </div>

      {modulo ? (
        <>
          {voltar && (
            <Link href={voltar} className="mb-2 inline-block text-[13px] text-brand-200">
              ‹ voltar
            </Link>
          )}
          <div className="flex items-start gap-3.5">
            <span
              className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${modulo.circulo}`}
            >
              <modulo.Icone className="h-6 w-6" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <h1 className="text-[23px] font-semibold leading-tight">
                {titulo ?? modulo.titulo}
              </h1>
              <p className="mt-1 text-[13px] leading-snug text-brand-200">{modulo.frase}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-[24px] font-semibold leading-tight">Olá, {primeiroNome}</h1>
          <p className="mt-1 text-[14px] text-brand-200">
            {ehSupervisor
              ? "Supervisão de operação"
              : veiculoAtual
                ? `${veiculoAtual.name} · ${veiculoAtual.plate}`
                : data}
          </p>
        </>
      )}
    </header>
  );
}
