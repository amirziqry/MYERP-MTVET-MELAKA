
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'trainer', 'general');
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.project_status AS ENUM ('draft', 'open', 'awarded', 'ongoing', 'closed', 'claims');
CREATE TYPE public.proposal_status AS ENUM ('submitted', 'accepted', 'rejected');
CREATE TYPE public.announcement_target AS ENUM ('all', 'trainers', 'admins');
CREATE TYPE public.recipient_type AS ENUM ('individual', 'company');
CREATE TYPE public.claim_status AS ENUM ('pending', 'submitted', 'paid');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  skills TEXT[] DEFAULT '{}',
  role public.app_role NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (separate, for security definer)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_role_is(_role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), _role) $$;

-- TRAINER APPLICATIONS
CREATE TABLE public.trainer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skills TEXT[] NOT NULL DEFAULT '{}',
  background TEXT,
  resume_pdf_url TEXT,
  certifications_pdf_url TEXT,
  status public.application_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_applications TO authenticated;
GRANT ALL ON public.trainer_applications TO service_role;
ALTER TABLE public.trainer_applications ENABLE ROW LEVEL SECURITY;

-- PROJECTS
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  budget NUMERIC,
  timeline TEXT,
  status public.project_status NOT NULL DEFAULT 'draft',
  awarded_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- PROPOSALS
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pitch TEXT NOT NULL,
  bid_amount NUMERIC NOT NULL,
  proposal_pdf_url TEXT,
  status public.proposal_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, trainer_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- PROJECT REPORTS
CREATE TABLE public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_pdf_url TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_reports TO authenticated;
GRANT ALL ON public.project_reports TO service_role;
ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- CLAIMS
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_holder TEXT,
  account_number TEXT,
  recipient_type public.recipient_type,
  tax_id TEXT,
  mailing_address TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  claim_amount NUMERIC,
  invoice_pdf_url TEXT,
  status public.claim_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims TO authenticated;
GRANT ALL ON public.claims TO service_role;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target public.announcement_target NOT NULL DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'general');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_trainer_app_updated BEFORE UPDATE ON public.trainer_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_proposals_updated BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_claims_updated BEFORE UPDATE ON public.claims FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync profile.role to user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role) OR TG_OP = 'INSERT' THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_profile_sync_role AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- RLS POLICIES
-- profiles
CREATE POLICY "Profiles: self read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: trainers visible to all auth" ON public.profiles FOR SELECT TO authenticated USING (true);

-- user_roles
CREATE POLICY "Roles: self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- trainer_applications
CREATE POLICY "App: owner read" ON public.trainer_applications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "App: owner insert" ON public.trainer_applications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "App: admin update" ON public.trainer_applications FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- projects: everyone authed can read non-draft; admin all
CREATE POLICY "Projects: read published" ON public.projects FOR SELECT TO authenticated USING (status <> 'draft' OR public.has_role(auth.uid(), 'admin') OR awarded_to = auth.uid());
CREATE POLICY "Projects: admin write" ON public.projects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- proposals: trainer sees own; admin all
CREATE POLICY "Proposals: trainer own read" ON public.proposals FOR SELECT TO authenticated USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Proposals: trainer insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid() AND public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Proposals: admin update" ON public.proposals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- project_reports
CREATE POLICY "Reports: read involved" ON public.project_reports FOR SELECT TO authenticated USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Reports: trainer insert" ON public.project_reports FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());

-- claims
CREATE POLICY "Claims: trainer read own" ON public.claims FOR SELECT TO authenticated USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Claims: trainer insert" ON public.claims FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Claims: trainer update own" ON public.claims FOR UPDATE TO authenticated USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- announcements: read filtered by target; admin write
CREATE POLICY "Ann: read all" ON public.announcements FOR SELECT TO authenticated USING (
  target = 'all'
  OR (target = 'trainers' AND public.has_role(auth.uid(), 'trainer'))
  OR (target = 'admins' AND public.has_role(auth.uid(), 'admin'))
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Ann: admin write" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
