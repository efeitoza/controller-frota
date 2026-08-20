-- =====================================================================
--  CONTROLLER — Módulo de OCORRÊNCIAS (perfil Supervisão)
--  Rode este script DEPOIS do schema.sql, no SQL Editor do Supabase.
--  É aditivo: não altera nem apaga nada do que já existe.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Novo papel: supervisor
-- ---------------------------------------------------------------------
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check check (role in ('driver','admin','supervisor'));

create or replace function public.is_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'supervisor');
$$;

-- ---------------------------------------------------------------------
-- 2) Catálogo da operação
--    Uma tabela só para linhas, terminais, consorciadas, ônibus,
--    motoristas e motivos. Permite cadastrar, importar em lote e
--    continuar digitando à mão no formulário.
-- ---------------------------------------------------------------------
create table if not exists public.operation_catalog (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('linha','terminal','consorciada','onibus','motorista','motivo')),
  code       text not null,           -- 1966, TI-PE-15, CDA, 1386, 1438
  name       text,                    -- descrição opcional
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, code)
);

create index if not exists idx_catalog_kind on public.operation_catalog (kind, code);

-- ---------------------------------------------------------------------
-- 3) Ocorrências disciplinares
--    Os códigos ficam como texto: o supervisor pode digitar um valor
--    que ainda não está cadastrado sem ser bloqueado.
-- ---------------------------------------------------------------------
create table if not exists public.occurrences (
  id            uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null default auth.uid() references public.users(id) on delete restrict,
  date          date not null default current_date,
  time          time,
  terminal      text,                 -- TI-PE-15
  consortium    text,                 -- CDA
  line          text,                 -- 1966
  bus_code      text,                 -- 1386
  driver_code   text,                 -- 1438
  driver_name   text,
  position      text,                 -- 1°, 2°, _°
  reason        text not null,        -- Acoplou fora da parada
  description   text,
  recurrent     boolean not null default false,
  status        text not null default 'registrada'
                check (status in ('registrada','encaminhada','arquivada')),
  message       text,                 -- texto gerado para o WhatsApp
  created_at    timestamptz not null default now()
);

create index if not exists idx_occ_date       on public.occurrences (date desc);
create index if not exists idx_occ_supervisor on public.occurrences (supervisor_id);
create index if not exists idx_occ_driver     on public.occurrences (driver_code);
create index if not exists idx_occ_line       on public.occurrences (line);

-- ---------------------------------------------------------------------
-- 4) RLS
--    Supervisor: enxerga e edita apenas as ocorrências que registrou.
--    Gestor (admin): enxerga todas.
--    Condutor: não enxerga nada — o módulo nem aparece para ele.
-- ---------------------------------------------------------------------
alter table public.occurrences       enable row level security;
alter table public.operation_catalog enable row level security;

drop policy if exists occ_select on public.occurrences;
create policy occ_select on public.occurrences for select to authenticated
  using (supervisor_id = auth.uid() or public.is_admin());

drop policy if exists occ_insert on public.occurrences;
create policy occ_insert on public.occurrences for insert to authenticated
  with check (
    supervisor_id = auth.uid()
    and (public.is_supervisor() or public.is_admin())
  );

drop policy if exists occ_update on public.occurrences;
create policy occ_update on public.occurrences for update to authenticated
  using (supervisor_id = auth.uid() or public.is_admin())
  with check (supervisor_id = auth.uid() or public.is_admin());

drop policy if exists occ_delete on public.occurrences;
create policy occ_delete on public.occurrences for delete to authenticated
  using (public.is_admin());

-- catálogo: supervisor e gestor leem; gestor e supervisor cadastram
drop policy if exists catalog_select on public.operation_catalog;
create policy catalog_select on public.operation_catalog for select to authenticated
  using (public.is_admin() or public.is_supervisor());

drop policy if exists catalog_write on public.operation_catalog;
create policy catalog_write on public.operation_catalog for all to authenticated
  using (public.is_admin() or public.is_supervisor())
  with check (public.is_admin() or public.is_supervisor());

-- ---------------------------------------------------------------------
-- 5) Motivos iniciais (edite à vontade em Mais › Operação)
-- ---------------------------------------------------------------------
insert into public.operation_catalog (kind, code, name) values
  ('motivo', 'Acoplou fora da parada',        null),
  ('motivo', 'Ultrapassou o ponto',           null),
  ('motivo', 'Excesso de velocidade',         null),
  ('motivo', 'Atraso na partida',             null),
  ('motivo', 'Uso de celular na direção',     null),
  ('motivo', 'Uniforme/apresentação',         null),
  ('motivo', 'Tratamento inadequado ao passageiro', null),
  ('motivo', 'Não parou no ponto',            null),
  ('motivo', 'Outro',                         null)
on conflict (kind, code) do nothing;

-- =====================================================================
-- PARA TRANSFORMAR UM USUÁRIO EM SUPERVISOR:
--   update public.users set role = 'supervisor' where email = 'supervisor@empresa.com.br';
-- =====================================================================
