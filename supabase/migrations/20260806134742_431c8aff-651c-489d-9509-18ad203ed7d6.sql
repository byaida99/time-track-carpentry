CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  referencia text NOT NULL DEFAULT '',
  proveedor text NOT NULL DEFAULT '',
  unidad text NOT NULL DEFAULT 'ud',
  precio_estimado numeric(12,2),
  descripcion text NOT NULL DEFAULT '',
  ficha_completa boolean NOT NULL DEFAULT false,
  foto_url text,
  activo boolean NOT NULL DEFAULT true,
  creado_por uuid REFERENCES public.operarios(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.productos TO service_role;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER productos_updated_at BEFORE UPDATE ON public.productos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  operario_id uuid NOT NULL REFERENCES public.operarios(id),
  cantidad numeric(12,2) NOT NULL DEFAULT 1,
  notas text NOT NULL DEFAULT '',
  foto_url text,
  estado text NOT NULL DEFAULT 'pendiente',
  pedido_por uuid REFERENCES public.operarios(id),
  pedido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX pedidos_estado_idx ON public.pedidos (estado, created_at DESC);