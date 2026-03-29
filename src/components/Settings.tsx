import React, { useState } from 'react';
import { useResult } from '../context/ResultContextCore';
import { Save, School, MapPin, Calendar, Trash2, Upload } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings: React.FC = () => {
  const { config, setConfig } = useResult();
  const [form, setForm] = useState({ ...config });
  const [saved, setSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white">School Configuration</h3>
        <p className="text-slate-400 mt-2">These details will appear on the printed gradesheets and dashboard.</p>
      </div>

      <form onSubmit={handleSave} className="glass-card space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
             <School size={16} /> School Name
          </label>
          <input
            type="text"
            className="input-field w-full"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. St. Xavier's High School"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
             <MapPin size={16} /> Address
          </label>
          <input
            type="text"
            className="input-field w-full"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="e.g. Kathmandu, Nepal"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
               <Calendar size={16} /> Academic Year
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
              placeholder="e.g. 2080-2081"
              required
            />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
               <Calendar size={16} /> ESTD. Year
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={form.estdYear}
              onChange={(e) => setForm({ ...form, estdYear: e.target.value })}
              placeholder="e.g. 2061"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
               <Calendar size={16} /> Terminal Name
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={form.terminalName}
              onChange={(e) => setForm({ ...form, terminalName: e.target.value })}
              placeholder="e.g. Annual Examination"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
               <Calendar size={16} /> Issued Date
            </label>
            <input
              type="text"
              className="input-field w-full"
              value={form.issuedDate}
              onChange={(e) => setForm({ ...form, issuedDate: e.target.value })}
              placeholder="e.g. 2082-03-30"
              required
            />
          </div>
        </div>

        {/* Digital Signatures Section */}
        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white">Digital Signatures (PNG)</h4>
            <span className="text-[10px] font-medium px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              Recommended: 500px × 500px
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Prepared By Signature */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400">Prepared By Signature</label>
              <div className="relative group aspect-[3/1] bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all">
                {form.preparedBySig ? (
                  <>
                    <img id="prepared-sig-preview" src={form.preparedBySig} className="w-full h-full object-contain p-2" alt="Prepared By Signature" />
                    <button 
                      type="button"
                      onClick={() => setForm({ ...form, preparedBySig: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-rose-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <Upload size={20} className="text-slate-600 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">Upload PNG</span>
                    <input 
                      type="file" 
                      accept="image/png" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setForm({ ...form, preparedBySig: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Principal Signature */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-400">Principal Signature</label>
              <div className="relative group aspect-[3/1] bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all">
                {form.principalSig ? (
                  <>
                    <img src={form.principalSig} className="w-full h-full object-contain p-2" alt="Principal Signature" />
                    <button 
                      type="button"
                      onClick={() => setForm({ ...form, principalSig: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-rose-500/90 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                    <Upload size={20} className="text-slate-600 mb-1" />
                    <span className="text-[10px] text-slate-500 font-medium">Upload PNG</span>
                    <input 
                      type="file" 
                      accept="image/png" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setForm({ ...form, principalSig: reader.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
          {saved && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-emerald-400 text-sm font-medium"
            >
              Changes saved successfully!
            </motion.p>
          )}
          <button type="submit" className="btn-primary ml-auto flex items-center gap-2 px-8">
            <Save size={18} />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
