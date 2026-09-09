# 🔒 PLAN DE SEGURIDAD Y AUDITORÍA
## Sistema de reservas online — Astro + Supabase

### Objetivo

Quiero implementar y verificar un sistema de seguridad adecuado para una aplicación de reservas online de una peluquería.

El proyecto utiliza:

- Astro
- Astro Server / endpoints del servidor
- Supabase
- PostgreSQL
- Panel privado `/admin`
- Sistema público de reservas

El objetivo NO es crear una arquitectura excesivamente compleja.

Buscamos una solución:

- segura
- sencilla de mantener
- adecuada para una peluquería pequeña
- con la menor cantidad posible de infraestructura adicional
- con las reglas de seguridad aplicadas principalmente en servidor y base de datos

IMPORTANTE:

No considerar que proteger `/admin` significa que toda la aplicación está protegida.

La seguridad debe dividirse en varias capas:

1. Protección del panel administrativo
2. Seguridad de Supabase y RLS
3. Seguridad de las APIs/endpoints
4. Protección contra reservas fraudulentas o masivas
5. Validación de datos
6. Protección contra doble reserva
7. Protección contra acceso/modificación de datos ajenos
8. Tests de seguridad y lógica de negocio

---

# 1. 🔐 PROTECCIÓN DEL PANEL ADMINISTRATIVO

## Objetivo

El panel `/admin` solamente debe ser accesible por el administrador autorizado.

Para este proyecto se puede utilizar HTTP Basic Authentication porque existe un único administrador y no necesitamos implementar un sistema completo de usuarios administrativos.

### Implementación

Proteger del lado servidor:

```text
/admin
/admin/*
```

El servidor debe comprobar las credenciales ANTES de entregar contenido sensible del panel.

Utilizar variables de entorno:

```env
ADMIN_USER=...
ADMIN_PASSWORD=...
```

Estas variables deben existir únicamente en el servidor.

NO deben:

- aparecer en el frontend
- aparecer en JavaScript enviado al navegador
- aparecer en el repositorio
- aparecer en logs
- aparecer en respuestas de API

### Comportamiento esperado

Sin credenciales:

```text
GET /admin
→ 401 Unauthorized
```

Con credenciales incorrectas:

```text
GET /admin
→ 401 Unauthorized
```

Con credenciales correctas:

```text
GET /admin
→ Panel administrativo
```

### IMPORTANTE

No implementar la protección únicamente con JavaScript.

Esto NO es suficiente:

```js
if (isAdmin) {
   mostrarPanel();
}
```

La autorización debe ocurrir en el servidor.

Ocultar elementos del frontend NO constituye una medida de seguridad.

---

# 2. 🗄️ SEGURIDAD DE SUPABASE

Esta es una de las partes MÁS IMPORTANTES.

Proteger `/admin` no protege automáticamente la base de datos.

Revisar todas las tablas existentes en Supabase.

Para cada tabla determinar:

- quién puede leer
- quién puede insertar
- quién puede modificar
- quién puede eliminar

Activar Row Level Security (RLS) donde corresponda.

Ejemplo conceptual:

| Recurso | Visitante | Admin |
|---|---|---|
| Servicios | Leer | CRUD |
| Horarios disponibles | Leer | CRUD |
| Reservas | Crear según reglas | CRUD |
| Datos de clientes | No leer globalmente | Leer |
| Configuración | No | CRUD |

No crear policies excesivamente permisivas como:

```sql
FOR ALL USING (true)
```

sin una razón específica.

Revisar especialmente policies existentes y comprobar que no permitan acceso accidental a todos los registros.

---

# 3. 🔑 CLAVES DE SUPABASE

Revisar todas las variables de entorno.

La clave con privilegios elevados de Supabase (`service_role` o secret key) debe utilizarse ÚNICAMENTE en el servidor.

Nunca debe enviarse al navegador.

Nunca debe aparecer en:

- código cliente
- archivos JavaScript públicos
- HTML generado para el cliente
- GitHub
- logs
- respuestas API

La clave pública/publishable puede utilizarse en el cliente únicamente cuando RLS esté correctamente configurado.

---

# 4. 🛡️ SEGURIDAD DE LOS ENDPOINTS

Identificar todos los endpoints/API utilizados por la aplicación.

Por ejemplo:

```text
/api/reservations
/api/availability
/api/services
/api/admin/...
```

Para cada endpoint determinar:

1. ¿Es público?
2. ¿Quién puede utilizarlo?
3. ¿Qué datos puede recibir?
4. ¿Qué datos puede devolver?
5. ¿Qué operaciones puede realizar?

Nunca confiar únicamente en las validaciones del frontend.

El servidor debe volver a validar todos los datos.

---

# 5. 📋 VALIDACIÓN SERVER-SIDE

Todos los datos enviados por el navegador deben considerarse potencialmente manipulables.

Validar en servidor:

```text
nombre
teléfono
email
serviceId
fecha
hora
duración
precio
estado
usuario
identificadores
```

No confiar en valores enviados por el cliente para información sensible.

Por ejemplo, si el cliente envía:

```json
{
  "serviceId": 3,
  "price": 100
}
```

NO utilizar directamente `price = 100`.

El servidor debe consultar el servicio en la base de datos y obtener el precio real.

Lo mismo aplica para:

```text
duration
role
userId
status
permissions
```

si esos valores son controlables por el cliente.

---

# 6. 📅 SEGURIDAD DEL SISTEMA DE RESERVAS

Implementar y verificar reglas de negocio.

El usuario NO debería poder abusar del sistema simplemente enviando muchas solicitudes.

Definir límites razonables para una peluquería.

Por ejemplo:

```text
Máximo de X reservas futuras por teléfono.
```

El número exacto debe ser configurable y no estar hardcodeado si es posible.

También impedir:

- reservar el mismo turno dos veces
- reservar una fecha pasada
- reservar un horario pasado
- reservar fuera del horario de atención
- reservar un día cerrado
- reservar un servicio inexistente
- reservar un horario no disponible
- crear reservas duplicadas
- crear cantidades absurdas de reservas consecutivas

---

# 7. 🚨 PROTECCIÓN CONTRA RESERVAS MASIVAS

Considerar este escenario:

Un usuario introduce el mismo teléfono y realiza:

```text
Lunes 09:00
Lunes 10:00
Lunes 11:00
Lunes 12:00
...
Viernes 18:00
```

El sistema debe impedir que una sola persona bloquee todos los turnos disponibles.

Implementar una regla de negocio razonable, por ejemplo:

```text
Máximo 3 reservas futuras por teléfono.
```

El límite debe poder modificarse posteriormente si el negocio necesita otro valor.

IMPORTANTE:

No confiar únicamente en el frontend para esto.

La comprobación debe realizarse en el servidor y/o base de datos.

---

# 8. 🚦 RATE LIMITING

Proteger especialmente los endpoints que crean reservas.

Por ejemplo:

```text
POST /api/reservations
```

Debe existir un límite de solicitudes para evitar:

- spam
- bots
- creación masiva de reservas
- abuso automatizado

El rate limit debe ser razonable y no bloquear usuarios normales.

Si la infraestructura actual permite implementar rate limiting sin agregar demasiada complejidad, utilizarlo.

No agregar servicios externos innecesarios si una solución sencilla del lado servidor es suficiente.

---

# 9. ⚔️ PROTECCIÓN CONTRA DOBLE RESERVA

Este punto es CRÍTICO.

No depender solamente de:

```text
1. Comprobar si el horario está disponible.
2. Insertar la reserva.
```

Porque dos usuarios pueden intentar reservar exactamente el mismo horario al mismo tiempo.

Ejemplo:

```text
Usuario A → 10:00
Usuario B → 10:00
```

Ambos pueden comprobar:

```text
10:00 disponible = TRUE
```

antes de que cualquiera inserte el registro.

La base de datos debe garantizar que finalmente solo pueda existir una reserva válida para ese turno.

Utilizar constraints, transacciones o el mecanismo apropiado de PostgreSQL/Supabase según la estructura actual del proyecto.

El resultado esperado debe ser:

```text
Usuario A → reserva exitosa
Usuario B → rechazo: horario ya ocupado
```

Nunca:

```text
10:00 → Reserva A
10:00 → Reserva B
```

---

# 10. 🧪 TEST DE CONCURRENCIA

Después de implementar la protección anterior, realizar una prueba real.

Abrir dos navegadores o dos sesiones independientes.

Seleccionar exactamente:

```text
Mismo día
Mismo servicio
Mismo horario
```

Enviar ambas reservas prácticamente al mismo tiempo.

Resultado esperado:

```text
1 reserva creada
1 reserva rechazada
```

No aceptar dos reservas para el mismo turno.

---

# 11. 🔍 TEST DE ACCESO A DATOS AJENOS

Probar si un usuario puede acceder a una reserva que no le pertenece.

Ejemplo:

```text
/reservations/123
```

Cambiar manualmente:

```text
123 → 124
```

o modificar el identificador enviado al endpoint.

Intentar:

```text
GET
PATCH
DELETE
```

sobre una reserva ajena.

Resultado esperado:

```text
403 Forbidden
```

o:

```text
404 Not Found
```

según la estrategia utilizada.

Nunca permitir que un usuario común pueda modificar o eliminar arbitrariamente reservas de otras personas.

---

# 12. 🧪 TEST DE MANIPULACIÓN DE DATOS

Intentar modificar manualmente las requests desde DevTools.

Ejemplos:

```text
serviceId = servicio inexistente
price = 1
price = 0
price = -100
duration = 999999
status = "confirmed"
role = "admin"
userId = ID de otra persona
```

El servidor debe ignorar o rechazar cualquier valor que el cliente no tenga permiso para establecer.

---

# 13. 🧪 TEST DE INPUTS MALICIOSOS

Probar campos como:

```text
Nombre:
<script>alert(1)</script>
```

```text
Nombre:
' OR 1=1 --
```

También probar:

- strings extremadamente largos
- caracteres especiales
- emojis
- campos vacíos
- espacios
- números negativos
- valores inexistentes
- JSON inesperado
- tipos incorrectos

Ejemplo:

```json
{
  "serviceId": "admin"
}
```

cuando el servidor espera un número.

La aplicación debe rechazar entradas inválidas sin romperse.

---

# 14. 📆 TEST DE FECHAS

Intentar enviar manualmente:

```text
fecha = ayer
fecha = día cerrado
fecha = domingo
fecha = fuera del horario
fecha = fecha inexistente
```

El servidor debe validar nuevamente la disponibilidad.

Nunca confiar únicamente en el calendario visual del frontend.

---

# 15. 👑 TEST DEL PANEL ADMIN

Realizar estas pruebas:

### Test 1

Abrir directamente:

```text
/admin
```

sin autenticación.

Resultado:

```text
401 / acceso bloqueado
```

### Test 2

Intentar:

```text
/admin/reservas
/admin/clientes
/admin/configuracion
```

sin autenticación.

Todo debe estar protegido.

### Test 3

Modificar la URL manualmente.

No debe existir ninguna ruta administrativa sensible accesible sin autorización.

### Test 4

Intentar acceder a APIs administrativas directamente.

Por ejemplo:

```text
/api/admin/reservations
/api/admin/settings
```

No deben estar protegidas únicamente porque la interfaz `/admin` esté protegida.

Los endpoints administrativos también deben comprobar autorización.

---

# 16. 🧾 ERRORES Y FILTRACIÓN DE INFORMACIÓN

Revisar respuestas de error.

No mostrar al usuario:

```text
stack traces
SQL queries
service role keys
variables de entorno
rutas internas
información sensible de la base de datos
```

Los errores para el usuario deben ser simples.

Ejemplo:

```text
No se pudo completar la reserva.
Intentá nuevamente.
```

Mientras que los detalles técnicos deben quedar únicamente en logs controlados del servidor.

---

# 17. 🌐 HEADERS Y CONFIGURACIÓN HTTP

Revisar la configuración de seguridad HTTP apropiada para Astro/Vercel.

Comprobar, según compatibilidad con el proyecto:

- HTTPS
- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- protección contra clickjacking
- configuración adecuada de CORS

No agregar headers de forma indiscriminada si pueden romper funcionalidades existentes.

Primero verificar qué necesita realmente la aplicación.

---

# 18. 🔐 VARIABLES DE ENTORNO

Revisar:

```text
.env
.env.local
.env.production
```

y verificar:

- no subir secretos a GitHub
- no incluir secretos en el bundle
- no imprimir secretos en logs
- utilizar variables de entorno de Vercel para producción
- diferenciar variables públicas de variables privadas

Agregar `.env*` al `.gitignore` cuando corresponda, sin ignorar accidentalmente archivos de ejemplo necesarios para documentar la configuración.

Crear, si es útil:

```text
.env.example
```

con nombres pero sin secretos reales.

Ejemplo:

```env
ADMIN_USER=
ADMIN_PASSWORD=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

# 19. 🧪 CHECKLIST FINAL DE SEGURIDAD

Antes de considerar terminado el sistema, verificar:

## Admin

- [ ] `/admin` está protegido
- [ ] `/admin/*` está protegido
- [ ] APIs administrativas están protegidas
- [ ] Credenciales solamente existen en servidor
- [ ] Usuario sin autorización recibe 401/403

## Supabase

- [ ] RLS está activo donde corresponde
- [ ] Policies revisadas
- [ ] No existen policies excesivamente permisivas
- [ ] Usuarios no pueden acceder a datos ajenos
- [ ] Service role/secret key no está expuesta

## Reservas

- [ ] No se puede reservar un turno ocupado
- [ ] No se puede hacer doble reserva simultánea
- [ ] No se puede reservar en el pasado
- [ ] No se puede reservar fuera del horario
- [ ] No se puede reservar un día cerrado
- [ ] No se puede reservar un servicio inexistente
- [ ] Existe límite de reservas por teléfono
- [ ] Existe protección contra spam/rate limiting

## API

- [ ] Todas las entradas se validan en servidor
- [ ] El precio real se obtiene del servidor/DB
- [ ] No se confía en `userId`
- [ ] No se confía en `role`
- [ ] No se confía en `status`
- [ ] No se confía en datos sensibles enviados por el cliente

## Tests

- [ ] Test de acceso sin autenticación
- [ ] Test de modificación de IDs
- [ ] Test de reservas masivas
- [ ] Test de doble reserva
- [ ] Test de datos ajenos
- [ ] Test de inputs inválidos
- [ ] Test de rate limiting
- [ ] Test de fechas
- [ ] Test de manipulación de requests
- [ ] Test de endpoints administrativos

---

# 20. 📊 RESULTADO DE LA AUDITORÍA

No limitarse a decir "funciona".

Después de realizar los tests, generar un informe con:

### 🔴 CRÍTICO

Problemas que permiten:

- acceder al panel sin autorización
- acceder a datos sensibles
- modificar/eliminar datos ajenos
- obtener claves secretas
- crear reservas duplicadas

### 🟠 ALTO

Problemas como:

- ausencia de rate limiting
- posibilidad de crear demasiadas reservas
- validaciones insuficientes
- endpoints administrativos parcialmente protegidos

### 🟡 MEDIO

Problemas de:

- headers
- manejo de errores
- logging
- validaciones secundarias

### 🟢 CORRECTO

Indicar qué controles fueron probados y funcionaron correctamente.

Para cada vulnerabilidad encontrada indicar:

```text
Problema:
Severidad:
Dónde ocurre:
Cómo reproducirlo:
Comportamiento actual:
Comportamiento esperado:
Solución recomendada:
```

---

# REGLA PRINCIPAL

No asumir que una medida de seguridad protege automáticamente otras partes del sistema.

Por ejemplo:

```text
Basic Auth
     ↓
protege /admin
```

pero NO significa automáticamente:

```text
Basic Auth
     ↓
protege Supabase
     ↓
protege API pública
     ↓
evita reservas masivas
     ↓
evita doble reserva
```

Cada capa debe tener su propia protección.

La arquitectura final buscada es:

```text
                    INTERNET
                        │
                        ▼
                 ┌─────────────┐
                 │ Astro Server│
                 └──────┬──────┘
                        │
             ┌──────────┴──────────┐
             │                     │
          /admin              API pública
             │                     │
        Basic Auth            Validación
             │                Rate Limit
             │                Reglas de negocio
             │                     │
             ▼                     ▼
          ADMIN               Supabase
                                  │
                                  ▼
                               RLS + DB
                                  │
                                  ▼
                         Constraints/Transacciones
```

La prioridad es mantener la solución simple, pero hacer que las decisiones de seguridad importantes se realicen en el servidor y en PostgreSQL/Supabase, no únicamente en el frontend.