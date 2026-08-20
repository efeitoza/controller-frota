"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/components/SessaoProvider";
import { Carregando } from "@/components/ui";

export default function Raiz() {
  const { sessao, carregando } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    router.replace(sessao ? "/home" : "/login");
  }, [sessao, carregando, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Carregando />
    </div>
  );
}
