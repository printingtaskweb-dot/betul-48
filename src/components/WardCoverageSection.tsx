import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Compass, PlusCircle } from 'lucide-react';

interface WardData {
  id: string;
  ward: string;
  engineer: string;
  avgHours: string;
  overall: string;
  bar1: number;
  bar2: number;
}

const WARDS: WardData[] = [
  {
    id: 'Kothi Bazar',
    ward: 'Ward 1',
    engineer: 'Er. S. K. Tiwari',
    avgHours: '14 hrs',
    overall: '92.4%',
    bar1: 96,
    bar2: 89,
  },
  {
    id: 'Tikari',
    ward: 'Ward 12',
    engineer: 'Er. R. K. Verma',
    avgHours: '16 hrs',
    overall: '90.1%',
    bar1: 93,
    bar2: 87,
  },
  {
    id: 'Ganj',
    ward: 'Ward 5',
    engineer: 'Er. R. K. Verma',
    avgHours: '12 hrs',
    overall: '94.8%',
    bar1: 97,
    bar2: 92,
  },
  {
    id: 'Badora',
    ward: 'Ward 18',
    engineer: 'Er. P. S. Rathore',
    avgHours: '18 hrs',
    overall: '88.5%',
    bar1: 91,
    bar2: 86,
  },
  {
    id: 'Sadar',
    ward: 'Ward 8',
    engineer: 'Er. A. K. Dubey',
    avgHours: '15 hrs',
    overall: '91.2%',
    bar1: 94,
    bar2: 88,
  },
  {
    id: 'Kosmi',
    ward: 'Ward 24',
    engineer: 'Er. N. K. Sharma',
    avgHours: '19 hrs',
    overall: '87.9%',
    bar1: 90,
    bar2: 85,
  },
];

export const WardCoverageSection: React.FC = () => {
  const { language } = useAuth();
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState<WardData>(WARDS[0]);

  const handleReportInWard = () => {
    navigate(`/complaint/new?ward=${encodeURIComponent(selectedWard.id)}`);
  };

  return (
    <section
      id="wards-section"
      className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-card"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left 5 Columns: Real Betul Civic Greenery & Infrastructure Photo Card */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden h-64 sm:h-72 bg-gradient-to-br from-civic-800 to-emerald-900 shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80"
            alt="Betul Municipal Ward Greenery and Civic Zone"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-civic-950/85 via-civic-950/25 to-transparent"></div>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-civic-950 text-xs font-bold shadow-xs">
              <Compass className="w-3.5 h-3.5 text-civic-700" />
              <span>{language === 'hi' ? 'जिला बैतूल • 33 वार्ड' : 'Jila Betul • 33 Wards'}</span>
            </span>
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="text-lg font-extrabold">
              {selectedWard.ward} — {selectedWard.id}
            </div>
            <p className="text-xs text-civic-200 mt-0.5">
              {language === 'hi' ? 'जोन अधिकारी: ' : 'Zone Officer: '}
              {selectedWard.engineer} • {language === 'hi' ? 'औसत निराकरण: ' : 'Avg Resolution: '}
              {selectedWard.avgHours}
            </p>
          </div>
        </div>

        {/* Right 7 Columns: Interactive Ward Selector Pills & SLA Resolution Breakdown */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-civic-600">
              {language === 'hi' ? 'वार्ड कवरेज एवं निराकरण' : 'Ward Coverage & SLA Performance'}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-civic-950 tracking-tight mt-0.5">
              {language === 'hi' ? 'लाइव वार्ड-वार नागरिक निराकरण' : 'Live Ward-Wise Civic Resolution'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {language === 'hi'
                ? 'फील्ड टीम की स्थिति और सेवा स्तर (SLA) प्रगति देखने के लिए नीचे दिए गए वार्ड पर टैप करें।'
                : 'Select a municipal ward below to inspect field team coverage and service-level resolution progress.'}
            </p>
          </div>

          {/* Interactive Ward Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {WARDS.map((w) => {
              const isActive = w.id === selectedWard.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWard(w)}
                  className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition border cursor-pointer ${
                    isActive
                      ? 'bg-civic-800 text-white border-civic-800 shadow-xs'
                      : 'bg-sand-50 hover:bg-civic-50 text-civic-900 border-sand-200'
                  }`}
                >
                  {w.id} <span className="opacity-70 font-medium">({w.ward})</span>
                </button>
              );
            })}
          </div>

          {/* Clean SLA Progress Breakdown */}
          <div className="p-4 sm:p-5 rounded-2xl bg-sand-50 border border-sand-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {language === 'hi' ? 'कुल SLA अनुपालन' : 'Overall SLA Compliance'}
                </div>
                <div className="text-2xl font-extrabold text-civic-950 mt-0.5">
                  {selectedWard.overall} {language === 'hi' ? '24 घंटे के भीतर' : 'Within 24 Hours'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleReportInWard}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-civic-700 hover:bg-civic-800 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{language === 'hi' ? 'वार्ड में शिकायत करें' : 'Report in Ward'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">
                    {language === 'hi' ? 'स्वच्छता एवं ठोस अपशिष्ट' : 'Sanitation & Solid Waste'}
                  </span>
                  <span className="text-emerald-700 font-bold">{selectedWard.bar1}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-sand-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${selectedWard.bar1}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">
                    {language === 'hi' ? 'पेयजल आपूर्ति एवं स्ट्रीट लाइट' : 'Water Supply & Streetlights'}
                  </span>
                  <span className="text-civic-700 font-bold">{selectedWard.bar2}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-sand-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-civic-600 transition-all duration-300"
                    style={{ width: `${selectedWard.bar2}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
