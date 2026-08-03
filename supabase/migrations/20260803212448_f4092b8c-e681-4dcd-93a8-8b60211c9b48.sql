DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('operario', 'area_tecnica', 'administracion');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.operario_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id uuid NOT NULL REFERENCES public.operarios(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'operario',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operario_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operario_roles TO anon, authenticated;
GRANT ALL ON public.operario_roles TO service_role;
ALTER TABLE public.operario_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operario_roles acceso libre" ON public.operario_roles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.calendario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  tipo text NOT NULL DEFAULT 'festivo',
  operario_id uuid REFERENCES public.operarios(id) ON DELETE CASCADE,
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendario_tipo_valido CHECK (tipo IN ('festivo', 'vacaciones'))
);

CREATE UNIQUE INDEX IF NOT EXISTS calendario_unico ON public.calendario (fecha, tipo, COALESCE(operario_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendario TO anon, authenticated;
GRANT ALL ON public.calendario TO service_role;
ALTER TABLE public.calendario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendario acceso libre" ON public.calendario FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS calendario_updated_at ON public.calendario;
CREATE TRIGGER calendario_updated_at BEFORE UPDATE ON public.calendario
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.operario_roles (operario_id, role)
SELECT id, 'operario'::public.app_role FROM public.operarios
ON CONFLICT (operario_id, role) DO NOTHING;

INSERT INTO public.operario_roles (operario_id, role)
SELECT id, 'administracion'::public.app_role FROM public.operarios
ORDER BY created_at ASC LIMIT 1
ON CONFLICT (operario_id, role) DO NOTHING;