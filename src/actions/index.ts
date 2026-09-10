import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { supabase } from '../lib/supabase';
import { parseISO, addMinutes, isBefore, format, getDay } from 'date-fns';

export const server = {
  getAvailability: defineAction({
    accept: 'json',
    input: z.object({
      date: z.string(), // YYYY-MM-DD
      serviceId: z.string().uuid(),
    }),
    handler: async (input) => {
      // 1. Obtener la duración del servicio
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', input.serviceId)
        .single();

      if (serviceError || !service) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Servicio no encontrado' });
      }

      const duration = service.duration_minutes;

      // 2. Obtener horario del local para ese día
      // date-fns getDay devuelve 0 (Domingo) a 6 (Sábado)
      const dayOfWeek = getDay(parseISO(input.date));
      
      const { data: hours, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .eq('is_closed', false)
        .single();

      if (hoursError || !hours) {
        return { slots: [], message: 'El local está cerrado este día.' };
      }

      // 3. Obtener turnos ya reservados para ese día
      // Todos los turnos bloquean el horario hasta que sean borrados explícitamente
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', input.date);

      if (apptError) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error consultando turnos' });
      }

      // 4. Calcular slots disponibles y ocupados
      const slots: { time: string; isAvailable: boolean }[] = [];
      let currentSlot = parseISO(`${input.date}T${hours.open_time}`);
      const closeTime = parseISO(`${input.date}T${hours.close_time}`);

      while (true) {
        const slotEnd = addMinutes(currentSlot, duration);
        if (isBefore(closeTime, slotEnd)) {
          break; // Si el turno termina después del cierre, paramos
        }

        const slotStartTimeStr = format(currentSlot, 'HH:mm:ss');
        const slotEndTimeStr = format(slotEnd, 'HH:mm:ss');

        // Verificar si se solapa con algún turno existente
        const isOverlapping = appointments.some(appt => {
          // Solapamiento: el inicio del slot es antes del fin del turno, y el fin del slot es después del inicio del turno.
          return slotStartTimeStr < appt.end_time && slotEndTimeStr > appt.start_time;
        });

        slots.push({
          time: format(currentSlot, 'HH:mm'),
          isAvailable: !isOverlapping
        });

        // Incrementamos el slot (por ejemplo, cada 30 min fijos)
        currentSlot = addMinutes(currentSlot, 30);
      }

      return { slots };
    },
  }),

  bookAppointment: defineAction({
    accept: 'json',
    input: z.object({
      serviceId: z.string().uuid(),
      customerName: z.string().min(2),
      customerPhone: z.string().min(5),
      customerEmail: z.string().email().optional(), // New field
      date: z.string(), // YYYY-MM-DD
      startTime: z.string(), // HH:mm
    }),
    handler: async (input) => {
      // 1. Obtener duración del servicio para calcular el end_time
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', input.serviceId)
        .single();

      if (!service) {
        throw new ActionError({ code: 'NOT_FOUND', message: 'Servicio inválido' });
      }

      // Convertir startTime (HH:mm) a DateTime dummy para sumar minutos
      const dummyDate = parseISO(`1970-01-01T${input.startTime}:00`);
      const endTimeDate = addMinutes(dummyDate, service.duration_minutes);
      const endTime = format(endTimeDate, 'HH:mm:ss');
      const startTimeFormatted = `${input.startTime}:00`; // Supabase necesita HH:mm:ss

      // 1.5 Protección Anti-Spam (Reservas Masivas)
      // Buscar las reservas futuras (o de hoy en adelante) asociadas a este teléfono
      const today = new Date().toISOString().split('T')[0];
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('appointment_date')
        .eq('customer_phone', input.customerPhone)
        .neq('status', 'cancelled')
        .gte('appointment_date', today);

      if (checkError) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error validando seguridad de la reserva.' });
      }

      // Regla 1: Máximo 2 reservas pendientes en total
      if (existingAppointments && existingAppointments.length >= 2) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'Has alcanzado el límite máximo de 2 reservas pendientes con este número de teléfono.' });
      }

      // Regla 2: Máximo 1 reserva por día
      const hasReservationOnSameDay = existingAppointments?.some(appt => appt.appointment_date === input.date);
      if (hasReservationOnSameDay) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'Ya tienes un turno reservado para este día. Por favor, elige otra fecha.' });
      }

      // 2. Intentar guardar en Supabase.
      // Gracias al Constraint EXCLUDE en la BD, si alguien más ganó el turno, esto fallará matemáticamente.
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          service_id: input.serviceId,
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          customer_email: input.customerEmail,
          appointment_date: input.date,
          start_time: startTimeFormatted,
          end_time: endTime,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) {
        console.error('Error insertando turno:', error);
        // Podríamos revisar el código de error de Postgres para ser más específicos
        // 23P01 es Exclusion violation
        if (error.code === '23P01') {
          throw new ActionError({ code: 'CONFLICT', message: 'Lo sentimos, este turno acaba de ser reservado por otra persona.' });
        }
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo agendar el turno.' });
      }

      return { success: true, appointment: data };
    }
  }),

  // ADMIN ACTIONS
  getAppointments: defineAction({
    accept: 'json',
    handler: async () => {
      // In a real app, verify admin session here
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          appointment_date,
          start_time,
          status,
          services ( name )
        `)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error fetching appointments' });
      }
      return { appointments: data };
    }
  }),

  updateAppointmentStatus: defineAction({
    accept: 'json',
    input: z.object({
      appointmentId: z.string().uuid(),
      status: z.enum(['confirmed', 'cancelled', 'completed'])
    }),
    handler: async (input) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: input.status })
        .eq('id', input.appointmentId);

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error updating status' });
      }
      return { success: true };
    }
  }),

  deleteAppointment: defineAction({
    accept: 'json',
    input: z.object({
      appointmentId: z.string().uuid()
    }),
    handler: async (input) => {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', input.appointmentId);

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error deleting appointment' });
      }
      return { success: true };
    }
  }),

  // SERVICES ACTIONS
  getAdminServices: defineAction({
    accept: 'json',
    handler: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error fetching services' });
      }
      return { services: data };
    }
  }),

  upsertService: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(2),
      duration_minutes: z.number().min(5),
      price: z.number().min(0).optional(),
      is_active: z.boolean().default(true)
    }),
    handler: async (input) => {
      const { id, ...serviceData } = input;
      let query = supabase.from('services');
      
      let result;
      if (id) {
        result = await query.update(serviceData).eq('id', id).select().single();
      } else {
        result = await query.insert([serviceData]).select().single();
      }

      if (result.error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error saving service' });
      }
      return { success: true, service: result.data };
    }
  }),

  toggleServiceStatus: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().uuid(),
      is_active: z.boolean()
    }),
    handler: async (input) => {
      const { error } = await supabase
        .from('services')
        .update({ is_active: input.is_active })
        .eq('id', input.id);

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error toggling service' });
      }
      return { success: true };
    }
  }),

  // BUSINESS HOURS ACTIONS
  getAdminBusinessHours: defineAction({
    accept: 'json',
    handler: async () => {
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error fetching business hours' });
      }
      return { businessHours: data };
    }
  }),

  upsertBusinessHour: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().uuid().optional(),
      day_of_week: z.number().min(0).max(6),
      open_time: z.string(),
      close_time: z.string(),
      is_closed: z.boolean().default(false)
    }),
    handler: async (input) => {
      const { id, ...hourData } = input;
      let query = supabase.from('business_hours');
      
      let result;
      // Also prevent duplicate days by checking day_of_week if it's a new insert
      if (id) {
        result = await query.update(hourData).eq('id', id).select().single();
      } else {
        // Simple upsert based on day_of_week (requires unique constraint in DB, but we just insert for now)
        // We'll just delete existing for that day to be safe, then insert
        await supabase.from('business_hours').delete().eq('day_of_week', hourData.day_of_week);
        result = await query.insert([hourData]).select().single();
      }

      if (result.error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error saving business hour' });
      }
      return { success: true, businessHour: result.data };
    }
  }),

  deleteBusinessHour: defineAction({
    accept: 'json',
    input: z.object({
      id: z.string().uuid()
    }),
    handler: async (input) => {
      const { error } = await supabase
        .from('business_hours')
        .delete()
        .eq('id', input.id);

      if (error) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error deleting business hour' });
      }
      return { success: true };
    }
  })
};
