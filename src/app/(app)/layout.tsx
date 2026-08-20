"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { useSessao } from "@/components/SessaoProvider";
import { Carregando } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sessao, carregando } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && !sessao) router.replace("/login");
  }, [carregando, sessao, router]);

  if (carregando || !sessao) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Carregando />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-slate-100 pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
