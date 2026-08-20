"use client";

import { demoDB, novoId, salvarDemo } from "./demo";
import { emailDoLogin, supabase, temSupabase } from "./supabase";
import {
  AppUser,
  CatalogItem,
  CatalogKind,
  Driver,
  EpiRecord,
  FuelRecord,
  Journey,
  MaintenanceRecord,
  Occurrence,
  Vehicle,
} from "./types";

export interface Filtros {
  de?: string;
  ate?: string;
  driverId?: string;
  vehicleId?: string;
}

export interface Sessao {
  user: AppUser;
  driver: Driver | null;
}

const dentro = (data: string, f: Filtros) =>
  (!f.de || data >= f.de) && (!f.ate || data <= f.ate);

function erro(e: { message?: string } | null) {
  if (e) throw new Error(e.message || "Erro ao falar com o servidor");
}

/* ------------------------------------------------------------------ */
/* Sessão                                                              */
/* ------------------------------------------------------------------ */

export async function entrar(login: string, senha: string): Promise<Sessao> {
  if (!temSupabase) {
    const db = demoDB();
    const user =
      db.users.find((u) => u.email.split("@")[0] === login.toLowerCase().split("@")[0]) ??
      db.users[0];
    db.sessao = user.id;
    salvarDemo();
    return { user, driver: db.drivers.find((d) => d.user_id === user.id) ?? null };
  }
  const sb = supabase();
  const { error } = await sb.auth.signInWithPassword({
    email: emailDoLogin(login),
    password: senha,
  });
  erro(error);
  const s = await sessaoAtual();
  if (!s) throw new Error("Não foi possível carregar o perfil do usuário.");
  return s;
}

export async function cadastrar(login: string, senha: string, nome: string) {
  if (!temSupabase) return;
  const sb = supabase();
  const { error } = await sb.auth.signUp({
    email: emailDoLogin(login),
    password: senha,
    options: { data: { name: nome, login, role: "driver" } },
  });
  erro(error);
}

export async function sair() {
  if (!temSupabase) {
    const db = demoDB();
    db.sessao = null;
    salvarDemo();
    return;
  }
  await supabase().auth.signOut();
}

export async function sessaoAtual(): Promise<Sessao | null> {
  if (!temSupabase) {
    const db = demoDB();
    if (!db.sessao) return null;
    const user = db.users.find((u) => u.id === db.sessao);
    if (!user) return null;
    return { user, driver: db.drivers.find((d) => d.user_id === user.id) ?? null };
  }
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const authUser = data.session?.user;
  if (!authUser) return null;

  const { data: perfil } = await sb.from("users").select("*").eq("id", authUser.id).maybeSingle();
  const user: AppUser = {
    id: authUser.id,
    email: authUser.email ?? "",
    name: perfil?.name ?? authUser.email?.split("@")[0] ?? "",
    role: (perfil?.role as AppUser["role"]) ?? "driver",
  };
  const { data: driver } = await sb
    .from("drivers")
    .select("*")
    .eq("user_id", authUser.id)
    .maybeSingle();
  return { user, driver: (driver as Driver) ?? null };
}

/* ------------------------------------------------------------------ */
/* Cadastros                                                           */
/* ------------------------------------------------------------------ */

export async function listarVeiculos(): Promise<Vehicle[]> {
  if (!temSupabase) return [...demoDB().vehicles];
  const { data, error } = await supabase().from("vehicles").select("*").order("name");
  erro(error);
  return (data as Vehicle[]) ?? [];
}

export async function salvarVeiculo(v: Partial<Vehicle>): Promise<Vehicle> {
  if (!temSupabase) {
    const db = demoDB();
    if (v.id) {
      const i = db.vehicles.findIndex((x) => x.id === v.id);
      db.vehicles[i] = { ...db.vehicles[i], ...v } as Vehicle;
      salvarDemo();
      return db.vehicles[i];
    }
    const novo = { ...v, id: novoId("v") } as Vehicle;
    db.vehicles.push(novo);
    salvarDemo();
    return novo;
  }
  const { data, error } = await supabase().from("vehicles").upsert(v).select().single();
  erro(error);
  return data as Vehicle;
}

export async function listarCondutores(): Promise<Driver[]> {
  if (!temSupabase) return [...demoDB().drivers];
  const { data, error } = await supabase().from("drivers").select("*").order("name");
  erro(error);
  return (data as Driver[]) ?? [];
}

export async function salvarCondutor(d: Partial<Driver>): Promise<Driver> {
  if (!temSupabase) {
    const db = demoDB();
    if (d.id) {
      const i = db.drivers.findIndex((x) => x.id === d.id);
      db.drivers[i] = { ...db.drivers[i], ...d } as Driver;
      salvarDemo();
      return db.drivers[i];
    }
    const novo = { ...d, id: novoId("d"), user_id: null } as Driver;
    db.drivers.push(novo);
    salvarDemo();
    return novo;
  }
  const { data, error } = await supabase().from("drivers").upsert(d).select().single();
  erro(error);
  return data as Driver;
}

/* ------------------------------------------------------------------ */
/* Jornada                                                             */
/* ------------------------------------------------------------------ */

export async function jornadaAberta(driverId: string): Promise<Journey | null> {
  if (!temSupabase) {
    return (
      demoDB().journeys.find((j) => j.driver_id === driverId && j.status === "andamento") ?? null
    );
  }
  const { data, error } = await supabase()
    .from("journeys")
    .select("*")
    .eq("driver_id", driverId)
    .eq("status", "andamento")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  erro(error);
  return (data as Journey) ?? null;
}

export async function iniciarJornada(j: Partial<Journey>): Promise<Journey> {
  const registro = { ...j, status: "andamento" as const };
  if (!temSupabase) {
    const db = demoDB();
    const novo = { ...registro, id: novoId("j"), km_total: null } as Journey;
    db.journeys.unshift(novo);
    salvarDemo();
    return novo;
  }
  const { data, error } = await supabase().from("journeys").insert(registro).select().single();
  erro(error);
  return data as Journey;
}

export async function finalizarJornada(
  id: string,
  dados: { end_time: string; end_km: number; notes?: string | null }
): Promise<Journey> {
  if (!temSupabase) {
    const db = demoDB();
    const i = db.journeys.findIndex((x) => x.id === id);
    const inicio = db.journeys[i].start_km ?? 0;
    db.journeys[i] = {
      ...db.journeys[i],
      ...dados,
      km_total: dados.end_km - inicio,
      status: "finalizada",
    };
    const v = db.vehicles.find((x) => x.id === db.journeys[i].vehicle_id);
    if (v) v.current_km = dados.end_km;
    salvarDemo();
    return db.journeys[i];
  }
  const sb = supabase();
  const { data, error } = await sb
    .from("journeys")
    .update({ ...dados, status: "finalizada" })
    .eq("id", id)
    .select()
    .single();
  erro(error);
  const j = data as Journey;
  await sb.from("vehicles").update({ current_km: dados.end_km }).eq("id", j.vehicle_id);
  return j;
}

export async function listarJornadas(f: Filtros = {}): Promise<Journey[]> {
  if (!temSupabase) {
    return demoDB()
      .journeys.filter(
        (j) =>
          dentro(j.date, f) &&
          (!f.driverId || j.driver_id === f.driverId) &&
          (!f.vehicleId || j.vehicle_id === f.vehicleId)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  let q = supabase().from("journeys").select("*").order("date", { ascending: false });
  if (f.de) q = q.gte("date", f.de);
  if (f.ate) q = q.lte("date", f.ate);
  if (f.driverId) q = q.eq("driver_id", f.driverId);
  if (f.vehicleId) q = q.eq("vehicle_id", f.vehicleId);
  const { data, error } = await q;
  erro(error);
  return (data as Journey[]) ?? [];
}

/* ------------------------------------------------------------------ */
/* Abastecimento                                                       */
/* ------------------------------------------------------------------ */

export async function ultimoAbastecimento(vehicleId: string): Promise<FuelRecord | null> {
  if (!temSupabase) {
    return (
      demoDB()
        .fuel.filter((r) => r.vehicle_id === vehicleId)
        .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")))[0] ?? null
    );
  }
  const { data, error } = await supabase()
    .from("fuel_records")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("km", { ascending: false })
    .limit(1)
    .maybeSingle();
  erro(error);
  return (data as FuelRecord) ?? null;
}

/** Média histórica de consumo do veículo (ignora valores absurdos). */
export async function mediaHistorica(
  vehicleId: string
): Promise<{ media: number | null; amostras: number }> {
  const registros = await listarAbastecimentos({ vehicleId });
  const valores = registros
    .map((r) => r.consumption)
    .filter((c): c is number => c !== null && c > 0);
  if (valores.length < 2) return { media: null, amostras: valores.length };
  const ordenado = [...valores].sort((a, b) => a - b);
  // mediana é mais estável que a média simples contra registros errados
  const meio = Math.floor(ordenado.length / 2);
  const mediana =
    ordenado.length % 2 ? ordenado[meio] : (ordenado[meio - 1] + ordenado[meio]) / 2;
  return { media: Number(mediana.toFixed(2)), amostras: valores.length };
}

export async function registrarAbastecimento(r: Partial<FuelRecord>): Promise<FuelRecord> {
  if (!temSupabase) {
    const db = demoDB();
    const novo = { ...r, id: novoId("f") } as FuelRecord;
    db.fuel.unshift(novo);
    const v = db.vehicles.find((x) => x.id === novo.vehicle_id);
    if (v && novo.km) v.current_km = novo.km;
    salvarDemo();
    return novo;
  }
  const sb = supabase();
  const { data, error } = await sb.from("fuel_records").insert(r).select().single();
  erro(error);
  const f = data as FuelRecord;
  if (f.km) await sb.from("vehicles").update({ current_km: f.km }).eq("id", f.vehicle_id);
  return f;
}

export async function listarAbastecimentos(f: Filtros = {}): Promise<FuelRecord[]> {
  if (!temSupabase) {
    return demoDB()
      .fuel.filter(
        (r) =>
          dentro(r.date, f) &&
          (!f.driverId || r.driver_id === f.driverId) &&
          (!f.vehicleId || r.vehicle_id === f.vehicleId)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  let q = supabase().from("fuel_records").select("*").order("date", { ascending: false });
  if (f.de) q = q.gte("date", f.de);
  if (f.ate) q = q.lte("date", f.ate);
  if (f.driverId) q = q.eq("driver_id", f.driverId);
  if (f.vehicleId) q = q.eq("vehicle_id", f.vehicleId);
  const { data, error } = await q;
  erro(error);
  return (data as FuelRecord[]) ?? [];
}

/* ------------------------------------------------------------------ */
/* Manutenção                                                          */
/* ------------------------------------------------------------------ */

export async function registrarManutencao(
  r: Partial<MaintenanceRecord>
): Promise<MaintenanceRecord> {
  if (!temSupabase) {
    const db = demoDB();
    const novo = { ...r, id: novoId("m") } as MaintenanceRecord;
    db.maintenance.unshift(novo);
    salvarDemo();
    return novo;
  }
  const { data, error } = await supabase()
    .from("maintenance_records")
    .insert(r)
    .select()
    .single();
  erro(error);
  return data as MaintenanceRecord;
}

export async function listarManutencoes(f: Filtros = {}): Promise<MaintenanceRecord[]> {
  if (!temSupabase) {
    return demoDB()
      .maintenance.filter(
        (r) =>
          dentro(r.date, f) &&
          (!f.driverId || r.driver_id === f.driverId) &&
          (!f.vehicleId || r.vehicle_id === f.vehicleId)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  let q = supabase().from("maintenance_records").select("*").order("date", { ascending: false });
  if (f.de) q = q.gte("date", f.de);
  if (f.ate) q = q.lte("date", f.ate);
  if (f.driverId) q = q.eq("driver_id", f.driverId);
  if (f.vehicleId) q = q.eq("vehicle_id", f.vehicleId);
  const { data, error } = await q;
  erro(error);
  return (data as MaintenanceRecord[]) ?? [];
}

/* ------------------------------------------------------------------ */
/* EPI                                                                 */
/* ------------------------------------------------------------------ */

export async function registrarEpi(r: Partial<EpiRecord>): Promise<EpiRecord> {
  if (!temSupabase) {
    const db = demoDB();
    const novo = { ...r, id: novoId("e") } as EpiRecord;
    db.epi.unshift(novo);
    salvarDemo();
    return novo;
  }
  const { data, error } = await supabase().from("epi_records").insert(r).select().single();
  erro(error);
  return data as EpiRecord;
}

export async function listarEpis(f: Filtros = {}): Promise<EpiRecord[]> {
  if (!temSupabase) {
    return demoDB()
      .epi.filter((r) => dentro(r.date, f) && (!f.driverId || r.driver_id === f.driverId))
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  let q = supabase().from("epi_records").select("*").order("date", { ascending: false });
  if (f.de) q = q.gte("date", f.de);
  if (f.ate) q = q.lte("date", f.ate);
  if (f.driverId) q = q.eq("driver_id", f.driverId);
  const { data, error } = await q;
  erro(error);
  return (data as EpiRecord[]) ?? [];
}

/* ------------------------------------------------------------------ */
/* Ocorrências (perfil Supervisão)                                     */
/* ------------------------------------------------------------------ */

export interface FiltrosOcorrencia extends Filtros {
  supervisorId?: string;
  linha?: string;
  motorista?: string;
  motivo?: string;
}

export async function listarOcorrencias(f: FiltrosOcorrencia = {}): Promise<Occurrence[]> {
  if (!temSupabase) {
    const db = demoDB();
    return db.occurrences
      .filter(
        (o) =>
          dentro(o.date, f) &&
          (!f.supervisorId || o.supervisor_id === f.supervisorId) &&
          (!f.linha || o.line === f.linha) &&
          (!f.motorista || o.driver_code === f.motorista) &&
          (!f.motivo || o.reason === f.motivo)
      )
      .sort((a, b) => (b.date + (b.time ?? "")).localeCompare(a.date + (a.time ?? "")));
  }
  let q = supabase()
    .from("occurrences")
    .select("*")
    .order("date", { ascending: false })
    .order("time", { ascending: false });
  if (f.de) q = q.gte("date", f.de);
  if (f.ate) q = q.lte("date", f.ate);
  if (f.supervisorId) q = q.eq("supervisor_id", f.supervisorId);
  if (f.linha) q = q.eq("line", f.linha);
  if (f.motorista) q = q.eq("driver_code", f.motorista);
  if (f.motivo) q = q.eq("reason", f.motivo);
  const { data, error } = await q;
  erro(error);
  return (data as Occurrence[]) ?? [];
}

export async function registrarOcorrencia(o: Partial<Occurrence>): Promise<Occurrence> {
  if (!temSupabase) {
    const db = demoDB();
    const nova = { ...o, id: novoId("o"), created_at: new Date().toISOString() } as Occurrence;
    db.occurrences.unshift(nova);
    salvarDemo();
    return nova;
  }
  const { data, error } = await supabase().from("occurrences").insert(o).select().single();
  erro(error);
  return data as Occurrence;
}

export async function atualizarStatusOcorrencia(
  id: string,
  status: Occurrence["status"]
): Promise<void> {
  if (!temSupabase) {
    const db = demoDB();
    const i = db.occurrences.findIndex((o) => o.id === id);
    if (i >= 0) db.occurrences[i].status = status;
    salvarDemo();
    return;
  }
  const { error } = await supabase().from("occurrences").update({ status }).eq("id", id);
  erro(error);
}

/** Histórico do motorista — usado para sinalizar reincidência. */
export async function historicoMotorista(
  driverCode: string
): Promise<{ total: number; ultima: Occurrence | null }> {
  if (!driverCode.trim()) return { total: 0, ultima: null };
  if (!temSupabase) {
    const lista = demoDB()
      .occurrences.filter((o) => o.driver_code === driverCode.trim())
      .sort((a, b) => b.date.localeCompare(a.date));
    return { total: lista.length, ultima: lista[0] ?? null };
  }
  const { data, error } = await supabase()
    .from("occurrences")
    .select("*")
    .eq("driver_code", driverCode.trim())
    .order("date", { ascending: false });
  erro(error);
  const lista = (data as Occurrence[]) ?? [];
  return { total: lista.length, ultima: lista[0] ?? null };
}

/** Usuários do sistema — o gestor enxerga todos; os demais, só a si. */
export async function listarUsuarios(): Promise<AppUser[]> {
  if (!temSupabase) return [...demoDB().users];
  const { data, error } = await supabase().from("users").select("*").order("name");
  erro(error);
  return (data as AppUser[]) ?? [];
}

/* --------------------------- catálogo ----------------------------- */

export async function listarCatalogo(kind?: CatalogKind): Promise<CatalogItem[]> {
  if (!temSupabase) {
    const itens = demoDB().catalog.filter((c) => !kind || c.kind === kind);
    return [...itens].sort((a, b) => a.code.localeCompare(b.code, "pt-BR", { numeric: true }));
  }
  let q = supabase().from("operation_catalog").select("*").eq("active", true).order("code");
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  erro(error);
  return (data as CatalogItem[]) ?? [];
}

export async function salvarCatalogo(
  itens: { kind: CatalogKind; code: string; name?: string | null }[]
): Promise<number> {
  const limpos = itens
    .map((i) => ({ ...i, code: i.code.trim(), name: i.name?.trim() || null }))
    .filter((i) => i.code);
  if (!limpos.length) return 0;

  if (!temSupabase) {
    const db = demoDB();
    let novos = 0;
    limpos.forEach((i) => {
      const existe = db.catalog.find((c) => c.kind === i.kind && c.code === i.code);
      if (existe) {
        existe.name = i.name ?? existe.name;
      } else {
        db.catalog.push({
          id: novoId("c"),
          active: true,
          kind: i.kind,
          code: i.code,
          name: i.name ?? null,
        });
        novos++;
      }
    });
    salvarDemo();
    return novos;
  }
  const { error } = await supabase()
    .from("operation_catalog")
    .upsert(limpos, { onConflict: "kind,code" });
  erro(error);
  return limpos.length;
}

export async function removerCatalogo(id: string): Promise<void> {
  if (!temSupabase) {
    const db = demoDB();
    db.catalog = db.catalog.filter((c) => c.id !== id);
    salvarDemo();
    return;
  }
  const { error } = await supabase().from("operation_catalog").delete().eq("id", id);
  erro(error);
}

/* ------------------------------------------------------------------ */
/* Anexos                                                              */
/* ------------------------------------------------------------------ */

export async function enviarArquivo(arquivo: File, pasta: string): Promise<string | null> {
  if (!temSupabase) return "demo";
  const sb = supabase();
  const { data: sessao } = await sb.auth.getSession();
  const uid = sessao.session?.user.id ?? "anon";
  const ext = arquivo.name.split(".").pop() ?? "jpg";
  const caminho = `${pasta}/${uid}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("attachments").upload(caminho, arquivo, {
    cacheControl: "3600",
    upsert: true,
  });
  erro(error);
  const { data } = sb.storage.from("attachments").getPublicUrl(caminho);
  return data.publicUrl;
}

export async function registrarAnexo(
  recordType: "fuel" | "maintenance" | "epi" | "journey",
  recordId: string,
  fileUrl: string,
  fileType: string
) {
  if (!temSupabase) return;
  await supabase().from("attachments").insert({
    record_type: recordType,
    record_id: recordId,
    file_url: fileUrl,
    file_type: fileType,
  });
}
