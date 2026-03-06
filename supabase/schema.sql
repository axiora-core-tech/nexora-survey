-- ============================================================
-- NEXORA SURVEY — Fixed Multi-Tenant Schema
-- Run each CHUNK separately in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- CHUNK 1: Extensions + Tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin','admin','manager','creator','viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.user_profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','paused','expired','closed')),
  expires_at TIMESTAMPTZ,
  theme_color TEXT DEFAULT '#6366f1',
  welcome_message TEXT,
  thank_you_message TEXT DEFAULT 'Thank you for completing this survey!',
  allow_anonymous BOOLEAN DEFAULT true,
  require_email BOOLEAN DEFAULT false,
  show_progress_bar BOOLEAN DEFAULT true,
  auto_save_interval INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'short_text','long_text','single_choice','multiple_choice',
    'rating','scale','date','number','email','dropdown','yes_no','file_upload'
  )),
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT,
  validation_rules JSONB,
  conditional_logic JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FIX 1: tenant_id is nullable here because the BEFORE INSERT trigger
-- populates it from the survey. NOT NULL is enforced by the trigger itself.
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- nullable; trigger sets this
  respondent_email TEXT,
  respondent_name TEXT,
  session_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  last_saved_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_value TEXT,
  answer_json JSONB,
  answered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  shared_with UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.user_profiles(id),
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view','view_analytics','edit')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(survey_id, shared_with)
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHUNK 2: Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_surveys_tenant ON public.surveys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_surveys_slug ON public.surveys(slug);
CREATE INDEX IF NOT EXISTS idx_surveys_created_by ON public.surveys(created_by);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_questions_survey ON public.survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_survey ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_tenant ON public.survey_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.survey_responses(session_token);
CREATE INDEX IF NOT EXISTS idx_answers_response ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.survey_answers(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_answers_unique ON public.survey_answers(response_id, question_id);
CREATE INDEX IF NOT EXISTS idx_shares_survey ON public.survey_shares(survey_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON public.audit_log(tenant_id);

-- ============================================================
-- CHUNK 3: Triggers + Functions (run BEFORE RLS policies)
-- ============================================================

-- FIX 2: Added LIMIT 1 to prevent multiple-row issues
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- FIX 3: Trigger validates tenant_id is set; raises error if survey not found
CREATE OR REPLACE FUNCTION public.set_response_tenant_id()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.surveys WHERE id = NEW.survey_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find tenant for survey_id: %', NEW.survey_id;
  END IF;
  NEW.tenant_id := v_tenant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_set_response_tenant
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_response_tenant_id();

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_tenants BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER trg_update_profiles BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();
CREATE TRIGGER trg_update_surveys BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE OR REPLACE FUNCTION public.auto_expire_surveys()
RETURNS void AS $$
BEGIN
  UPDATE public.surveys
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.register_tenant(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_user_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (p_tenant_name, p_tenant_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.user_profiles (id, tenant_id, email, full_name, role)
  VALUES (p_user_id, v_tenant_id, p_user_email, p_user_name, 'super_admin');

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- CHUNK 4: RLS Policies
-- ============================================================

-- ---- TENANTS ----
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant"
  ON public.tenants FOR SELECT
  USING (id = public.get_user_tenant_id());

CREATE POLICY "Super admins can update own tenant"
  ON public.tenants FOR UPDATE
  USING (id = public.get_user_tenant_id() AND public.get_user_role() = 'super_admin');

-- ---- USER PROFILES ----
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- FIX 4: Added INSERT policy so register_tenant and signup flows work
CREATE POLICY "Allow profile creation on signup"
  ON public.user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view profiles in own tenant"
  ON public.user_profiles FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can manage users in tenant"
  ON public.user_profiles FOR ALL
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('super_admin', 'admin')
  );

-- ---- SURVEYS ----
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view surveys in own tenant"
  ON public.surveys FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Creators+ can create surveys"
  ON public.surveys FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('super_admin','admin','manager','creator')
  );

CREATE POLICY "Owners and admins can update surveys"
  ON public.surveys FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND (
      created_by = auth.uid()
      OR public.get_user_role() IN ('super_admin','admin','manager')
    )
  );

CREATE POLICY "Admins can delete surveys"
  ON public.surveys FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('super_admin','admin')
  );

-- ---- SURVEY QUESTIONS ----
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

-- FIX 5: Merged the two conflicting FOR SELECT policies into one
CREATE POLICY "View questions for tenant or active surveys"
  ON public.survey_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
        AND (
          s.tenant_id = public.get_user_tenant_id()
          OR s.status = 'active'
        )
    )
  );

CREATE POLICY "Creators can manage questions"
  ON public.survey_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
        AND s.tenant_id = public.get_user_tenant_id()
        AND (
          s.created_by = auth.uid()
          OR public.get_user_role() IN ('super_admin','admin','manager')
        )
    )
  );

-- ---- SURVEY RESPONSES ----
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view responses"
  ON public.survey_responses FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Anyone can create responses for active surveys"
  ON public.survey_responses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id AND s.status = 'active'
    )
  );

CREATE POLICY "Respondents can update own response"
  ON public.survey_responses FOR UPDATE
  USING (status = 'in_progress');

-- ---- SURVEY ANSWERS ----
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view answers"
  ON public.survey_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses r
      WHERE r.id = response_id AND r.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Respondents can insert answers"
  ON public.survey_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.survey_responses r
      WHERE r.id = response_id AND r.status = 'in_progress'
    )
  );

CREATE POLICY "Respondents can update answers"
  ON public.survey_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.survey_responses r
      WHERE r.id = response_id AND r.status = 'in_progress'
    )
  );

-- ---- SURVEY SHARES ----
ALTER TABLE public.survey_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View shares within tenant"
  ON public.survey_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id AND s.tenant_id = public.get_user_tenant_id()
    )
  );

CREATE POLICY "Owners can manage shares"
  ON public.survey_shares FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.surveys s
      WHERE s.id = survey_id
        AND s.tenant_id = public.get_user_tenant_id()
        AND (
          s.created_by = auth.uid()
          OR public.get_user_role() IN ('super_admin','admin','manager')
        )
    )
  );

-- ---- AUDIT LOG ----
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_log FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() IN ('super_admin','admin')
  );

-- ============================================================
-- CHUNK 5: Analytics View
-- ============================================================

CREATE OR REPLACE VIEW public.survey_analytics WITH (security_barrier = true) AS
SELECT
  s.id AS survey_id,
  s.tenant_id,
  s.title,
  s.status,
  s.created_at,
  s.expires_at,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed') AS completed_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'in_progress') AS in_progress_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'abandoned') AS abandoned_count,
  COUNT(DISTINCT r.id) AS total_responses,
  AVG(EXTRACT(EPOCH FROM (r.completed_at - r.started_at)))
    FILTER (WHERE r.status = 'completed') AS avg_completion_seconds
FROM public.surveys s
LEFT JOIN public.survey_responses r ON r.survey_id = s.id
GROUP BY s.id, s.tenant_id, s.title, s.status, s.created_at, s.expires_at;