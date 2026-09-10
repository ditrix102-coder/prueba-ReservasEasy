import React, { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, RefreshCw, Loader2, Trash2, CheckSquare } from 'lucide-react';

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

export default function AppointmentsTab() {
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
        setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
      }
    } catch (err) {
      alert("Error al actualizar el turno.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas borrar este turno? El horario volverá a estar disponible para el público.")) return;
    setIsUpdating(id);
    try {
      const { error: actionError } = await actions.deleteAppointment({
        appointmentId: id
      });
      if (actionError) {
        alert("Error: " + actionError.message);
      } else {
        setAppointments(prev => prev.filter(app => app.id !== id));
      }
    } catch (err) {
      alert("Error al borrar el turno.");
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase tracking-wider">Reserva</span>;
      case 'cancelled': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelado</span>;
      case 'completed': return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold uppercase tracking-wider">Terminado</span>;
      default: return null;
    }
  };

  // Agrupar turnos por fecha
  const groupedAppointments = appointments.reduce((groups, appt) => {
    const date = appt.appointment_date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appt);
    return groups;
  }, {} as Record<string, Appointment[]>);

  const sortedDates = Object.keys(groupedAppointments).sort();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Próximos Turnos</h2>
        <button 
          onClick={fetchAppointments} 
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      <div>
        {isLoading && appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col items-center justify-center py-20 text-indigo-600">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p className="text-gray-500 font-medium">Cargando turnos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-center py-20 text-gray-500">
            No hay turnos registrados en la base de datos.
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {sortedDates.map(dateStr => {
              const dateObj = parseISO(dateStr);
              const formattedDate = format(dateObj, "EEEE d 'de' MMMM yyyy", { locale: es });
              const dateGroup = groupedAppointments[dateStr];

              return (
                <div key={dateStr} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-indigo-50/50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
                    <Calendar className="text-indigo-600" size={20} />
                    <h3 className="font-bold text-indigo-900 capitalize text-lg">{formattedDate}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-gray-100 text-sm font-semibold text-gray-500">
                          <th className="p-4 whitespace-nowrap w-24">Hora</th>
                          <th className="p-4">Cliente</th>
                          <th className="p-4">Servicio</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dateGroup.map((appt) => (
                          <tr key={appt.id} className={`hover:bg-gray-50/50 transition-colors ${appt.status === 'cancelled' ? 'bg-red-50/30' : ''}`}>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 text-gray-900 font-semibold">
                                <Clock size={16} className="text-indigo-500" />
                                {appt.start_time.substring(0, 5)} hs
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
                                <div className="flex items-center justify-end gap-1">
                                  {appt.status !== 'confirmed' && (
                                    <button
                                      onClick={() => handleStatusChange(appt.id, 'confirmed')}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Marcar como Reserva"
                                    >
                                      <CheckCircle size={18} />
                                    </button>
                                  )}
                                  {appt.status !== 'completed' && (
                                    <button
                                      onClick={() => handleStatusChange(appt.id, 'completed')}
                                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                      title="Marcar como Terminado"
                                    >
                                      <CheckSquare size={18} />
                                    </button>
                                  )}
                                  {appt.status !== 'cancelled' && (
                                    <button
                                      onClick={() => handleStatusChange(appt.id, 'cancelled')}
                                      className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                      title="Marcar como Cancelado"
                                    >
                                      <XCircle size={18} />
                                    </button>
                                  )}
                                  <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                  <button
                                    onClick={() => handleDelete(appt.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Borrar Definitivamente"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
