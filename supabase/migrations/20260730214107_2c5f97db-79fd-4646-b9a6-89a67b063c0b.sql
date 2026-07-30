CREATE TABLE public.operarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  area text NOT NULL DEFAULT 'taller',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operarios TO anon, authenticated;
GRANT ALL ON public.operarios TO service_role;
ALTER TABLE public.operarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operarios acceso libre" ON public.operarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO anon, authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes acceso libre" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nombre text NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, codigo)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyectos TO anon, authenticated;
GRANT ALL ON public.proyectos TO service_role;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proyectos acceso libre" ON public.proyectos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.partes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL DEFAULT current_date,
  operario_id uuid NOT NULL REFERENCES public.operarios(id) ON DELETE RESTRICT,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  proyecto_id uuid NOT NULL REFERENCES public.proyectos(id) ON DELETE RESTRICT,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  minutos integer NOT NULL DEFAULT 0,
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partes TO anon, authenticated;
GRANT ALL ON public.partes TO service_role;
ALTER TABLE public.partes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partes acceso libre" ON public.partes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.calcular_minutos()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.hora_fin <= NEW.hora_inicio THEN
    RAISE EXCEPTION 'La hora de fin debe ser posterior a la hora de inicio';
  END IF;
  NEW.minutos := EXTRACT(EPOCH FROM (NEW.hora_fin - NEW.hora_inicio)) / 60;
  RETURN NEW;
END;
$$;

CREATE TRIGGER partes_calcular_minutos
BEFORE INSERT OR UPDATE ON public.partes
FOR EACH ROW EXECUTE FUNCTION public.calcular_minutos();

CREATE INDEX partes_fecha_idx ON public.partes (fecha DESC);

INSERT INTO public.operarios (nombre, area) VALUES
  ('Javier Ruiz', 'taller'),
  ('Marta Sánchez', 'oficina'),
  ('Luis Bermejo', 'taller'),
  ('Ana Torres', 'oficina');

INSERT INTO public.clientes (codigo, nombre) VALUES
  ('CL-001', 'Hotel Miramar'),
  ('CL-002', 'Restaurante El Roble'),
  ('CL-003', 'Reformas Delgado S.L.');

INSERT INTO public.proyectos (cliente_id, codigo, nombre)
SELECT id, 'PR-101', 'Mobiliario habitaciones' FROM public.clientes WHERE codigo = 'CL-001';
INSERT INTO public.proyectos (cliente_id, codigo, nombre)
SELECT id, 'PR-102', 'Recepción a medida' FROM public.clientes WHERE codigo = 'CL-001';
INSERT INTO public.proyectos (cliente_id, codigo, nombre)
SELECT id, 'PR-201', 'Barra y estanterías' FROM public.clientes WHERE codigo = 'CL-002';
INSERT INTO public.proyectos (cliente_id, codigo, nombre)
SELECT id, 'PR-301', 'Armarios empotrados' FROM public.clientes WHERE codigo = 'CL-003';