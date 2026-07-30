CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.operarios ADD COLUMN IF NOT EXISTS pin_hash text;

REVOKE ALL ON public.operarios FROM anon, authenticated;
GRANT SELECT (id, nombre, area, activo, created_at) ON public.operarios TO anon, authenticated;
GRANT INSERT (id, nombre, area, activo) ON public.operarios TO anon, authenticated;
GRANT UPDATE (nombre, area, activo) ON public.operarios TO anon, authenticated;
GRANT DELETE ON public.operarios TO anon, authenticated;
GRANT ALL ON public.operarios TO service_role;

CREATE OR REPLACE FUNCTION public.establecer_pin(_operario_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _pin !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'El PIN debe tener entre 4 y 8 dígitos';
  END IF;
  UPDATE public.operarios SET pin_hash = crypt(_pin, gen_salt('bf')) WHERE id = _operario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verificar_pin(_operario_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE h text;
BEGIN
  SELECT pin_hash INTO h FROM public.operarios WHERE id = _operario_id;
  IF h IS NULL THEN
    RETURN false;
  END IF;
  RETURN h = crypt(_pin, h);
END;
$$;

CREATE OR REPLACE FUNCTION public.operario_tiene_pin(_operario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_hash IS NOT NULL FROM public.operarios WHERE id = _operario_id;
$$;

GRANT EXECUTE ON FUNCTION public.establecer_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_pin(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.operario_tiene_pin(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.evitar_solapes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.partes p
    WHERE p.operario_id = NEW.operario_id
      AND p.fecha = NEW.fecha
      AND p.id IS DISTINCT FROM NEW.id
      AND NEW.hora_inicio < p.hora_fin
      AND NEW.hora_fin > p.hora_inicio
  ) THEN
    RAISE EXCEPTION 'Ya existe un parte de este operario que se solapa con ese horario';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS partes_calcular_minutos ON public.partes;
CREATE TRIGGER partes_calcular_minutos
BEFORE INSERT OR UPDATE ON public.partes
FOR EACH ROW EXECUTE FUNCTION public.calcular_minutos();

DROP TRIGGER IF EXISTS partes_evitar_solapes ON public.partes;
CREATE TRIGGER partes_evitar_solapes
BEFORE INSERT OR UPDATE ON public.partes
FOR EACH ROW EXECUTE FUNCTION public.evitar_solapes();