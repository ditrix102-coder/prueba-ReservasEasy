import { createClient } from '@supabase/supabase-js';

// Usamos el SERVICE ROLE KEY para las operaciones en el backend (Server Actions)
// Esto nos da acceso total a la base de datos para verificar disponibilidad y guardar turnos de forma segura.
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);
