-- ==========================================================================
-- SCRIPT DE BASE DE DATOS Y POLÍTICAS RLS SUPABASE - TEPSA PSV
-- Copia y pega todo este código en el SQL Editor de tu panel de Supabase
-- ==========================================================================

-- 1. Crear Tabla de Autenticación y Cuentas de Conductores
CREATE TABLE IF NOT EXISTS public.conductores_auth (
    id BIGSERIAL PRIMARY KEY,
    driver_name TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active', -- 'active' o 'inactive'
    role TEXT DEFAULT 'Conductor',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear Tabla de Fotografías y Capturas de Viaje
CREATE TABLE IF NOT EXISTS public.fotos_conductores (
    id BIGSERIAL PRIMARY KEY,
    driver_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS y Políticas de Acceso Público
ALTER TABLE public.conductores_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_conductores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica conductores_auth" ON public.conductores_auth;
DROP POLICY IF EXISTS "Permitir insercion publica conductores_auth" ON public.conductores_auth;
DROP POLICY IF EXISTS "Permitir actualizacion publica conductores_auth" ON public.conductores_auth;

DROP POLICY IF EXISTS "Permitir lectura publica fotos_conductores" ON public.fotos_conductores;
DROP POLICY IF EXISTS "Permitir insercion publica fotos_conductores" ON public.fotos_conductores;
DROP POLICY IF EXISTS "Permitir eliminacion publica fotos_conductores" ON public.fotos_conductores;

CREATE POLICY "Permitir lectura publica conductores_auth" ON public.conductores_auth FOR SELECT USING (true);
CREATE POLICY "Permitir insercion publica conductores_auth" ON public.conductores_auth FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion publica conductores_auth" ON public.conductores_auth FOR UPDATE USING (true);

CREATE POLICY "Permitir lectura publica fotos_conductores" ON public.fotos_conductores FOR SELECT USING (true);
CREATE POLICY "Permitir insercion publica fotos_conductores" ON public.fotos_conductores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir eliminacion publica fotos_conductores" ON public.fotos_conductores FOR DELETE USING (true);

-- 4. Registrar Cuentas de Administradores y Moderadores por Defecto (Sin admpsv)
INSERT INTO public.conductores_auth (driver_name, password, is_admin, status, role)
VALUES 
  ('Alexander', 'tepsa2026', TRUE, 'active', 'Fundador / Admin'),
  ('Cesar', 'tepsa2026', TRUE, 'active', 'Fundador / Admin'),
  ('Cristofer', 'tepsa2026', TRUE, 'active', 'Moderador / Admin'),
  ('SABROSAURIO', 'tepsa2026', TRUE, 'active', 'Administrador'),
  ('KIRITO', 'tepsa2026', TRUE, 'active', 'Moderador')
ON CONFLICT (driver_name) DO UPDATE 
SET is_admin = TRUE, status = 'active';

-- Borrar admpsv si existía previamente
DELETE FROM public.conductores_auth WHERE LOWER(driver_name) = 'admpsv';

-- Indices para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_conductores_name ON public.conductores_auth(driver_name);
CREATE INDEX IF NOT EXISTS idx_fotos_driver ON public.fotos_conductores(driver_name);
CREATE INDEX IF NOT EXISTS idx_fotos_created ON public.fotos_conductores(created_at DESC);
