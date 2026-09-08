import React, { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';

type Appointment = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  appointment_date: string;
  start_time: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  services: { name: string } | null;
};

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: actionError } = await actions.getAppointments();
      if (actionError) {
        setError(actionError.message);
      } else if (data) {
        setAppointments(data.appointments as Appointment[]);
      }
    } catch (err) {
      setError("Error de red al cargar los turnos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = async (id: string, newStatus: 'confirmed' | 'cancelled' | 'completed') => {
    setIsUpdating(id);
    try {
      const { error: actionError } = await actions.updateAppointmentStatus({
        appointmentId: id,
        status: newStatus
      });
      if (actionError) {
        alert("Error: " + actionError.message);
      } else {
        // Actualizar el estado local sin recargar
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      }
    } catch (err) {
      alert("Error al actualizar el turno.");
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wider">Confirmado</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelado</span>;
      case 'completed': return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold uppercase tracking-wider">Completado</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 mt-1">Gestiona los turnos y reservas de tus clientes.</p>
        </div>
        <button 
          onClick={fetchAppointments} 
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-gray-500 font-medium">Cargando turnos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No hay turnos registrados en la base de datos.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="p-4 whitespace-nowrap">Fecha y Hora</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className={`hover:bg-gray-50/50 transition-colors ${appt.status === 'cancelled' ? 'opacity-50' : ''}`}>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                          <Calendar size={14} className="text-indigo-500" />
                          {format(parseISO(appt.appointment_date), 'dd/MM/yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                          <Clock size={14} />
                          {appt.start_time.substring(0, 5)} hs
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-gray-900 font-medium">
                          <User size={14} className="text-gray-400" />
                          {appt.customer_name}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Phone size={12}/> {appt.customer_phone}</span>
                          {appt.customer_email && (
                            <span className="flex items-center gap-1"><Mail size={12}/> {appt.customer_email}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700 font-medium">
                      {appt.services?.name || 'Desconocido'}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(appt.status)}
                    </td>
                    <td className="p-4 text-right">
                      {isUpdating === appt.id ? (
                        <Loader2 className="animate-spin text-indigo-600 ml-auto" size={20} />
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {appt.status !== 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'confirmed')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Confirmar"
                            >
                              <CheckCircle size={20} />
                            </button>
                          )}
                          {appt.status !== 'cancelled' && (
                            <button
                              onClick={() => handleStatusChange(appt.id, 'cancelled')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancelar Turno"
                            >
                              <XCircle size={20} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
