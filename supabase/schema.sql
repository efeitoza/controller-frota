-- =====================================================================
--  CONTROLLER — Gestão de Condutores e Frota
--  Script completo do banco no Supabase.
--  Cole no SQL Editor do Supabase e clique em RUN.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- users — espelha auth.users e guarda o papel (condutor / administrador)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  name       text not null default '',
  role       text not null default 'driver' check (role in ('driver','admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- drivers — cadastro do condutor
-- ---------------------------------------------------------------------
create table if not exists public.drivers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique references public.users(id) on delete set null,
  name               text not null,
  registration       text,
  phone              text,
  email              text,
  status             text not null default 'ativo' check (status in ('ativo','inativo')),
  primary_vehicle_id uuid,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- vehicles — cadastro do veículo
-- ---------------------------------------------------------------------
create table if not exists public.vehicles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  plate       text not null,
  brand       text,
  model       text,
  year        int,
  type        text not null default 'moto' check (type in ('moto','carro')),
  current_km  numeric(10,1) default 0,
  status      text not null default 'ativo' check (status in ('ativo','manutencao','inativo')),
  driver_id   uuid references public.drivers(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.drivers
  drop constraint if exists drivers_primary_vehicle_fk;
alter table public.drivers
  add constraint drivers_primary_vehicle_fk
  foreign key (primary_vehicle_id) references public.vehicles(id) on delete set null;

-- ---------------------------------------------------------------------
-- journeys — jornada de trabalho
-- ---------------------------------------------------------------------
create table if not exists public.journeys (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  date       date not null default current_date,
  start_time time,
  start_km   numeric(10,1),
  end_time   time,
  end_km     numeric(10,1),
  km_total   numeric(10,1) generated always as (
               case when end_km is not null and start_km is not null
                    then end_km - start_km end
             ) stored,
  notes      text,
  status     text not null default 'andamento' check (status in ('andamento','finalizada')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- fuel_records — abastecimento
-- ---------------------------------------------------------------------
create table if not exists public.fuel_records (
  id              uuid primary key default gen_random_uuid(),
  driver_id       uuid not null references public.drivers(id) on delete cascade,
  vehicle_id      uuid not null references public.vehicles(id) on delete restrict,
  date            date not null default current_date,
  time            time,
  km              numeric(10,1) not null,
  liters          numeric(10,2) not null,
  total_value     numeric(10,2) not null,
  price_per_liter numeric(10,3),
  previous_km     numeric(10,1),
  distance        numeric(10,1),
  consumption     numeric(10,2),
  station         text,
  notes           text,
  receipt_url     text,
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- maintenance_records — manutenção
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_records (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid references public.drivers(id) on delete set null,
  vehicle_id  uuid not null references public.vehicles(id) on delete restrict,
  date        date not null default current_date,
  km          numeric(10,1),
  type        text not null,
  description text,
  value       numeric(10,2) not null default 0,
  supplier    text,
  notes       text,
  receipt_url text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- epi_records — EPI entregue ao condutor
-- ---------------------------------------------------------------------
create table if not exists public.epi_records (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  date        date not null default current_date,
  item        text not null,
  quantity    int not null default 1,
  value       numeric(10,2) not null default 0,
  notes       text,
  receipt_url text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- attachments — comprovantes ligados a cada registro
-- ---------------------------------------------------------------------
create table if not exists public.attachments (
  id          uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('fuel','maintenance','epi','journey')),
  record_id   uuid not null,
  file_url    text not null,
  file_type   text,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
create index if not exists idx_journeys_date    on public.journeys (date desc);
create index if not exists idx_journeys_driver  on public.journeys (driver_id);
create index if not exists idx_fuel_date        on public.fuel_records (date desc);
create index if not exists idx_fuel_vehicle_km  on public.fuel_records (vehicle_id, km desc);
create index if not exists idx_maint_date       on public.maintenance_records (date desc);
create index if not exists idx_epi_date         on public.epi_records (date desc);
create index if not exists idx_attach_record    on public.attachments (record_type, record_id);

-- ---------------------------------------------------------------------
-- Novo usuário no Auth => cria users + drivers automaticamente
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_role text;
begin
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1));
  v_role := coalesce(new.raw_user_meta_data->>'role', 'driver');

  insert into public.users (id, email, name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do nothing;

  if v_role = 'driver' then
    insert into public.drivers (user_id, name, email)
    values (new.id, v_name, new.email)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Funções auxiliares de permissão
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_driver_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.drivers where user_id = auth.uid() limit 1;
$$;

-- ---------------------------------------------------------------------
-- RLS
--   Condutor: enxerga e grava apenas os próprios registros.
--   Administrador: enxerga e edita tudo.
-- ---------------------------------------------------------------------
alter table public.users               enable row level security;
alter table public.drivers             enable row level security;
alter table public.vehicles            enable row level security;
alter table public.journeys            enable row level security;
alter table public.fuel_records        enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.epi_records         enable row level security;
alter table public.attachments         enable row level security;

-- users
drop policy if exists users_select on public.users;
create policy users_select on public.users for select to authenticated
  using (id = auth.uid() or public.is_admin());
drop policy if exists users_update on public.users;
create policy users_update on public.users for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- drivers
drop policy if exists drivers_select on public.drivers;
create policy drivers_select on public.drivers for select to authenticated using (true);
drop policy if exists drivers_write on public.drivers;
create policy drivers_write on public.drivers for all to authenticated
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid());

-- vehicles
drop policy if exists vehicles_select on public.vehicles;
create policy vehicles_select on public.vehicles for select to authenticated using (true);
drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles for update to authenticated
  using (true) with check (true);   -- km é atualizado pelo condutor ao rodar/abastecer
drop policy if exists vehicles_insert on public.vehicles;
create policy vehicles_insert on public.vehicles for insert to authenticated
  with check (public.is_admin());
drop policy if exists vehicles_delete on public.vehicles;
create policy vehicles_delete on public.vehicles for delete to authenticated
  using (public.is_admin());

-- registros do condutor
do $$
declare t text;
begin
  foreach t in array array['journeys','fuel_records','maintenance_records','epi_records']
  loop
    execute format('drop policy if exists %I_select on public.%I;', t, t);
    execute format($f$create policy %I_select on public.%I for select to authenticated
      using (driver_id = public.my_driver_id() or public.is_admin());$f$, t, t);

    execute format('drop policy if exists %I_insert on public.%I;', t, t);
    execute format($f$create policy %I_insert on public.%I for insert to authenticated
      with check (driver_id = public.my_driver_id() or public.is_admin());$f$, t, t);

    execute format('drop policy if exists %I_update on public.%I;', t, t);
    execute format($f$create policy %I_update on public.%I for update to authenticated
      using (driver_id = public.my_driver_id() or public.is_admin())
      with check (driver_id = public.my_driver_id() or public.is_admin());$f$, t, t);

    execute format('drop policy if exists %I_delete on public.%I;', t, t);
    execute format($f$create policy %I_delete on public.%I for delete to authenticated
      using (public.is_admin());$f$, t, t);
  end loop;
end $$;

-- attachments
drop policy if exists attachments_all on public.attachments;
create policy attachments_all on public.attachments for all to authenticated
  using (true) with check (true);

-- ---------------------------------------------------------------------
-- Storage — bucket dos comprovantes
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects for select to authenticated
  using (bucket_id = 'attachments');

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments');

drop policy if exists attachments_update on storage.objects;
create policy attachments_update on storage.objects for update to authenticated
  using (bucket_id = 'attachments');

-- ---------------------------------------------------------------------
-- Dados iniciais (opcional — apague se não quiser)
-- ---------------------------------------------------------------------
insert into public.vehicles (name, plate, brand, model, year, type, current_km)
select '01 Moto', 'ABC-1234', 'Honda', 'Biz 125', 2022, 'moto', 51500
where not exists (select 1 from public.vehicles);

-- =====================================================================
-- DEPOIS DE CRIAR SUA CONTA NO APP, VIRE ADMINISTRADOR ASSIM:
--   update public.users set role = 'admin' where email = 'seu.login@empresa.com.br';
-- =====================================================================
