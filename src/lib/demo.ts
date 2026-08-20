"use client";

import {
  Driver,
  EpiRecord,
  FuelRecord,
  Journey,
  MaintenanceRecord,
  Vehicle,
  AppUser,
} from "./types";

/**
 * MODO DEMONSTRAÇÃO
 * Usado quando o app roda sem credenciais do Supabase.
 * Os dados ficam no navegador (localStorage) apenas para você ver as telas
 * funcionando. Ao configurar o Supabase tudo passa a vir do banco real.
 */

export interface DemoDB {
  users: AppUser[];
  drivers: Driver[];
  vehicles: Vehicle[];
  journeys: Journey[];
  fuel: FuelRecord[];
  maintenance: MaintenanceRecord[];
  epi: EpiRecord[];
  sessao: string | null; // user_id
}

const CHAVE = "controller_demo_v1";

const dias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const id = (p: string, n: number) => `${p}-${String(n).padStart(3, "0")}`;

function semente(): DemoDB {
  const vehicles: Vehicle[] = [
    {
      id: "v-001",
      name: "01 Moto Honda Biz",
      plate: "ABC-1234",
      brand: "Honda",
      model: "Biz 125",
      year: 2022,
      type: "moto",
      current_km: 51500,
      status: "ativo",
      driver_id: "d-001",
    },
    {
      id: "v-002",
      name: "02 Fiat Fiorino",
      plate: "XYZ-5678",
      brand: "Fiat",
      model: "Fiorino",
      year: 2020,
      type: "carro",
      current_km: 88200,
      status: "ativo",
      driver_id: "d-002",
    },
  ];

  const drivers: Driver[] = [
    {
      id: "d-001",
      user_id: "u-001",
      name: "Antonio Campos",
      registration: "0142",
      phone: "(81) 99999-0001",
      email: "antonio.campos@empresa.com.br",
      status: "ativo",
      primary_vehicle_id: "v-001",
    },
    {
      id: "d-002",
      user_id: "u-002",
      name: "Marina Souza",
      registration: "0187",
      phone: "(81) 99999-0002",
      email: "marina.souza@empresa.com.br",
      status: "ativo",
      primary_vehicle_id: "v-002",
    },
  ];

  const users: AppUser[] = [
    { id: "u-001", email: "antonio.campos@empresa.com.br", name: "Antonio Campos", role: "driver" },
    { id: "u-002", email: "marina.souza@empresa.com.br", name: "Marina Souza", role: "admin" },
  ];

  // Abastecimentos da moto nos últimos ~5 meses (média ~43 km/L, um fora do padrão)
  const fuel: FuelRecord[] = [];
  let km = 48200;
  const medias = [43.9, 44.6, 42.8, 45.1, 43.2, 17.4, 44.0, 43.5, 42.9, 44.8, 43.6, 45.2];
  medias.forEach((media, i) => {
    const distancia = Math.round(300 + (i % 4) * 40);
    const litros = Number((distancia / media).toFixed(2));
    const anterior = km;
    km += distancia;
    const valor = Number((litros * (6.09 + (i % 3) * 0.12)).toFixed(2));
    fuel.push({
      id: id("f", i + 1),
      driver_id: "d-001",
      vehicle_id: "v-001",
      date: dias(150 - i * 12),
      time: "08:30",
      km,
      liters: litros,
      total_value: valor,
      price_per_liter: Number((valor / litros).toFixed(3)),
      previous_km: anterior,
      distance: distancia,
      consumption: Number((distancia / litros).toFixed(2)),
      station: i % 2 ? "Posto Ipiranga BR-101" : "Posto Shell Centro",
      notes: null,
      receipt_url: i === 5 ? null : "demo",
      created_at: dias(150 - i * 12),
    });
  });

  // hodômetro do veículo acompanha o último abastecimento
  vehicles[0].current_km = km;

  const maintenance: MaintenanceRecord[] = [
    {
      id: "m-001",
      driver_id: "d-001",
      vehicle_id: "v-001",
      date: dias(96),
      km: 49800,
      type: "Troca de óleo",
      description: "Óleo 10W30 + filtro",
      value: 145.2,
      supplier: "Moto Center",
      notes: null,
      receipt_url: "demo",
    },
    {
      id: "m-002",
      driver_id: "d-001",
      vehicle_id: "v-001",
      date: dias(41),
      km: 50900,
      type: "Pneus",
      description: "Pneu traseiro",
      value: 320.0,
      supplier: "Pneus Recife",
      notes: null,
      receipt_url: "demo",
    },
    {
      id: "m-003",
      driver_id: "d-001",
      vehicle_id: "v-001",
      date: dias(9),
      km: 51380,
      type: "Corrente",
      description: "Kit relação",
      value: 210.5,
      supplier: "Moto Center",
      notes: null,
      receipt_url: null,
    },
  ];

  const journeys: Journey[] = [];
  for (let i = 8; i >= 1; i--) {
    const inicio = km - i * 95;
    journeys.push({
      id: id("j", i),
      driver_id: "d-001",
      vehicle_id: "v-001",
      date: dias(i),
      start_time: "08:00",
      start_km: inicio,
      end_time: "17:40",
      end_km: inicio + 90 + (i % 3) * 7,
      km_total: 90 + (i % 3) * 7,
      notes: null,
      status: "finalizada",
    });
  }

  const epi: EpiRecord[] = [
    {
      id: "e-001",
      driver_id: "d-001",
      date: dias(60),
      item: "Capacete",
      quantity: 1,
      value: 380.0,
      notes: null,
      receipt_url: "demo",
    },
    {
      id: "e-002",
      driver_id: "d-001",
      date: dias(30),
      item: "Luvas",
      quantity: 2,
      value: 96.0,
      notes: null,
      receipt_url: null,
    },
  ];

  return { users, drivers, vehicles, journeys, fuel, maintenance, epi, sessao: null };
}

let cache: DemoDB | null = null;

export function demoDB(): DemoDB {
  if (cache) return cache;
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      cache = JSON.parse(bruto) as DemoDB;
      return cache;
    }
  } catch {
    /* storage indisponível — segue em memória */
  }
  cache = semente();
  salvarDemo();
  return cache;
}

export function salvarDemo() {
  try {
    if (cache) localStorage.setItem(CHAVE, JSON.stringify(cache));
  } catch {
    /* ignora */
  }
}

export function resetarDemo() {
  cache = semente();
  salvarDemo();
}

export const novoId = (prefixo: string) =>
  `${prefixo}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
