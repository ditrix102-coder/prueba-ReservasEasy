import { createClient } from '@supabase/supabase-js';

// Usamos el SERVICE ROLE KEY para las operaciones en el backend (Server Actions)
// Esto nos da acceso total a la base de datos para verificar disponibilidad y guardar turnos de forma segura.
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
