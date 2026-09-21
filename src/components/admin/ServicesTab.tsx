import React, { useEffect, useState } from 'react';
import { actions } from 'astro:actions';
import { Plus, Edit2, CheckCircle2, XCircle, Power, RefreshCw, Loader2, DollarSign, Clock } from 'lucide-react';

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
};

export default function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: actionError } = await actions.getAdminServices();
      if (actionError) {
        setError(actionError.message);
      } else if (data) {
        setServices(data.services as Service[]);
      }
    } catch (err) {
      setError("Error de red al cargar los servicios.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const [notification, setNotification] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error: actionError } = await actions.toggleServiceStatus({
        id,
        is_active: !currentStatus
      });
      if (actionError) {
        showNotification('error', "Error: " + actionError.message);
      } else {
        setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
        showNotification('success', "Estado del servicio actualizado");
      }
    } catch (err) {
      showNotification('error', "Error al cambiar estado del servicio.");
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name || !editingService?.duration_minutes) return;

    if (editingService.duration_minutes < 5) {
      showNotification('error', "La duración mínima permitida es de 5 minutos.");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error: actionError } = await actions.upsertService({
        id: editingService.id,
        name: editingService.name,
        duration_minutes: Number(editingService.duration_minutes),
        price: editingService.price ? Number(editingService.price) : undefined,
        is_active: editingService.is_active ?? true
      });

      if (actionError) {
        showNotification('error', "Error: " + actionError.message);
      } else if (data?.service) {
        if (editingService.id) {
          setServices(prev => prev.map(s => s.id === editingService.id ? data.service as Service : s));
          showNotification('success', "Servicio modificado con éxito");
        } else {
          setServices(prev => [...prev, data.service as Service].sort((a, b) => a.name.localeCompare(b.name)));
          showNotification('success', "Nuevo servicio guardado correctamente");
        }
        setEditingService(null);
      }
    } catch (err) {
      showNotification('error', "Error al guardar el servicio.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
          notification.type === 'error'
            ? 'bg-rose-900/90 text-white border-rose-700/50 shadow-rose-900/20'
            : 'bg-emerald-900/90 text-white border-emerald-700/50 shadow-emerald-900/20'
        }`}>
          <div className={`p-1.5 rounded-xl ${notification.type === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
            {notification.type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
          </div>
          <span className="text-sm font-medium pr-2">{notification.text}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Tus Servicios</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchServices} 
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin text-indigo-600" : ""} />
            Actualizar
          </button>
          <button 
            onClick={() => setEditingService({ name: '', duration_minutes: 30, is_active: true })}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-medium shadow-sm hover:shadow-md"
          >
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200/80 font-medium text-sm flex items-center gap-2 shadow-sm">
          <XCircle size={18} /> {error}
        </div>
      )}

      {editingService && (
        <div className="mb-8 bg-white p-6 rounded-3xl shadow-lg border border-indigo-100/80 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              {editingService.id ? '✏️ Editar Servicio' : '✨ Crear Nuevo Servicio'}
            </h3>
            <button onClick={() => setEditingService(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
              <XCircle size={20} />
            </button>
          </div>
          <form onSubmit={handleSaveService} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Nombre del Servicio *</label>
                <input
                  type="text"
                  required
                  value={editingService.name || ''}
                  onChange={e => setEditingService({...editingService, name: e.target.value})}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="Ej: Corte + Barba"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Duración (minutos) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={editingService.duration_minutes ?? ''}
                  onChange={e => setEditingService({...editingService, duration_minutes: parseInt(e.target.value) || 0})}
                  className={`w-full px-3.5 py-2.5 bg-gray-50/50 border rounded-xl focus:ring-2 outline-none transition-all text-sm font-medium ${
                    editingService.duration_minutes && editingService.duration_minutes < 5
                      ? 'border-amber-400 bg-amber-50/30 focus:ring-amber-400 text-amber-900'
                      : 'border-gray-200 focus:ring-indigo-500 focus:bg-white'
                  }`}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Precio ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editingService.price || ''}
                  onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                  className="w-full px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-sm"
                  placeholder="Ej: 15.00"
                />
              </div>
            </div>

            {/* Warning de duración mínima (< 5 min) con animación suave */}
            {editingService.duration_minutes !== undefined && editingService.duration_minutes < 5 && (
              <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-center gap-2.5 text-amber-800 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300">
                <span className="text-base">⚠️</span>
                <span>
                  <strong>Nota:</strong> Para garantizar un cálculo fluido de la agenda y evitar colapsos, la duración mínima recomendada es de <strong>5 minutos</strong>.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Guardando...' : 'Guardar Servicio'}
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
        ) : services.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            No hay servicios configurados. ¡Agrega el primero!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600">
                  <th className="p-4">Servicio</th>
                  <th className="p-4">Duración</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((service) => (
                  <tr key={service.id} className={`hover:bg-gray-50/50 transition-colors ${!service.is_active ? 'opacity-60 bg-gray-50' : ''}`}>
                    <td className="p-4">
                      <span className="font-medium text-gray-900">{service.name}</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="flex items-center gap-1.5"><Clock size={14} className="text-gray-400"/> {service.duration_minutes} min</span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {service.price ? (
                        <span className="flex items-center gap-1"><DollarSign size={14} className="text-gray-400"/> {service.price}</span>
                      ) : '-'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleStatus(service.id, service.is_active)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors ${
                          service.is_active 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        <Power size={12} />
                        {service.is_active ? 'Activo' : 'Pausado'}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setEditingService(service)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
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
