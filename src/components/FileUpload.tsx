import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { useResult } from '../context/ResultContextCore';
import { detectSubjectsFromRow, calculateResult, calculateRanks } from '../utils/processor';
import { db } from '../lib/db';
import type { Subject, Student } from '../lib/db';
import { motion } from 'framer-motion';

interface FileUploadProps {
  onComplete: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onComplete }) => {
  const { config, refreshData } = useResult();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [detectedClasses, setDetectedClasses] = useState<{ className: string, subjects: Subject[], students: Student[] }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (file: File) => {
    setError(null);
    setIsProcessing(true);
    setDetectedClasses([]);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: any) => {
          const { subjects, students } = await processSheetData(results.data, 'Imported Class');
          setDetectedClasses([{ className: 'Imported Class', subjects, students }]);
          setIsProcessing(false);
          setShowConfig(true);
        },
        error: (err: any) => {
          setError('Failed to parse CSV: ' + err.message);
          setIsProcessing(false);
        }
      });
    } else {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          const results: { className: string, subjects: Subject[], students: Student[] }[] = [];
          
          const processSheets = async () => {
            for (const sheetName of workbook.SheetNames) {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              if (jsonData.length > 0) {
                const { subjects, students } = await processSheetData(jsonData, sheetName);
                results.push({ className: sheetName, subjects, students });
              }
            }
            
            if (results.length === 0) {
              setError('No data found in any sheet.');
            } else {
              setDetectedClasses(results);
              setShowConfig(true);
            }
          };

          processSheets().finally(() => setIsProcessing(false));
        } catch (err) {
          setError('Failed to parse Excel file. Ensure it is a valid .xlsx file.');
          setIsProcessing(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processSheetData = async (data: any[], sheetName: string) => {
    const firstRow = data[0];
    const allColumns = detectSubjectsFromRow(firstRow);
    const existingSubjects = await db.getSubjects(sheetName);
    const subs: Subject[] = [];
    let orderIdx = 0;

    const subjectMap: Map<string, { thCol?: string; inCol?: string; baseName: string }> = new Map();
    const appearanceOrder: string[] = [];

    allColumns.forEach(col => {
      const lower = col.toLowerCase();
      let baseName = col;
      let isTh = false;
      let isIn = false;

      if (lower.endsWith('-th')) {
        baseName = col.slice(0, -3).trim();
        isTh = true;
      } else if (lower.endsWith('-in')) {
        baseName = col.slice(0, -3).trim();
        isIn = true;
      }

      const key = baseName.toLowerCase();
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { baseName });
        appearanceOrder.push(key);
      }

      if (isTh) subjectMap.get(key)!.thCol = col;
      else if (isIn) subjectMap.get(key)!.inCol = col;
    });

    appearanceOrder.forEach(key => {
      const info = subjectMap.get(key)!;
      const isPracticalDetected = !!(info.thCol || info.inCol);
      const subId = `${sheetName}_${key.replace(/\s+/g, '_')}`;
      
      const existing = existingSubjects.find(s => s.id === subId);
      const hasPractical = existing ? existing.hasPractical : isPracticalDetected;
      
      // Auto-calculate fullMarks from components
      const thFm = existing?.thFullMarks ?? (hasPractical ? 75 : 100);
      const inFm = hasPractical ? (existing?.inFullMarks ?? 25) : 0;

      const subFullMarks = thFm + inFm;
      subs.push({
        id: subId,
        className: sheetName,
        name: info.baseName,
        fullMarks: subFullMarks,
        passMarks: existing?.passMarks ?? Math.ceil(subFullMarks * 0.35),
        creditHour: existing?.creditHour ?? 4.0,
        order: orderIdx++,
        hasPractical,
        thFullMarks: thFm,
        inFullMarks: hasPractical ? inFm : undefined,
      });
    });

    const parsedStudents: Student[] = data.map(row => {
      const marks: Record<string, number> = {};
      const parseVal = (rawVal: any): number => {
        if (typeof rawVal === 'number') return rawVal;
        if (typeof rawVal === 'string') {
          const parsed = parseFloat(rawVal);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      subs.forEach(sub => {
        if (sub.hasPractical) {
          const thKey = Object.keys(row).find(k => k.toLowerCase() === `${sub.name.toLowerCase()}-th`);
          const inKey = Object.keys(row).find(k => k.toLowerCase() === `${sub.name.toLowerCase()}-in`);
          marks[sub.id + '_th'] = parseVal(thKey ? row[thKey] : 0);
          marks[sub.id + '_in'] = parseVal(inKey ? row[inKey] : 0);
        } else {
          const rawKey = Object.keys(row).find(k => k.toLowerCase() === sub.name.toLowerCase());
          marks[sub.id] = parseVal(rawKey ? row[rawKey] : 0);
        }
      });

      const rollKey = Object.keys(row).find(k => ['roll', 's.n.', 'sn', 'symbol'].includes(k.toLowerCase())) || 'roll';
      const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name')) || 'name';
      const attKey = Object.keys(row).find(k => k.toLowerCase().includes('attendance')) || 'attendance';

      return calculateResult(
        String(row[rollKey] || 'N/A'),
        String(row[nameKey] || 'Unknown'),
        sheetName,
        marks,
        parseFloat(row[attKey]) || 0,
        subs
      );
    });

    return { subjects: subs, students: parsedStudents };
  };

  const handleFinalConfirm = async () => {
    setIsProcessing(true);
    try {
      for (const cls of detectedClasses) {
        await db.saveSubjects(cls.subjects, cls.className);
        const rankedStudents = calculateRanks(cls.students);
        await db.saveStudents(rankedStudents, cls.className);
        await db.saveClassConfig({
          className: cls.className,
          hasPractical: cls.subjects.some(s => s.hasPractical),
          creditHours: {}
        });
      }
      if (detectedClasses.length > 0) {
        const firstClass = detectedClasses[0].className;
        await db.saveConfig({ ...config, className: firstClass });
      }
      await refreshData();
      onComplete();
    } catch (err) {
      setError('Failed to save data. Check console for details.');
      console.error(err);
    } finally {
      setIsProcessing(false);
      setShowConfig(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-10">
        <h3 className="text-2xl font-bold text-white">Import Master Data</h3>
        <p className="text-slate-400 mt-2">Upload a Master Excel file. Each sheet will be processed as a separate class.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`glass h-64 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer ${
          isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'
        } ${isProcessing ? 'opacity-50 cursor-wait' : ''}`}
      >
        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-xl">
          <Upload className={isProcessing ? "animate-bounce text-indigo-400" : "text-indigo-400"} size={32} />
        </div>
        <p className="text-slate-200 font-medium">{isProcessing ? 'Processing Master File...' : 'Click or Drag & Drop Master File'}</p>
        <p className="text-slate-500 text-sm mt-1">Supports all sheets (Class One, Two, etc.)</p>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass w-full max-w-lg rounded-2xl border border-slate-800 p-8 shadow-2xl"
          >
            <h4 className="text-xl font-bold text-white mb-2">Review Detected Classes</h4>
            <p className="text-slate-400 text-sm mb-6">We found the following sheets. Click confirm to import all.</p>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {detectedClasses.map((cls) => (
                <div key={cls.className} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-xs font-bold">
                      {cls.className.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{cls.className}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-slate-500">{cls.students.length} Students</p>
                        <p className="text-[10px] text-slate-500">|</p>
                        <p className={`text-[10px] font-bold ${cls.subjects.some(s => s.fullMarks === 100 && s.passMarks === 35) ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>
                          {cls.subjects.length} Subjects {cls.subjects.some(s => s.fullMarks === 100 && s.passMarks === 35) ? '(New Detected)' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowConfig(false)}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalConfirm}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {isProcessing ? 'Saving...' : 'Import All Classes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
