import React, { useState } from 'react';
import { Calendar, Scissors, Clock } from 'lucide-react';
import AppointmentsTab from './admin/AppointmentsTab';
import ServicesTab from './admin/ServicesTab';
import BusinessHoursTab from './admin/BusinessHoursTab';

type Tab = 'appointments' | 'services' | 'hours';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('appointments');

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
        <p className="text-gray-500 mt-1">Gestiona tu negocio desde un solo lugar.</p>
      </div>

      <div className="mb-8 bg-white p-2 rounded-xl shadow-sm border border-gray-200 inline-flex space-x-2 overflow-x-auto w-full md:w-auto">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'appointments'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Calendar size={18} />
          Turnos
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'services'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Scissors size={18} />
          Servicios
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'hours'
              ? 'bg-indigo-50 text-indigo-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Clock size={18} />
          Horarios
        </button>
      </div>

      <div className="transition-all duration-300 ease-in-out">
        {activeTab === 'appointments' && <AppointmentsTab />}
        {activeTab === 'services' && <ServicesTab />}
        {activeTab === 'hours' && <BusinessHoursTab />}
      </div>
    </div>
  );
}
