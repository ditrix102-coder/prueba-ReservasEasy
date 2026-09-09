import React, { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import { Plus, Edit2, Trash2, XCircle, RefreshCw, Loader2, Clock, CalendarDays } from 'lucide-react';

type BusinessHour = {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
};

const DAYS_OF_WEEK = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export default function BusinessHoursTab() {
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHour, setEditingHour] = useState<Partial<BusinessHour> | null>(null);

  const fetchHours = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: actionError } = await actions.getAdminBusinessHours();
      if (actionError) {
        setError(actionError.message);
      } else if (data) {
        setHours(data.businessHours as BusinessHour[]);
      }
    } catch (err) {
      setError("Error de red al cargar los horarios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHours();
  }, []);

  const handleSaveHour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingHour?.day_of_week === undefined) return;

    setIsSaving(true);
    try {
      const { data, error: actionError } = await actions.upsertBusinessHour({
        id: editingHour.id,
        day_of_week: editingHour.day_of_week,
        open_time: editingHour.open_time || '09:00:00',
        close_time: editingHour.close_time || '18:00:00',
        is_closed: editingHour.is_closed ?? false
      });

      if (actionError) {
        alert("Error: " + actionError.message);
      } else if (data?.businessHour) {
        // Recargar la lista completa para evitar duplicados en la UI por reemplazos
        fetchHours();
        setEditingHour(null);
      }
    } catch (err) {
      alert("Error al guardar el horario.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHour = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este horario? El negocio aparecerá cerrado ese día.')) return;
    
    try {
      const { error: actionError } = await actions.deleteBusinessHour({ id });
      if (actionError) {
        alert("Error: " + actionError.message);
      } else {
        setHours(prev => prev.filter(h => h.id !== id));
      }
    } catch (err) {
      alert("Error al eliminar.");
    }
  };

  // Convert "09:00:00" to "09:00"
  const formatTime = (time: string) => time.substring(0, 5);

  // Available days to add (days not currently in the DB)
  const availableDays = DAYS_OF_WEEK.map((name, index) => ({ name, index }))
    .filter(d => !hours.some(h => h.day_of_week === d.index));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Horarios de Atención</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchHours} 
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button 
            onClick={() => setEditingHour({ day_of_week: availableDays.length > 0 ? availableDays[0].index : 0, open_time: '09:00', close_time: '18:00', is_closed: false })}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Agregar Día
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {editingHour && (
        <div className="mb-8 bg-white p-5 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingHour.id ? 'Editar Horario' : 'Configurar Día de Trabajo'}
            </h3>
            <button onClick={() => setEditingHour(null)} className="text-gray-400 hover:text-gray-600">
              <XCircle size={20} />
            </button>
          </div>
          <form onSubmit={handleSaveHour} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Día de la semana *</label>
              <select
                required
                disabled={!!editingHour.id} // Don't allow changing day if editing
                value={editingHour.day_of_week}
                onChange={e => setEditingHour({...editingHour, day_of_week: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-gray-100"
              >
                {DAYS_OF_WEEK.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Hora de Apertura *</label>
              <input
                type="time"
                required
                value={editingHour.open_time?.substring(0,5) || '09:00'}
                onChange={e => setEditingHour({...editingHour, open_time: e.target.value + ':00'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Hora de Cierre *</label>
              <input
                type="time"
                required
                value={editingHour.close_time?.substring(0,5) || '18:00'}
                onChange={e => setEditingHour({...editingHour, close_time: e.target.value + ':00'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex items-center h-[42px]">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
            <Loader2 className="animate-spin mb-4" size={32} />
          </div>
        ) : hours.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No tienes días de trabajo configurados. Tu negocio aparecerá como cerrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="p-4">Día</th>
                  <th className="p-4">Apertura</th>
                  <th className="p-4">Cierre</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {hours.map((hour) => (
                  <tr key={hour.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 font-medium text-gray-900">
                        <CalendarDays size={16} className="text-indigo-500" />
                        {DAYS_OF_WEEK[hour.day_of_week]}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> {formatTime(hour.open_time)} hs</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> {formatTime(hour.close_time)} hs</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingHour(hour)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteHour(hour.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar Día"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
