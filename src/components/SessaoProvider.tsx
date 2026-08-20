"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sessao, sessaoAtual, sair as apiSair } from "@/lib/api";
import { temSupabase } from "@/lib/supabase";
import { Driver, Vehicle } from "@/lib/types";
import { listarCondutores, listarVeiculos } from "@/lib/api";

interface Ctx {
  sessao: Sessao | null;
  carregando: boolean;
  veiculos: Vehicle[];
  condutores: Driver[];
  ehAdmin: boolean;
  ehSupervisor: boolean;
  veiculoAtual: Vehicle | null;
  recarregar: () => Promise<void>;
  sair: () => Promise<void>;
  modoDemo: boolean;
}

const SessaoCtx = createContext<Ctx>({
  sessao: null,
  carregando: true,
  veiculos: [],
  condutores: [],
  ehAdmin: false,
  ehSupervisor: false,
  veiculoAtual: null,
  recarregar: async () => {},
  sair: async () => {},
  modoDemo: !temSupabase,
});

export const useSessao = () => useContext(SessaoCtx);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [condutores, setCondutores] = useState<Driver[]>([]);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  const recarregar = useCallback(async () => {
    try {
      const s = await sessaoAtual();
      setSessao(s);
      if (s) {
        const [v, c] = await Promise.all([listarVeiculos(), listarCondutores()]);
        setVeiculos(v);
        setCondutores(c);
      }
    } catch {
      setSessao(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const sair = useCallback(async () => {
    await apiSair();
    setSessao(null);
    router.push("/login");
  }, [router]);

  const valor = useMemo<Ctx>(() => {
    const driver = sessao?.driver ?? null;
    const veiculoAtual =
      veiculos.find((v) => v.id === driver?.primary_vehicle_id) ??
      veiculos.find((v) => v.driver_id === driver?.id) ??
      veiculos[0] ??
      null;
    return {
      sessao,
      carregando,
      veiculos,
      condutores,
      ehAdmin: sessao?.user.role === "admin",
      ehSupervisor: sessao?.user.role === "supervisor",
      veiculoAtual,
      recarregar,
      sair,
      modoDemo: !temSupabase,
    };
  }, [sessao, veiculos, condutores, carregando, recarregar, sair]);

  return <SessaoCtx.Provider value={valor}>{children}</SessaoCtx.Provider>;
}
