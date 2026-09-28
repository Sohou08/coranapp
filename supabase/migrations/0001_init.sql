-- ============================================================
-- Sanad — schéma initial
-- Reprend les entités du document de synthèse (section 19 : "Architecture
-- fonctionnelle de la base de données") + les ajouts anti-désintermédiation
-- et médiathèque (sections 13-14).
-- À exécuter dans un projet Supabase (SQL editor, ou `supabase db push`).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Rôles & utilisateurs
-- ------------------------------------------------------------
create type user_role as enum ('eleve', 'parent', 'enseignant', 'admin');

-- Complète auth.users (Supabase Auth) avec les infos propres à Sanad.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'parent',
  first_name text not null,
  last_name text not null,
  -- Le numéro de téléphone n'est JAMAIS exposé à un autre utilisateur
  -- (voir section 13 du document de synthèse) : uniquement utilisé côté
  -- serveur pour les notifications transactionnelles (WhatsApp/SMS).
  phone text,
  country text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Matières / types de cours (section 3)
-- ------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  label text not null
);

insert into public.subjects (slug, label) values
  ('lecture', 'Lecture du Coran'),
  ('tajwid', 'Tajwid'),
  ('hifz', 'Mémorisation / Hifz'),
  ('revision', 'Révision'),
  ('arabe', 'Arabe coranique'),
  ('perfectionnement', 'Perfectionnement')
on conflict do nothing;

-- ------------------------------------------------------------
-- Profils enseignants (section 8)
-- ------------------------------------------------------------
create table public.teacher_profiles (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text unique not null,
  headline text,
  bio text,
  languages text[] not null default '{}',
  formats text[] not null default '{}', -- en_ligne / domicile / presentiel / hybride
  levels text[] not null default '{}',
  audiences text[] not null default '{}', -- enfant / adulte
  city text,
  country text,
  price_hour numeric(8, 2) not null default 0,
  verified boolean not null default false, -- badge affiché UNIQUEMENT si vérifié réellement (section 8)
  years_experience int,
  created_at timestamptz not null default now()
);

create table public.teacher_subjects (
  teacher_id uuid references public.teacher_profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  primary key (teacher_id, subject_id)
);

-- ------------------------------------------------------------
-- Élèves (un parent peut gérer plusieurs enfants — section 6)
-- ------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles (id) on delete cascade, -- null si l'élève est adulte et gère son propre compte
  self_profile_id uuid references public.profiles (id) on delete cascade,
  first_name text not null,
  birth_year int,
  notes text,
  created_at timestamptz not null default now(),
  constraint student_has_owner check (parent_id is not null or self_profile_id is not null)
);

-- ------------------------------------------------------------
-- Disponibilités (section 9)
-- ------------------------------------------------------------
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = dimanche
  start_time time not null,
  end_time time not null,
  recurring boolean not null default true,
  valid_from date,
  valid_to date
);

-- ------------------------------------------------------------
-- Réservations (section 9)
-- ------------------------------------------------------------
create type booking_status as enum (
  'pending', 'confirmed', 'completed', 'cancelled', 'no_show'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id),
  student_id uuid not null references public.students (id),
  subject_id uuid not null references public.subjects (id),
  starts_at timestamptz not null,
  duration_minutes int not null default 60,
  status booking_status not null default 'pending',
  price numeric(8, 2) not null,
  video_room_id text, -- identifiant de salle chez le prestataire vidéo (section 10)
  created_at timestamptz not null default now(),
  -- Empêche deux réservations confirmées qui se chevauchent chez le même enseignant.
  exclude using gist (
    teacher_id with =,
    tstzrange(starts_at, starts_at + (duration_minutes || ' minutes')::interval) with &&
  ) where (status in ('pending', 'confirmed'))
);

-- ------------------------------------------------------------
-- Paiements
-- ------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  amount numeric(8, 2) not null,
  currency text not null default 'EUR',
  provider text not null default 'stripe',
  provider_payment_id text,
  status text not null default 'pending', -- pending / paid / refunded / failed
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Suivi pédagogique (section 11)
-- ------------------------------------------------------------
create table public.lesson_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  summary text,
  strengths text,
  difficulties text,
  next_goal text,
  progress jsonb not null default '{}', -- ex: { "lecture": 80, "tajwid": 60 }
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Médiathèque / ressources pédagogiques (section 14)
-- ------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade, -- null = ressource partagée par la plateforme
  title text not null,
  file_path text not null, -- chemin dans Supabase Storage
  mime_type text,
  subject_id uuid references public.subjects (id),
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lesson_report_resources (
  lesson_report_id uuid references public.lesson_reports (id) on delete cascade,
  resource_id uuid references public.resources (id) on delete cascade,
  kind text not null default 'support', -- 'support' (utilisé en cours) ou 'revision' (à revoir)
  primary key (lesson_report_id, resource_id, kind)
);

-- ------------------------------------------------------------
-- Avis (section 13 du doc initial, renuméroté 15)
-- ------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade, -- 1 avis / cours terminé
  author_id uuid not null references public.profiles (id),
  teacher_id uuid not null references public.teacher_profiles (id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Messagerie interne (section 12-13 : jamais de coordonnées personnelles)
-- ------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id),
  other_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (teacher_id, other_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  -- Rempli par la fonction de modération anti-désintermédiation (section 13)
  -- si un numéro/email/pseudo a été détecté et masqué.
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Notifications (section 12)
-- ------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null, -- booking_created / booking_confirmed / reminder_24h / reminder_15min / ...
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security — base de départ, à affiner avant la production.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.students enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.lesson_reports enable row level security;
alter table public.resources enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Chacun voit et modifie son propre profil ; les profils enseignants
-- vérifiés sont publics en lecture (nécessaire pour la recherche publique).
create policy "profiles: self read/write" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "teacher_profiles: public read" on public.teacher_profiles
  for select using (true);

create policy "teacher_profiles: owner write" on public.teacher_profiles
  for insert with check (auth.uid() = id);
create policy "teacher_profiles: owner update" on public.teacher_profiles
  for update using (auth.uid() = id);

-- Un élève n'est visible que par son parent ou par lui-même.
create policy "students: owner" on public.students
  for all using (auth.uid() = parent_id or auth.uid() = self_profile_id)
  with check (auth.uid() = parent_id or auth.uid() = self_profile_id);

-- Une réservation n'est visible que par l'enseignant concerné ou le
-- titulaire (parent/élève) de l'élève réservé.
create policy "bookings: participants" on public.bookings
  for select using (
    auth.uid() = teacher_id
    or exists (
      select 1 from public.students s
      where s.id = bookings.student_id
        and (s.parent_id = auth.uid() or s.self_profile_id = auth.uid())
    )
  );

create policy "lesson_reports: participants" on public.lesson_reports
  for select using (
    exists (
      select 1 from public.bookings b
      join public.students s on s.id = b.student_id
      where b.id = lesson_reports.booking_id
        and (b.teacher_id = auth.uid() or s.parent_id = auth.uid() or s.self_profile_id = auth.uid())
    )
  );

create policy "messages: participants only" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.teacher_id = auth.uid() or c.other_id = auth.uid())
    )
  );

create policy "notifications: owner" on public.notifications
  for select using (auth.uid() = profile_id);

-- Les ressources partagées par la plateforme sont publiques ; les
-- ressources propres à un enseignant ne sont visibles que par lui et par
-- les élèves ayant une réservation avec lui (à affiner avec une fonction
-- dédiée une fois le modèle de réservation stabilisé).
create policy "resources: shared or owner" on public.resources
  for select using (is_shared or auth.uid() = owner_id);
create policy "resources: owner write" on public.resources
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
