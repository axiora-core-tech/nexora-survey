-- Enable UUID extension
create extension IF not exists "uuid-ossp";

-- ─── USERS ────────────────────────────────────────────────────────────────────
create table users (
  id UUID primary key default uuid_generate_v4 (),
  email TEXT unique not null,
  name TEXT not null,
  role TEXT not null check (role in ('admin', 'creator', 'manager')) default 'manager',
  status TEXT default 'active' check (status in ('active', 'inactive')),
  created_at TIMESTAMPTZ default NOW()
);

-- ─── SURVEYS ──────────────────────────────────────────────────────────────────
create table surveys (
  id UUID primary key default uuid_generate_v4 (),
  title TEXT not null,
  description TEXT,
  status TEXT default 'draft' check (status in ('draft', 'active', 'paused', 'closed')),
  created_by UUID references users (id),
  settings JSONB default '{}',
  created_at TIMESTAMPTZ default NOW(),
  updated_at TIMESTAMPTZ default NOW()
);

-- Survey-level roles (per survey overrides)
create table survey_roles (
  id UUID primary key default uuid_generate_v4 (),
  survey_id UUID references surveys (id) on delete CASCADE,
  user_id UUID references users (id) on delete CASCADE,
  role TEXT not null check (role in ('admin', 'creator', 'manager')),
  unique (survey_id, user_id)
);

-- ─── SECTIONS & QUESTIONS ─────────────────────────────────────────────────────
create table sections (
  id UUID primary key default uuid_generate_v4 (),
  survey_id UUID references surveys (id) on delete CASCADE,
  title TEXT not null,
  sort_order INTEGER default 0
);

create table questions (
  id UUID primary key default uuid_generate_v4 (),
  survey_id UUID references surveys (id) on delete CASCADE,
  section_id UUID references sections (id) on delete CASCADE,
  type TEXT not null check (
    type in (
      'radio',
      'checkbox',
      'rating_star',
      'rating_number',
      'likert',
      'nps',
      'text',
      'dropdown'
    )
  ),
  text TEXT not null,
  options JSONB default '[]',
  settings JSONB default '{}', -- min, max, required, etc.
  sort_order INTEGER default 0,
  required BOOLEAN default true
);

-- ─── SURVEY LINKS ─────────────────────────────────────────────────────────────
create table survey_links (
  id UUID primary key default uuid_generate_v4 (),
  survey_id UUID references surveys (id) on delete CASCADE,
  email TEXT not null,
  token TEXT unique not null default encode(gen_random_bytes (12), 'hex'),
  click_count INTEGER default 0,
  status TEXT default 'active' check (status in ('active', 'paused', 'expired')),
  created_by UUID references users (id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ default NOW()
);

-- Increment click count (called when link is opened)
create or replace function increment_click (link_token TEXT) RETURNS VOID as $$
  UPDATE survey_links SET click_count = click_count + 1 WHERE token = link_token;
$$ LANGUAGE SQL;

-- ─── RESPONSES ────────────────────────────────────────────────────────────────
create table responses (
  id UUID primary key default uuid_generate_v4 (),
  survey_id UUID references surveys (id) on delete CASCADE,
  survey_link_id UUID references survey_links (id),
  status TEXT default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at TIMESTAMPTZ default NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB default '{}' -- browser, device, IP hash, etc.
);

-- Answers (immutable once submitted)
create table answers (
  id UUID primary key default uuid_generate_v4 (),
  response_id UUID references responses (id) on delete CASCADE,
  question_id UUID references questions (id),
  value JSONB not null, -- flexible: string, number, array
  created_at TIMESTAMPTZ default NOW()
);

-- Prevent answer modification after response is completed
create or replace function prevent_answer_modification () RETURNS TRIGGER as $$
BEGIN
  IF (SELECT status FROM responses WHERE id = OLD.response_id) = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify answers of a completed response';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

create trigger lock_completed_answers BEFORE
update on answers for EACH row
execute FUNCTION prevent_answer_modification ();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table surveys ENABLE row LEVEL SECURITY;

alter table survey_links ENABLE row LEVEL SECURITY;

alter table responses ENABLE row LEVEL SECURITY;

alter table answers ENABLE row LEVEL SECURITY;

-- Admins see everything
create policy "Admins full access" on surveys for all using (
  exists (
    select
      1
    from
      users
    where
      id = auth.uid ()
      and role = 'admin'
  )
);

-- Public can submit via link (no auth needed for response submission)
create policy "Public insert responses" on responses for INSERT
with
  check (true);

create policy "Public insert answers" on answers for INSERT
with
  check (true);

-- ─── ANALYTICS VIEW ───────────────────────────────────────────────────────────
create view survey_analytics as
select
  s.id as survey_id,
  s.title,
  COUNT(distinct r.id) filter (
    where
      r.status = 'completed'
  ) as total_responses,
  COUNT(distinct r.id) filter (
    where
      r.status = 'in_progress'
  ) as in_progress,
  COUNT(distinct sl.id) as total_links,
  SUM(sl.click_count) as total_clicks,
  ROUND(
    COUNT(distinct r.id) filter (
      where
        r.status = 'completed'
    )::numeric / NULLIF(SUM(sl.click_count), 0) * 100,
    1
  ) as conversion_rate
from
  surveys s
  left join survey_links sl on sl.survey_id = s.id
  left join responses r on r.survey_link_id = sl.id
group by
  s.id,
  s.title;