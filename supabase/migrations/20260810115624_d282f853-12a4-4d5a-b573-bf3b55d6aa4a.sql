CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.limpiar_pedidos_antiguos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ids uuid[];
BEGIN
  SELECT array_agg(id) INTO ids
  FROM public.pedidos
  WHERE (estado = 'cancelado' AND COALESCE(estado_at, created_at) < now() - interval '5 days')
     OR (estado = 'entregado' AND COALESCE(estado_at, created_at) < now() - interval '10 days');

  IF ids IS NULL THEN RETURN; END IF;

  DELETE FROM public.pedido_historial WHERE pedido_id = ANY(ids);
  DELETE FROM public.pedidos WHERE id = ANY(ids);
END;
$$;

REVOKE ALL ON FUNCTION public.limpiar_pedidos_antiguos() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('limpiar-pedidos-antiguos')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'limpiar-pedidos-antiguos');

SELECT cron.schedule(
  'limpiar-pedidos-antiguos',
  '30 3 * * *',
  $$SELECT public.limpiar_pedidos_antiguos();$$
);