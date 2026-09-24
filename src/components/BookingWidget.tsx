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
  const [availableSlots, setAvailableSlots] = useState<{time: string; isAvailable: boolean}[]>([]);
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

  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [bookingStatus, setBookingStatus] = useState<string>('confirmed');

  const businessAlias = 'reservaseasy.mp';
  const businessCbu = '00000031000123456789';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAlias(true);
    setTimeout(() => setCopiedAlias(false), 2500);
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
        customerEmail,
        paymentMethod
      });

      if (actionError) {
        if (actionError.code === 'CONFLICT') {
           setError("Lo sentimos, este turno acaba de ser reservado por otra persona. Por favor, elige otro horario.");
           setStep(3);
        } else {
           setError(actionError.message || "Ocurrió un error al agendar.");
        }
      } else if (data?.success) {
        setBookingStatus(data.status || 'confirmed');
        setStep(5);
      }
    } catch (err) {
      setError("Error de red al procesar la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendWhatsApp = () => {
    const isPendingTransfer = bookingStatus === 'pending_transfer';
    const text = isPendingTransfer
      ? `Hola! Acabo de hacer una pre-reserva para ${selectedService?.name} el ${selectedDate} a las ${selectedTime}. Adjunto el comprobante de transferencia. Mi nombre es ${customerName}.`
      : `Hola! Acabo de hacer una reserva para ${selectedService?.name} el ${selectedDate} a las ${selectedTime}. Mi nombre es ${customerName}.`;
    
    const url = `https://wa.me/${businessPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 transition-all duration-300">
      
      {/* Header */}
      <div className="bg-indigo-600 p-6 text-white text-center relative">
        {step > 1 && step < 5 && (
          <button onClick={() => setStep(step - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
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
          <div className="mb-6 p-4 bg-rose-50/90 backdrop-blur-sm border border-rose-200/80 rounded-2xl flex items-start gap-3.5 text-rose-800 text-sm shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="p-1.5 bg-rose-100 rounded-xl text-rose-600 shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-rose-900 mb-0.5">Atención</p>
              <p className="text-rose-700 leading-relaxed text-xs sm:text-sm">{error}</p>
            </div>
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
                className="w-full text-left p-4 border border-gray-200 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50/60 hover:shadow-sm transition-all group"
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

        {/* STEP 2: Date Selector */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/60 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500 block mb-0.5">Servicio seleccionado</span>
                <h4 className="text-base font-bold text-gray-900">{selectedService?.name}</h4>
              </div>
              <span className="px-3 py-1 bg-white text-indigo-700 font-bold text-xs rounded-full shadow-sm border border-indigo-100/80">
                ⏱️ {selectedService?.duration_minutes} min
              </span>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Selecciona la fecha de tu turno</label>
              <div className="relative group">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 transition-transform group-focus-within:scale-110" size={20} />
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50/70 hover:bg-white border border-gray-200 focus:border-indigo-500 focus:bg-white rounded-2xl text-gray-800 font-medium focus:ring-4 focus:ring-indigo-500/15 outline-none transition-all shadow-sm cursor-pointer disabled:opacity-50"
                />
              </div>
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-6 text-indigo-600 gap-2 animate-in fade-in">
                <Loader2 className="animate-spin text-indigo-600" size={28} />
                <span className="text-xs font-semibold text-indigo-600 animate-pulse">Buscando horarios disponibles...</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Time */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Selecciona la hora</h3>
            <p className="text-sm text-gray-500 mb-4">Fecha: <span className="font-medium text-indigo-600">{selectedDate}</span></p>
            
            {/* LEYENDA */}
            {availableSlots.length > 0 && (
              <div className="flex items-center gap-4 text-xs font-medium text-gray-600 mb-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-[4px] bg-white border border-gray-300"></div>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-[4px] bg-blue-600"></div>
                  <span className="text-gray-700">Ocupado</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    onClick={() => slot.isAvailable && handleTimeSelect(slot.time)}
                    disabled={!slot.isAvailable}
                    className={`py-2.5 px-4 rounded-xl border transition-all text-center font-medium ${
                      slot.isAvailable 
                        ? 'bg-white text-black border-gray-300 hover:border-indigo-600 hover:bg-indigo-600 hover:text-white shadow-sm' 
                        : 'bg-blue-600 text-white border-blue-600 opacity-90 cursor-not-allowed'
                    }`}
                  >
                    {slot.time}
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

        {/* STEP 4: Form & Payment Option */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tus Datos y Pago</h3>
            <div className="bg-indigo-50/80 p-4 rounded-2xl flex justify-between items-center text-sm mb-4 border border-indigo-100">
              <div>
                <p className="font-bold text-indigo-900">{selectedService?.name}</p>
                <p className="text-indigo-700 font-medium text-xs mt-0.5">{selectedDate} a las {selectedTime} hs</p>
              </div>
              <button type="button" onClick={() => setStep(2)} className="text-indigo-600 font-semibold text-xs hover:underline">Cambiar</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ej. +54 9 11 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email (para enviar comprobante)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    placeholder="Ej. juan@correo.com"
                  />
                </div>
              </div>
            </div>

            {/* SELECCIÓN DE MÉTODO DE PAGO */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">Método de Pago / Reserva</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('transfer')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'transfer'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                      : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-sm">🏦 Transferencia</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Alias / CBU</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold ring-2 ring-indigo-500/20'
                      : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-white'
                  }`}
                >
                  <div className="font-bold text-sm">💵 En el Local</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Paga al asistir</div>
                </button>
              </div>
            </div>

            {/* TARJETA DE DATOS DE TRANSFERENCIA */}
            {paymentMethod === 'transfer' && (
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-xs space-y-2.5 animate-in fade-in duration-300">
                <div className="flex justify-between items-center font-bold text-amber-950">
                  <span>Datos para transferir la seña:</span>
                  <span className="bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-mono font-bold">15 min gratis</span>
                </div>
                <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-200/60 font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-sans font-semibold">Alias MercadoPago</span>
                    <span className="font-bold text-sm text-gray-900">{businessAlias}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(businessAlias)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-sans font-semibold text-xs hover:bg-indigo-700 transition-colors"
                  >
                    {copiedAlias ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  ⏱️ Tienes <strong>30 minutos</strong> para enviar el comprobante por WhatsApp antes de que el turno se libere automáticamente.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-base shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Procesando...
                </>
              ) : paymentMethod === 'transfer' ? (
                'Pre-reservar y obtener datos de pago'
              ) : (
                'Confirmar Reserva'
              )}
            </button>
          </form>
        )}

        {/* STEP 5: Success / WhatsApp Redirect */}
        {step === 5 && (
          <div className="text-center py-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-sm">
              <CheckCircle size={40} />
            </div>
            
            {bookingStatus === 'pending_transfer' ? (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Pre-Reserva Registrada!</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Guardamos tu turno para el <strong>{selectedDate}</strong> a las <strong>{selectedTime} hs</strong>.
                </p>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-900 mb-6 space-y-2">
                  <p className="font-bold">⚠️ Pasos finales para confirmar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800">
                    <li>Transfiere la seña al Alias: <strong className="font-mono bg-amber-100 px-1 rounded">{businessAlias}</strong></li>
                    <li>Presiona el botón verde de abajo para enviar el comprobante por WhatsApp.</li>
                    <li>Tienes <strong>30 minutos</strong> antes de que expire la pre-reserva.</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Reserva Confirmada!</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime} hs</strong> para tu {selectedService?.name}.
                </p>
              </>
            )}
            
            <button
              onClick={sendWhatsApp}
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-bold shadow-lg shadow-green-200 hover:bg-[#128C7E] transition-all flex items-center justify-center gap-2 text-base active:scale-98"
            >
              <Phone size={20} /> 
              {bookingStatus === 'pending_transfer' ? 'Enviar Comprobante por WhatsApp' : 'Enviar WhatsApp al local'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
