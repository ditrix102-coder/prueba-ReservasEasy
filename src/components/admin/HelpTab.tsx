import React from 'react';
import { Calendar, Scissors, Clock, Info, CheckCircle, XCircle, Trash2, ShieldCheck, AlertTriangle, PlayCircle } from 'lucide-react';

export default function HelpTab() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Guía del Sistema</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manual de uso rápido para administrar ReservasEasy.
          </p>
        </div>
      </div>

      {/* Banner de Video Tutorial */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-indigo-900 font-bold text-lg mb-1 flex items-center gap-2">
            <PlayCircle size={20} className="text-indigo-600" />
            ¿Prefieres un tutorial en video?
          </h3>
          <p className="text-indigo-700 text-sm">
            Mira nuestra guía en video donde te explicamos paso a paso cómo configurar y sacar el máximo provecho de tu sistema de reservas.
          </p>
        </div>
        <a 
          href="#" 
          target="_blank" 
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <PlayCircle size={18} />
          Ver Video Explicativo
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Gestión de Turnos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Calendar size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">1. Gestión de Turnos</h3>
          </div>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            Desde la pestaña <strong>Turnos</strong> puedes ver la agenda separada por días. Cuando un cliente hace una reserva desde la web pública, el turno aparecerá aquí.
          </p>
          
          <div className="space-y-3 mt-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <h4 className="font-semibold text-sm text-gray-700">Estados de un turno:</h4>
            
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-semibold uppercase shrink-0 mt-0.5">Reserva</span>
              <p className="text-sm text-gray-600">El turno está agendado y el horario bloqueado en la web para que nadie más lo reserve.</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold uppercase shrink-0 mt-0.5">Terminado</span>
              <p className="text-sm text-gray-600">El cliente asistió. (Sigue bloqueando el horario para que el historial sea exacto).</p>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold uppercase shrink-0 mt-0.5">Cancelado</span>
              <p className="text-sm text-gray-600">El turno se canceló pero <strong>sigue bloqueando el horario</strong> temporalmente por precaución.</p>
            </div>

            <div className="pt-2 border-t border-gray-200 flex items-start gap-3">
              <div className="text-red-500 shrink-0 mt-0.5"><Trash2 size={16}/></div>
              <p className="text-sm text-gray-600">
                <strong>Botón Borrar:</strong> Borra el turno definitivamente. <span className="font-semibold">¡Es la única forma de volver a liberar el horario en la web pública!</span>
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Servicios */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Scissors size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">2. Servicios</h3>
          </div>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            Aquí configuras lo que ofreces (Cortes, Barbería, Tintes, etc.). 
          </p>
          
          <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800 mb-4 flex gap-3">
            <AlertTriangle className="shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Cuidado con la Duración</p>
              <p>El sistema usa los minutos de duración para calcular cuántos turnos entran en un día. Si pones 30 min, el sistema armará bloques automáticos de 30 minutos.</p>
            </div>
          </div>

          <ul className="text-sm text-gray-600 space-y-2 list-disc ml-4">
            <li>Puedes editar los precios y nombres en cualquier momento.</li>
            <li>Si un servicio deja de estar disponible (ej. falta personal), puedes "apagarlo" con el interruptor en lugar de borrarlo. Así no pierdes el historial.</li>
          </ul>
        </div>

        {/* Card 3: Horarios */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Clock size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">3. Horarios de Atención</h3>
          </div>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            Define qué días a la semana abres el local y en qué horario.
          </p>
          <ul className="text-sm text-gray-600 space-y-3">
            <li className="flex gap-2">
              <CheckCircle className="text-green-500 shrink-0" size={18} />
              <span>Asegúrate de que la <strong>Hora de Apertura</strong> y <strong>Cierre</strong> sean exactas. El sistema no ofrecerá turnos si el tiempo del servicio supera la hora de cierre.</span>
            </li>
            <li className="flex gap-2">
              <XCircle className="text-red-500 shrink-0" size={18} />
              <span>Puedes marcar días como <strong>"Cerrado"</strong> (ej. Domingos o feriados regulares). Los clientes no podrán seleccionar esos días en el calendario.</span>
            </li>
          </ul>
        </div>

        {/* Card 4: Seguridad y Anti-Spam */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">4. Seguridad Integrada</h3>
          </div>
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            Tu sistema cuenta con protecciones automáticas que no necesitas configurar:
          </p>
          <ul className="text-sm text-gray-600 space-y-2 list-disc ml-4">
            <li><strong>Anti-Spam:</strong> Una persona solo puede agendar un máximo de 1 turno por día y un máximo total de 2 turnos pendientes a la vez (reconocidos por su número telefónico).</li>
            <li><strong>Doble Reserva:</strong> Si dos personas intentan reservar exactamente a la misma hora, en el mismo milisegundo, la base de datos bloqueará a uno y le pedirá que elija otro horario.</li>
            <li><strong>Sanitización:</strong> Se bloquean intentos de ingresar código en los nombres para evitar hackeos a tu base de datos.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
