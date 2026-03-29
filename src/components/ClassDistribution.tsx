import React, { useState, useEffect } from 'react';
import { useResult } from '../context/ResultContextCore';
import { db } from '../lib/db';
import type { ClassConfig, Subject, CHPreset } from '../lib/db';
import { Settings, Save, CheckCircle2, FlaskConical, BookOpen, Trash2, Plus, Copy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClassDistribution: React.FC = () => {
  const { availableClasses, currentClass, refreshData } = useResult();
  const [selectedClass, setSelectedClass] = useState(currentClass || (availableClasses.length > 0 ? availableClasses[0] : ''));
  const [classConfig, setClassConfig] = useState<ClassConfig | null>(null);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [saved, setSaved] = useState(false);
  const [chPresets, setChPresets] = useState<CHPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
    }
  }, [selectedClass]);

  const loadClassData = async (className: string) => {
    const config = await db.getClassConfig(className);
    const subs = await db.getSubjects(className);
    
    setClassConfig(config || {
      className,
      hasPractical: subs.some(s => s.hasPractical),
      creditHours: {}
    });
    setClassSubjects(subs);
    loadPresets();
  };

  const loadPresets = async () => {
    const presets = await db.getCHPresets();
    setChPresets(presets);
  };

  const handleSave = async () => {
    if (!classConfig) return;

    // Save class config
    await db.saveClassConfig(classConfig);

    // Update subjects with new settings
    const updatedSubjects = [...classSubjects];
    await db.saveSubjects(updatedSubjects, selectedClass);
    
    if (selectedClass === currentClass) {
      await refreshData();
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setClassSubjects(prev => prev.map(s => {
      if (s.id !== id) return s;
      const newSub = { ...s, ...updates };
      // Auto-calculate fullMarks based on split configuration
      if (newSub.hasPractical) {
        newSub.fullMarks = (newSub.thFullMarks ?? 75) + (newSub.inFullMarks ?? 25);
      } else {
        newSub.fullMarks = newSub.thFullMarks ?? 100;
        newSub.inFullMarks = 0; // Reset internal if no practical
      }
      newSub.passMarks = Math.ceil(newSub.fullMarks * 0.35);
      return newSub;
    }));
  };
  
  const bulkUpdate = (field: 'thFullMarks' | 'inFullMarks' | 'creditHour' | 'fullMarks', value: number) => {
    setClassSubjects(prev => prev.map(s => {
      if (field === 'thFullMarks' || field === 'inFullMarks') {
        if (!s.hasPractical) return s;
      }
      const newSub = { ...s, [field]: value };
      // Auto-recalculate fullMarks if Th or In was updated
      if (field === 'thFullMarks' || field === 'inFullMarks' || field === 'fullMarks') {
        if (newSub.hasPractical) {
          newSub.fullMarks = (newSub.thFullMarks ?? 75) + (newSub.inFullMarks ?? 25);
        } else {
          newSub.fullMarks = newSub.thFullMarks ?? 100;
        }
        newSub.passMarks = Math.ceil(newSub.fullMarks * 0.35);
      }
      return newSub;
    }));
  };

  const toggleAllPractical = () => {
    const targetState = !classConfig?.hasPractical;
    setClassSubjects(prev => prev.map(s => {
      const newSub = { ...s, hasPractical: targetState };
      if (targetState) {
        newSub.thFullMarks = s.thFullMarks || 75;
        newSub.inFullMarks = s.inFullMarks || 25;
        newSub.fullMarks = newSub.thFullMarks + newSub.inFullMarks;
      } else {
        newSub.fullMarks = s.thFullMarks || s.fullMarks || 100;
        newSub.inFullMarks = 0;
      }
      newSub.passMarks = Math.ceil(newSub.fullMarks * 0.35);
      return newSub;
    }));
    setClassConfig(prev => prev ? { ...prev, hasPractical: targetState } : null);
  };

  const setAllFMScheme = (th: number, inM: number) => {
    setClassSubjects(prev => prev.map(s => {
      const newSub = { 
        ...s, 
        hasPractical: inM > 0,
        thFullMarks: th,
        inFullMarks: inM,
        fullMarks: th + inM
      };
      newSub.passMarks = Math.ceil(newSub.fullMarks * 0.35);
      return newSub;
    }));
    if (inM > 0 && !classConfig?.hasPractical) {
      setClassConfig(prev => prev ? { ...prev, hasPractical: true } : null);
    } else if (inM === 0 && classConfig?.hasPractical) {
      setClassConfig(prev => prev ? { ...prev, hasPractical: false } : null);
    }
  };

  const saveCHPreset = async () => {
    if (!newPresetName.trim()) return;
    const creditHours: Record<string, number> = {};
    classSubjects.forEach(s => {
      creditHours[s.name] = s.creditHour;
    });
    const preset: CHPreset = { name: newPresetName, creditHours };
    await db.saveCHPreset(preset);
    setNewPresetName('');
    loadPresets();
  };

  const applyCHPreset = (preset: CHPreset) => {
    setClassSubjects(prev => prev.map(s => {
      const ch = preset.creditHours[s.name];
      if (ch !== undefined) {
        return { ...s, creditHour: ch };
      }
      return s;
    }));
  };

  const deleteCHPreset = async (name: string) => {
    if (confirm(`Delete preset "${name}"?`)) {
      await db.deleteCHPreset(name);
      loadPresets();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Class Mark Distribution</h3>
          <p className="text-slate-400 text-sm mt-1">Configure individual settings for each class</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {availableClasses.map(c => (
              <option key={c} value={c}>Class {c}</option>
            ))}
          </select>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General & Presets */}
        <div className="space-y-6">
          {/* Class Settings */}
          <div className="glass rounded-2xl p-6 border border-slate-800">
            <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Settings size={20} className="text-indigo-400" />
              Class Settings
            </h4>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <div>
                  <p className="text-sm font-bold text-white">Practical Mode</p>
                  <p className="text-[10px] text-slate-500 mt-1">Enable for all subjects</p>
                </div>
                <button
                  onClick={toggleAllPractical}
                  className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${
                    classConfig?.hasPractical 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  <FlaskConical size={18} />
                  {classConfig?.hasPractical ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <p className="text-xs text-amber-200/70 leading-relaxed italic">
                  Tip: Use the switch above to toggle Practical mode for EVERY subject in this class at once.
                </p>
              </div>
            </div>
          </div>

          {/* Credit Hour Presets */}
          <div className="glass rounded-2xl p-6 border border-slate-800">
            <h4 className="text-lg font-bold text-white mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-purple-400" />
                CH Presets
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">{chPresets.length} saved</span>
            </h4>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Preset Name (e.g. Primary)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button 
                  onClick={saveCHPreset}
                  className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                  title="Save current CH as preset"
                >
                  <Plus size={18} />
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {chPresets.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-4 italic">No presets saved yet. Save current Credit Hours to use them in other classes.</p>
                ) : (
                  chPresets.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-slate-800 group hover:border-purple-500/40 transition-all">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">
                          {Object.keys(p.creditHours).length} subjects mapping
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => applyCHPreset(p)}
                          className="p-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-lg transition-all"
                          title="Apply this preset to current class"
                        >
                          <Copy size={14} />
                        </button>
                        <button 
                          onClick={() => deleteCHPreset(p.name)}
                          className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                          title="Delete preset"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bulk Actions Bar */}
          <div className="glass rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <RefreshCw size={12} /> Bulk Apply to All
              </p>
              <div className="flex flex-wrap gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-slate-400">FM Scheme (Th + In)</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => setAllFMScheme(100, 0)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 text-white text-[10px] rounded-lg transition-all font-bold">100/0</button>
                    <button onClick={() => setAllFMScheme(75, 25)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 text-white text-[10px] rounded-lg transition-all font-bold">75/25</button>
                    <button onClick={() => setAllFMScheme(50, 50)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 text-white text-[10px] rounded-lg transition-all font-bold">50/50</button>
                    <button onClick={() => setAllFMScheme(40, 10)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-indigo-500/20 hover:border-indigo-500/50 text-white text-[10px] rounded-lg transition-all font-bold">40/10</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-slate-400">Global Credit Hour</span>
                  <div className="flex gap-1.5">
                    {[4.0, 3.0, 2.0].map(v => (
                      <button key={v} onClick={() => bulkUpdate('creditHour', v)} className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-purple-500/20 hover:border-purple-500/50 text-white text-[10px] rounded-lg transition-all font-bold">
                        {v.toFixed(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen size={20} className="text-indigo-400" />
                Subjects for {selectedClass}
              </h4>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{classSubjects.length} Subjects</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Practical</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Cr. Hr</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Th (FM)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">In (FM)</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-indigo-400 uppercase tracking-wider text-right">Total FM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <AnimatePresence>
                    {classSubjects.map((sub) => {
                      const isNew = sub.fullMarks === 100 && sub.passMarks === 35 && sub.creditHour === 4.0;
                      return (
                        <motion.tr 
                          key={sub.id} 
                          layout
                          className={`hover:bg-slate-900/30 transition-colors ${isNew ? 'bg-indigo-500/5' : ''}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{sub.name}</span>
                              {isNew && (
                                <motion.span 
                                  animate={{ opacity: [1, 0.5, 1], scale: [1, 1.05, 1] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[8px] font-bold uppercase tracking-wider border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                                >
                                  New / Unconfigured
                                </motion.span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => updateSubject(sub.id, { hasPractical: !sub.hasPractical })}
                              className={`p-1.5 rounded-lg transition-all ${
                                sub.hasPractical 
                                  ? 'bg-emerald-500/20 text-emerald-400' 
                                  : 'bg-slate-800 text-slate-600'
                              }`}
                            >
                              <FlaskConical size={16} />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <input 
                              type="number"
                              step="0.1"
                              value={sub.creditHour}
                              onChange={(e) => updateSubject(sub.id, { creditHour: parseFloat(e.target.value) || 0 })}
                              className="bg-slate-800/50 border border-slate-700 text-xs text-white rounded px-2 py-1 w-16 text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              <input 
                                type="number"
                                value={sub.thFullMarks ?? 75}
                                disabled={!sub.hasPractical && sub.fullMarks > 0}
                                onChange={(e) => updateSubject(sub.id, { thFullMarks: parseInt(e.target.value) || 0 })}
                                className={`bg-slate-800/50 border border-slate-700 text-xs rounded px-2 py-1 w-16 text-center outline-none ${!sub.hasPractical ? 'text-slate-400' : 'text-emerald-400'}`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col gap-2 items-center">
                              <input 
                                type="number"
                                value={sub.inFullMarks ?? 25}
                                disabled={!sub.hasPractical}
                                onChange={(e) => updateSubject(sub.id, { inFullMarks: parseInt(e.target.value) || 0 })}
                                className={`bg-slate-800/50 border border-slate-700 text-xs rounded px-2 py-1 w-16 text-center outline-none ${!sub.hasPractical ? 'opacity-30' : 'text-amber-400'}`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-indigo-400">{sub.fullMarks}</span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {saved && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 font-bold z-50"
        >
          <CheckCircle2 size={20} /> Configuration Saved for {selectedClass}
        </motion.div>
      )}
    </div>
  );
};

export default ClassDistribution;
