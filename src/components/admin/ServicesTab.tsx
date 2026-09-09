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

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error: actionError } = await actions.toggleServiceStatus({
        id,
        is_active: !currentStatus
      });
      if (actionError) {
        alert("Error: " + actionError.message);
      } else {
        setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
      }
    } catch (err) {
      alert("Error al cambiar estado del servicio.");
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.name || !editingService?.duration_minutes) return;

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
        alert("Error: " + actionError.message);
      } else if (data?.service) {
        if (editingService.id) {
          setServices(prev => prev.map(s => s.id === editingService.id ? data.service as Service : s));
        } else {
          setServices(prev => [...prev, data.service as Service].sort((a, b) => a.name.localeCompare(b.name)));
        }
        setEditingService(null);
      }
    } catch (err) {
      alert("Error al guardar el servicio.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Tus Servicios</h2>
        <div className="flex gap-2">
          <button 
            onClick={fetchServices} 
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Actualizar
          </button>
          <button 
            onClick={() => setEditingService({ name: '', duration_minutes: 30, is_active: true })}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {editingService && (
        <div className="mb-8 bg-white p-5 rounded-2xl shadow-sm border border-indigo-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingService.id ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
            </h3>
            <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-gray-600">
              <XCircle size={20} />
            </button>
          </div>
          <form onSubmit={handleSaveService} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nombre del Servicio *</label>
              <input
                type="text"
                required
                value={editingService.name || ''}
                onChange={e => setEditingService({...editingService, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Ej: Corte de Pelo"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Duración (minutos) *</label>
              <input
                type="number"
                required
                min="5"
                step="5"
                value={editingService.duration_minutes || ''}
                onChange={e => setEditingService({...editingService, duration_minutes: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Precio (Opcional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={editingService.price || ''}
                onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Ej: 15.00"
              />
            </div>
            <div className="flex items-end justify-end mt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full md:w-auto px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
