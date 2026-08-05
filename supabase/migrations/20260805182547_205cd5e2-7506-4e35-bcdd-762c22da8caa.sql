-- 1. Remove the fully permissive policies (no policy = no access via Data API)
DROP POLICY IF EXISTS "operarios acceso libre" ON public.operarios;
DROP POLICY IF EXISTS "clientes acceso libre" ON public.clientes;
DROP POLICY IF EXISTS "proyectos acceso libre" ON public.proyectos;
DROP POLICY IF EXISTS "partes acceso libre" ON public.partes;
DROP POLICY IF EXISTS "operario_roles acceso libre" ON public.operario_roles;
DROP POLICY IF EXISTS "calendario acceso libre" ON public.calendario;

-- 2. Revoke all direct Data API privileges from browser roles
REVOKE ALL ON public.operarios FROM anon, authenticated;
REVOKE ALL ON public.clientes FROM anon, authenticated;
REVOKE ALL ON public.proyectos FROM anon, authenticated;
REVOKE ALL ON public.partes FROM anon, authenticated;
REVOKE ALL ON public.operario_roles FROM anon, authenticated;
REVOKE ALL ON public.calendario FROM anon, authenticated;

-- 3. Server-side (service role) keeps full access; RLS stays enabled for defence in depth
ALTER TABLE public.operarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operario_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendario ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.operarios TO service_role;
GRANT ALL ON public.clientes TO service_role;
GRANT ALL ON public.proyectos TO service_role;
GRANT ALL ON public.partes TO service_role;
GRANT ALL ON public.operario_roles TO service_role;
GRANT ALL ON public.calendario TO service_role;

-- 4. SECURITY DEFINER functions must not be callable from the browser
REVOKE ALL ON FUNCTION public.verificar_pin(uuid, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.establecer_pin(uuid, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.operario_tiene_pin(uuid) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.verificar_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.establecer_pin(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.operario_tiene_pin(uuid) TO service_role;