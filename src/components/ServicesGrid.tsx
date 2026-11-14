import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Sprout,
  Droplet,
  CloudRain,
  Truck,
  Sparkles,
  Route,
  LampCeiling,
  Waves,
  Trees,
  Zap,
  Trash2,
  Volume2,
} from 'lucide-react';

interface DepartmentService {
  name: string;
  hi: string;
  icon: React.ReactNode;
  color: string;
  route: string;
}

const DEPARTMENTS: DepartmentService[] = [
  {
    name: 'Green City',
    hi: 'हरित शहर',
    icon: <Sprout className="w-6 h-6" />,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    route: '/department/green',
  },
  {
    name: 'Water',
    hi: 'पेयजल',
    icon: <Droplet className="w-6 h-6" />,
    color: 'bg-sky-50 text-sky-600 border-sky-100',
    route: '/complaint/new?dept=water',
  },
  {
    name: 'Rain Water',
    hi: 'वर्षा जल',
    icon: <CloudRain className="w-6 h-6" />,
    color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    route: '/complaint/new?dept=rainwater',
  },
  {
    name: 'C&D Waste',
    hi: 'मलबा निस्तारण',
    icon: <Truck className="w-6 h-6" />,
    color: 'bg-orange-50 text-orange-600 border-orange-100',
    route: '/complaint/new?dept=cnd',
  },
  {
    name: 'Cleanliness',
    hi: 'स्वच्छता',
    icon: <Sparkles className="w-6 h-6" />,
    color: 'bg-teal-50 text-teal-600 border-teal-100',
    route: '/complaint/new?dept=clean',
  },
  {
    name: 'Roads',
    hi: 'सड़कें',
    icon: <Route className="w-6 h-6" />,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    route: '/complaint/new?dept=roads',
  },
  {
    name: 'Streetlight',
    hi: 'स्ट्रीट लाइट',
    icon: <LampCeiling className="w-6 h-6" />,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    route: '/complaint/new?dept=streetlight',
  },
  {
    name: 'Sewage',
    hi: 'सीवेज',
    icon: <Waves className="w-6 h-6" />,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    route: '/complaint/new?dept=sewage',
  },
  {
    name: 'Parks',
    hi: 'उद्यान',
    icon: <Trees className="w-6 h-6" />,
    color: 'bg-green-50 text-green-600 border-green-100',
    route: '/complaint/new?dept=parks',
  },
  {
    name: 'Electricity',
    hi: 'विद्युत',
    icon: <Zap className="w-6 h-6" />,
    color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    route: '/complaint/new?dept=electricity',
  },
  {
    name: 'Solid Waste',
    hi: 'ठोस अपशिष्ट',
    icon: <Trash2 className="w-6 h-6" />,
    color: 'bg-rose-50 text-rose-600 border-rose-100',
    route: '/complaint/new?dept=solid-waste',
  },
  {
    name: 'Noise',
    hi: 'ध्वनि प्रदूषण',
    icon: <Volume2 className="w-6 h-6" />,
    color: 'bg-purple-50 text-purple-600 border-purple-100',
    route: '/complaint/new?dept=noise',
  },
];

export const ServicesGrid: React.FC = () => {
  const { language } = useAuth();

  return (
    <section id="services-section" className="space-y-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-civic-600">
            {language === 'hi' ? 'सभी नगर पालिका विभाग' : 'All Municipal Departments'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-civic-950 tracking-tight">
            {language === 'hi' ? 'हमारी सेवाएं' : 'Our Services'}
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {language === 'hi' ? '12 विभाग' : '12 Departments'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {DEPARTMENTS.map((dept) => (
          <Link
            key={dept.name}
            to={dept.route}
            className="group bg-white hover:bg-civic-50/70 rounded-2xl p-4 border border-sand-200 hover:border-civic-300 shadow-card hover:shadow-soft transition flex flex-col items-center text-center active:scale-[0.98] text-decoration-none"
          >
            <div
              className={`w-12 h-12 rounded-2xl ${dept.color} border flex items-center justify-center mb-3 group-hover:scale-105 transition`}
            >
              {dept.icon}
            </div>
            <span className="font-bold text-xs sm:text-sm text-civic-950 leading-snug">
              {dept.name}
            </span>
            <span className="text-[11px] text-slate-400 font-medium mt-0.5">
              {dept.hi}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};
