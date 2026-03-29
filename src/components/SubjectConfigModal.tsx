import React, { useState } from 'react';
import type { Subject } from '../lib/db';
import { motion } from 'framer-motion';
import { X, Save, Settings2 } from 'lucide-react';

interface SubjectConfigModalProps {
  subjects: Subject[];
  onCancel: () => void;
  onConfirm: (subjects: Subject[]) => void;
}

const QuickPills: React.FC<{ values: number[]; current: number; onChange: (v: number) => void }> = ({ values, current, onChange }) => (
  <div className="flex flex-wrap gap-1">
    {values.map(v => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border ${
          current === v
            ? 'bg-indigo-500/30 border-indigo-500/60 text-indigo-300'
            : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300 hover:border-slate-600'
        }`}
      >
        {v}
      </button>
    ))}
  </div>
);

const SubjectConfigModal: React.FC<SubjectConfigModalProps> = ({ subjects: initialSubjects, onCancel, onConfirm }) => {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
    setSubjects(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (updated.hasPractical && (field === 'thFullMarks' || field === 'inFullMarks')) {
          updated.fullMarks = (updated.thFullMarks || 0) + (updated.inFullMarks || 0);
          updated.passMarks = Math.ceil(updated.fullMarks * 0.35);
        }
        if (field === 'fullMarks') {
          updated.passMarks = Math.ceil(value * 0.35);
        }
        return updated;
      }
      return s;
    }));
  };

  const hasPracticalSubjects = subjects.some(s => s.hasPractical);
  const thQuickValues = [100, 75, 50, 40, 25];
  const inQuickValues = [100, 75, 50, 40, 25];
  const creditQuickValues = [5, 4, 3, 2, 1];
  const fmQuickValues = [100, 75, 50];

  const handleMassThFM = (val: number) => {
    setSubjects(prev => prev.map(s => {
      if (s.hasPractical) {
        const fm = val + (s.inFullMarks || 25);
        return { ...s, thFullMarks: val, fullMarks: fm, passMarks: Math.ceil(fm * 0.35) };
      }
      return s;
    }));
  };
  const handleMassInFM = (val: number) => {
    setSubjects(prev => prev.map(s => {
      if (s.hasPractical) {
        const fm = (s.thFullMarks || 75) + val;
        return { ...s, inFullMarks: val, fullMarks: fm, passMarks: Math.ceil(fm * 0.35) };
      }
      return s;
    }));
  };
  const handleMassFM = (val: number) => {
    setSubjects(prev => prev.map(s => {
      if (!s.hasPractical) {
        return { ...s, fullMarks: val, passMarks: Math.ceil(val * 0.35) };
      }
      return s;
    }));
  };
  const handleMassCredit = (val: number) => {
    setSubjects(prev => prev.map(s => ({ ...s, creditHour: val })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <Settings2 className="text-indigo-400" />
             <h3 className="text-xl font-bold text-white">Subject Configuration</h3>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Quick Set All Row */}
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800/50 items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">Set All:</span>
          {hasPracticalSubjects && (
            <>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-500">Th FM</span>
                {thQuickValues.map(v => (
                  <button key={v} onClick={() => handleMassThFM(v)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">{v}</button>
                ))}
              </div>
              <div className="w-px h-5 bg-slate-800 self-center shrink-0" />
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-500">In FM</span>
                {inQuickValues.map(v => (
                  <button key={v} onClick={() => handleMassInFM(v)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">{v}</button>
                ))}
              </div>
            </>
          )}
          {!hasPracticalSubjects && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-slate-500">FM</span>
              {fmQuickValues.map(v => (
                <button key={v} onClick={() => handleMassFM(v)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">{v}</button>
              ))}
            </div>
          )}
          <div className="w-px h-5 bg-slate-800 self-center shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-slate-500">Credit</span>
            {creditQuickValues.map(v => (
              <button key={v} onClick={() => handleMassCredit(v)}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors">{v}</button>
            ))}
          </div>
        </div>

        {/* Subject Table */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3">Subject</div>
            <div className="col-span-4 text-center">{hasPracticalSubjects ? 'Theory Full Marks' : 'Full Marks'}</div>
            {hasPracticalSubjects && <div className="col-span-2 text-center">Internal FM</div>}
            <div className="col-span-1 text-center">Total</div>
            <div className="col-span-1 text-center font-mono">Pass</div>
            <div className="col-span-1 text-center text-indigo-400">Credit</div>
          </div>

          {/* Subject Rows */}
          {subjects.map((sub) => (
            <div key={sub.id} className="grid grid-cols-12 gap-2 items-center bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800/40">
              {/* Name + Type */}
              <div className="col-span-3 flex items-center gap-2 overflow-hidden">
                <span className="font-medium text-slate-200 text-[13px] truncate" title={sub.name}>{sub.name}</span>
                {hasPracticalSubjects && (
                  <span className={`text-[8px] px-1 py-0.5 rounded-full font-bold shrink-0 ${sub.hasPractical ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/30 text-slate-500'}`}>
                    {sub.hasPractical ? 'Th+In' : 'Th'}
                  </span>
                )}
              </div>

              {/* Theory Marks */}
              <div className="col-span-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sub.hasPractical ? (sub.thFullMarks || 0) : sub.fullMarks}
                    onChange={(e) => updateSubject(sub.id, sub.hasPractical ? 'thFullMarks' : 'fullMarks', parseInt(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-700/50 rounded-lg w-16 text-center py-2 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <QuickPills values={sub.hasPractical ? thQuickValues : fmQuickValues} current={sub.hasPractical ? (sub.thFullMarks || 0) : sub.fullMarks} onChange={(v) => updateSubject(sub.id, sub.hasPractical ? 'thFullMarks' : 'fullMarks', v)} />
                </div>
              </div>

              {/* Internal Marks */}
              {hasPracticalSubjects && (
                <div className="col-span-2">
                  {sub.hasPractical ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={sub.inFullMarks || 0}
                        onChange={(e) => updateSubject(sub.id, 'inFullMarks', parseInt(e.target.value) || 0)}
                        className="bg-slate-950 border border-slate-700/50 rounded-lg w-16 text-center py-2 text-sm font-bold text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <QuickPills values={inQuickValues} current={sub.inFullMarks || 0} onChange={(v) => updateSubject(sub.id, 'inFullMarks', v)} />
                    </div>
                  ) : (
                    <div className="text-center text-slate-700 text-xs">—</div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="col-span-1 text-center">
                <span className="text-sm font-bold text-slate-300">{sub.fullMarks}</span>
              </div>

              {/* Pass */}
              <div className="col-span-1 text-center border-l border-slate-800 ml-1">
                <span className="text-[11px] text-slate-500 font-mono">{sub.passMarks}</span>
              </div>

              {/* Credit Hour */}
              <div className="col-span-1">
                 <input
                    type="number"
                    step="0.1"
                    value={sub.creditHour}
                    onChange={(e) => updateSubject(sub.id, 'creditHour', parseFloat(e.target.value) || 0)}
                    className="bg-slate-950 border border-slate-700/50 rounded-lg w-12 text-center py-2 text-sm font-bold text-white outline-none"
                  />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800 shrink-0">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button
            onClick={() => onConfirm(subjects)}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            Apply & Process
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SubjectConfigModal;
