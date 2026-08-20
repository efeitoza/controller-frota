export type Role = "driver" | "admin";
export type VehicleType = "moto" | "carro";
export type JourneyStatus = "andamento" | "finalizada";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Driver {
  id: string;
  user_id: string | null;
  name: string;
  registration: string | null;
  phone: string | null;
  email: string | null;
  status: "ativo" | "inativo";
  primary_vehicle_id: string | null;
}

export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  type: VehicleType;
  current_km: number | null;
  status: "ativo" | "manutencao" | "inativo";
  driver_id: string | null;
}

export interface Journey {
  id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  start_time: string | null;
  start_km: number | null;
  end_time: string | null;
  end_km: number | null;
  km_total: number | null;
  notes: string | null;
  status: JourneyStatus;
  created_at?: string;
}

export interface FuelRecord {
  id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  time: string | null;
  km: number;
  liters: number;
  total_value: number;
  price_per_liter: number | null;
  previous_km: number | null;
  distance: number | null;
  consumption: number | null;
  station: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at?: string;
}

export interface MaintenanceRecord {
  id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  km: number | null;
  type: string;
  description: string | null;
  value: number;
  supplier: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at?: string;
}

export interface EpiRecord {
  id: string;
  driver_id: string;
  date: string;
  item: string;
  quantity: number;
  value: number;
  notes: string | null;
  receipt_url: string | null;
  created_at?: string;
}

export interface Attachment {
  id: string;
  record_type: "fuel" | "maintenance" | "epi" | "journey";
  record_id: string;
  file_url: string;
  file_type: string | null;
  created_at?: string;
}

export interface Alerta {
  nivel: "atencao" | "critico";
  titulo: string;
  detalhe: string;
}
