-- Pega esto completo en Supabase > SQL Editor > Run (una sola vez)

create extension if not exists pgcrypto;

create table businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  whatsapp_phone text,
  created_at timestamptz default now()
);

create table barbers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  active boolean not null default true
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  duration_min int not null default 30,
  price_clp int not null default 0,
  active boolean not null default true
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  barber_id uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  start_time timestamp not null,
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

create index on appointments (business_id, barber_id, start_time);

-- RLS activado y SIN políticas: nadie puede leer/escribir con la clave pública (anon).
-- Solo el servidor (Service Role Key, que nunca se expone al navegador) puede hacerlo.
alter table businesses enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table appointments enable row level security;

-- ====== Bad Brothers ======
-- whatsapp_phone usa temporalmente el número del dueño del proyecto hasta
-- que el barbero sepa de la plataforma y confirme usar el número del local.
insert into businesses (slug, name, whatsapp_phone) values
  ('bad-brothers', 'Bad Brothers', '+56953838648');

insert into barbers (business_id, name)
select id, nombre from businesses, (values ('Diosito'), ('Manuel')) as b(nombre)
where slug = 'bad-brothers';

insert into services (business_id, name, duration_min, price_clp)
select id, nombre, duracion, precio from businesses,
  (values
    ('Corte', 30, 15000)
  ) as s(nombre, duracion, precio)
where slug = 'bad-brothers';
