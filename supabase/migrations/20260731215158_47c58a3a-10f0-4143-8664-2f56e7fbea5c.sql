ALTER TABLE public.operarios
  ADD COLUMN jornada_minutos integer NOT NULL DEFAULT 480,
  ADD COLUMN hora_entrada time NOT NULL DEFAULT '07:00',
  ADD COLUMN desayuno_minutos integer NOT NULL DEFAULT 30,
  ADD COLUMN comida_minutos integer NOT NULL DEFAULT 60,
  ADD CONSTRAINT operarios_jornada_valida CHECK (jornada_minutos > 0 AND jornada_minutos <= 1440),
  ADD CONSTRAINT operarios_descansos_validos CHECK (desayuno_minutos >= 0 AND desayuno_minutos <= 240 AND comida_minutos >= 0 AND comida_minutos <= 240);

UPDATE public.operarios SET hora_entrada = '08:00' WHERE area = 'oficina';

ALTER TABLE public.partes
  ALTER COLUMN cliente_id DROP NOT NULL,
  ALTER COLUMN proyecto_id DROP NOT NULL,
  ADD COLUMN tipo text NOT NULL DEFAULT 'trabajo',
  ADD CONSTRAINT partes_tipo_valido CHECK (tipo IN ('trabajo', 'desayuno', 'comida')),
  ADD CONSTRAINT partes_trabajo_requiere_proyecto CHECK (
    tipo <> 'trabajo' OR (cliente_id IS NOT NULL AND proyecto_id IS NOT NULL)
  );