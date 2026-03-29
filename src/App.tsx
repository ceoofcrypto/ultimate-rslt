import React, { useState } from 'react';
import { LayoutDashboard, Upload, FileSpreadsheet, Settings as SettingsIcon, Trash2, ChevronRight } from 'lucide-react';
import { useResult } from './context/ResultContextCore';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import ResultsTable from './components/ResultsTable';
import Settings from './components/Settings';
import ClassDistribution from './components/ClassDistribution';

type Page = 'dashboard' | 'upload' | 'results' | 'settings' | 'distribution';

const CLASS_ORDER: Record<string, number> = {
  'NUR': -3, 'NURSERY': -3, 'LKG': -2, 'UKG': -1,
  'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
  'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'SHEET': 99 // For the "Sheet" entry seen in screenshot
};

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const { config, currentClass, availableClasses, setCurrentClass, resetData } = useResult();

  const sortedClasses = [...availableClasses].sort((a, b) => {
    const orderA = CLASS_ORDER[a.toUpperCase()] || 50;
    const orderB = CLASS_ORDER[b.toUpperCase()] || 50;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'results', label: 'Result Ledger', icon: FileSpreadsheet },
    { id: 'distribution', label: 'Class Distribution', icon: SettingsIcon },
    { id: 'settings', label: 'School Settings', icon: SettingsIcon },
  ];

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to delete all student data and subjects? This cannot be undone.')) {
      await resetData();
      setActivePage('dashboard');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-white">SchlResult</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 custom-scrollbar">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-2">Main Menu</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id as Page)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activePage === item.id 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-inner' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium text-sm">{item.label}</span>
              {activePage === item.id && (
                <motion.div layoutId="active" className="ml-auto">
                  <ChevronRight size={14} />
                </motion.div>
              )}
            </button>
          ))}

          {/* Class Switcher Section */}
          <div className="mt-6">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-4 mb-2 flex items-center justify-between">
              Classes
              <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[9px]">{sortedClasses.length}</span>
            </div>
            <div className="flex flex-col gap-1">
              {sortedClasses.map((cls, idx) => (
                <button
                  key={`${cls}-${idx}`}
                  onClick={() => setCurrentClass(cls)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
                    currentClass === cls
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${currentClass === cls ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  <span className="font-medium text-xs">{cls}</span>
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="pt-6 border-t border-slate-800 flex flex-col gap-2">
          <button 
            onClick={handleReset}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
          >
            <Trash2 size={20} />
            <span className="font-medium">Reset All</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{config.name}</h2>
              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-bold mt-1 uppercase tracking-wider">
                Class {currentClass}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{config.academicYear} | {config.address}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
              OFFLINE MODE ENABLED
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'upload' && <FileUpload onComplete={() => setActivePage('results')} />}
            {activePage === 'results' && <ResultsTable />}
            {activePage === 'settings' && <Settings />}
            {activePage === 'distribution' && <ClassDistribution />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
