import React, { useState } from 'react';
import { actions } from 'astro:actions';
import { Calendar, Clock, User, Phone, CheckCircle, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
};

export default function BookingWidget({ services, businessPhone = '123456789' }: { services: Service[], businessPhone?: string }) {
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  // States
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
    setError(null);
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (!date) return;

    setIsLoading(true);
    setError(null);
    try {
      // Llamada a Astro Server Action
      const { data, error: actionError } = await actions.getAvailability({
        date,
        serviceId: selectedService!.id
      });

      if (actionError) {
        setError(actionError.message);
      } else if (data) {
        setAvailableSlots(data.slots || []);
        setStep(3);
      }
    } catch (err) {
      setError("Error al consultar disponibilidad.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: actionError } = await actions.bookAppointment({
        serviceId: selectedService!.id,
        date: selectedDate,
        startTime: selectedTime,
        customerName,
        customerPhone,
        customerEmail
      });

      if (actionError) {
        // Manejo específico del race condition y otros errores
        if (actionError.code === 'CONFLICT') {
           setError("Lo sentimos, este turno acaba de ser reservado por otra persona. Por favor, elige otro horario.");
           setStep(3); // Volver al selector de horas
           // Opcional: Re-fetch de la disponibilidad aquí
        } else {
           setError(actionError.message || "Ocurrió un error al agendar.");
        }
      } else if (data?.success) {
        setStep(5);
      }
    } catch (err) {
      setError("Error de red al procesar la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const text = `Hola! Acabo de hacer una reserva para ${selectedService?.name} el ${selectedDate} a las ${selectedTime}. Mi nombre es ${customerName}.`;
    const url = `https://wa.me/${businessPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Render helpers
  const goBack = () => {
    setError(null);
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
      
      {/* Header */}
      <div className="bg-indigo-600 p-6 text-white text-center relative">
        {step > 1 && step < 5 && (
          <button onClick={goBack} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <h2 className="text-2xl font-bold">Reserva tu Turno</h2>
        <p className="text-indigo-100 text-sm mt-1">Rápido y sencillo</p>
      </div>

      {/* Progress Bar */}
      <div className="flex h-1 bg-gray-100">
        <div 
          className="bg-indigo-500 transition-all duration-500 ease-out h-full" 
          style={{ width: `${(step / 5) * 100}%` }} 
        />
      </div>

      {/* Body */}
      <div className="p-6">
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* STEP 1: Services */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">¿Qué servicio buscas?</h3>
            {services.map((srv) => (
              <button
                key={srv.id}
                onClick={() => handleServiceSelect(srv)}
                className="w-full text-left p-4 border border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-900 group-hover:text-indigo-700">{srv.name}</span>
                  {srv.price > 0 && <span className="text-indigo-600 font-semibold">${srv.price}</span>}
                </div>
                <div className="flex items-center text-sm text-gray-500 gap-2">
                  <Clock size={14} /> <span>{srv.duration_minutes} min</span>
                </div>
              </button>
            ))}
            {services.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay servicios disponibles.</p>
            )}
          </div>
        )}

        {/* STEP 2: Date */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Selecciona la fecha</h3>
            <p className="text-sm text-gray-500 mb-4">Para: <span className="font-medium text-indigo-600">{selectedService?.name}</span></p>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]} // Solo fechas futuras
                value={selectedDate}
                onChange={handleDateChange}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
            </div>
            {isLoading && (
              <div className="flex items-center justify-center py-8 text-indigo-600">
                <Loader2 className="animate-spin" size={24} />
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Time */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Selecciona la hora</h3>
            <p className="text-sm text-gray-500 mb-4">Fecha: <span className="font-medium text-indigo-600">{selectedDate}</span></p>
            
            <div className="grid grid-cols-3 gap-3">
              {availableSlots.length > 0 ? (
                availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => handleTimeSelect(time)}
                    className="py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white transition-all text-center font-medium"
                  >
                    {time}
                  </button>
                ))
              ) : (
                <div className="col-span-3 text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                  No hay horarios disponibles este día.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Form */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tus Datos</h3>
            <div className="bg-indigo-50 p-4 rounded-xl flex justify-between items-center text-sm mb-6">
              <div>
                <p className="font-medium text-indigo-900">{selectedService?.name}</p>
                <p className="text-indigo-700">{selectedDate} a las {selectedTime}</p>
              </div>
              <button type="button" onClick={() => setStep(2)} className="text-indigo-600 hover:underline">Cambiar</button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Opcional)</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. juan@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. +54 9 11 1234 5678"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Procesando...
                </>
              ) : (
                'Confirmar Reserva'
              )}
            </button>
          </form>
        )}

        {/* STEP 5: Success */}
        {step === 5 && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">¡Reserva Confirmada!</h3>
            <p className="text-gray-600 mb-8">
              Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong> para tu {selectedService?.name}.
            </p>
            
            <button
              onClick={sendWhatsApp}
              className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold shadow-lg shadow-green-200 hover:bg-[#128C7E] transition-colors flex items-center justify-center gap-2"
            >
              <Phone size={20} /> Enviar WhatsApp al local
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
