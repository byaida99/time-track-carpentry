UPDATE public.pedidos SET estado = 'confirmado' WHERE estado = 'pedido';

ALTER TABLE public.pedidos
  DROP CONSTRAINT IF EXISTS pedidos_estado_check;

ALTER TABLE public.pedidos
  ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN ('pendiente','confirmado','entregado','cancelado'));

ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS estado_at timestamptz,
  ADD COLUMN IF NOT EXISTS estado_por uuid REFERENCES public.operarios(id);

UPDATE public.pedidos SET estado_at = COALESCE(pedido_at, created_at) WHERE estado_at IS NULL;

CREATE TABLE IF NOT EXISTS public.pedido_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  estado_anterior text,
  estado_nuevo text NOT NULL,
  nota text NOT NULL DEFAULT '',
  operario_id uuid REFERENCES public.operarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedido_historial_pedido_idx ON public.pedido_historial (pedido_id, created_at);

GRANT ALL ON public.pedido_historial TO service_role;

ALTER TABLE public.pedido_historial ENABLE ROW LEVEL SECURITY;

INSERT INTO public.pedido_historial (pedido_id, estado_anterior, estado_nuevo, operario_id, created_at)
SELECT p.id, NULL, 'pendiente', p.operario_id, p.created_at
FROM public.pedidos p
WHERE NOT EXISTS (SELECT 1 FROM public.pedido_historial h WHERE h.pedido_id = p.id);