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
      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('appointment_date', input.date)
        .neq('status', 'cancelled');

      if (apptError) {
        throw new ActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Error consultando turnos' });
      }

      // 4. Calcular slots disponibles (intervalos de 30 min por defecto, o según servicio)
      const slots: string[] = [];
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

        if (!isOverlapping) {
          slots.push(format(currentSlot, 'HH:mm')); // Devolvemos formato amigable
        }

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
  })
};
