import React, { useState } from 'react';
import { useResult } from '../context/ResultContextCore';
import { 
  Download, 
  Printer, 
  Search, 
  Edit2, 
  Save, 
  X,
  FileText,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { exportToExcel } from '../utils/excelExporter';
import { generateBulkGradeSheets, generateGradeSheetBlob, generateLedgerPDF, generateLedgerBlob } from '../utils/pdfExporter';
import type { Student } from '../lib/db';
import { calculateResult, getLetterGrade, getGradePoint } from '../utils/processor';
import PDFPreview from './PDFPreview';

const ResultsTable: React.FC = () => {
  const { students, subjects, config, currentClass, setStudents, setSubjects } = useResult();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [showDetailed, setShowDetailed] = useState(true);
  
  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewSubtitle, setPreviewSubtitle] = useState('');
  const [downloadFilename, setDownloadFilename] = useState('');

  const handlePreview = (student: Student) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blob = generateGradeSheetBlob(student, subjects, config, showDetailed);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewTitle('Gradesheet Preview');
    setPreviewSubtitle(student.name.toUpperCase());
    setDownloadFilename(`${student.rollNumber}_${student.name.replace(/\s+/g, '_')}_Gradesheet.pdf`);
    setIsPreviewOpen(true);
  };

  const handleLedgerPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const blob = generateLedgerBlob(students, subjects, config, showDetailed);
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewTitle('Result Ledger Preview');
    setPreviewSubtitle(`${config.terminalName} - ${config.academicYear}`);
    setDownloadFilename(`${config.name.replace(/\s+/g, '_')}_Result_Ledger_${config.academicYear}.pdf`);
    setIsPreviewOpen(true);
  };

  // Sorting & Filtering State
  const [sortBy, setSortBy] = useState<'rollNumber' | 'name' | 'totalMarks' | 'gpa' | 'rank' | 'attendance'>('rollNumber');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'FAIL'>('ALL');

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      // Helper for numeric comparison (especially for Roll Numbers like 1, 2, 10)
      const compareNumeric = (v1: any, v2: any, order: 'asc' | 'desc') => {
        const n1 = parseFloat(v1) || 0;
        const n2 = parseFloat(v2) || 0;
        if (n1 !== n2) return order === 'asc' ? n1 - n2 : n2 - n1;
        return 0;
      };

      if (sortBy === 'rollNumber' || sortBy === 'rank' || sortBy === 'gpa' || sortBy === 'attendance' || sortBy === 'totalMarks') {
        let valA = a[sortBy];
        let valB = b[sortBy];
        
        // Handle Rank tie-breaking specifically
        if (sortBy === 'rank') {
          valA = valA || 999999;
          valB = valB || 999999;
        }

        const result = compareNumeric(valA, valB, sortOrder);
        if (result !== 0) return result;
      } else {
        // String comparison for Name
        const valA = String(a[sortBy]);
        const valB = String(b[sortBy]);
        const result = valA.localeCompare(valB);
        if (result !== 0) return sortOrder === 'asc' ? result : -result;
      }

      // Final Tie-breaker: Always sort by roll number ascending
      return (parseFloat(a.rollNumber) || 0) - (parseFloat(b.rollNumber) || 0);
    });

  const handleEdit = (student: Student) => {
    setEditingId(student.id || null);
    setEditForm({ ...student });
  };

  const handleSave = async () => {
    if (!editingId || !editForm) return;

    // Re-calculate result logic for the edited student
    const updatedStudent = calculateResult(
      editForm.rollNumber!,
      editForm.name!,
      editForm.className || config.className,
      editForm.marks!,
      editForm.attendance!,
      subjects
    );

    const newStudents = students.map(s => 
      s.id === editingId ? { ...updatedStudent, id: s.id } : s
    );

    await setStudents(newStudents);
    setEditingId(null);
  };

  const updateMark = (subjectId: string, value: number) => {
    setEditForm(prev => ({
      ...prev,
      marks: { ...prev.marks, [subjectId]: value }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Actions Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search students..."
              className="input-field w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
            {['ALL', 'PASS', 'NG'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as any)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === f 
                    ? 'bg-indigo-500 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportToExcel(students, subjects, config)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            Excel
          </button>
          <button 
            onClick={handleLedgerPreview}
            className="btn-secondary flex items-center gap-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
            title="Preview Ledger"
          >
            <Printer size={18} />
            Preview Ledger
          </button>
          <button 
            onClick={() => generateLedgerPDF(students, subjects, config, showDetailed)}
            className="btn-secondary flex items-center gap-2"
          >
            <FileText size={18} />
            PDF Ledger
          </button>
          <button 
            onClick={() => {
              if (confirm('Recalculate all results and ranks? This fixes GPA if settings changed.')) {
                const updated = students.map(s => calculateResult(s.rollNumber, s.name, currentClass, s.marks, s.attendance, subjects));
                setStudents(updated);
              }
            }}
            className="btn-secondary flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
            title="Recalculate Ranks"
          >
            <RefreshCw size={18} />
          </button>
          <div className="h-8 w-px bg-slate-800 mx-1 hidden md:block" />
          <button 
            onClick={() => {
              const allGP = subjects.every(s => s.showGPOnly);
              setSubjects(subjects.map(s => ({ ...s, showGPOnly: !allGP, showLGOnly: false })));
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              subjects.every(s => s.showGPOnly)
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {subjects.every(s => s.showGPOnly) ? <Eye size={16} /> : <EyeOff size={16} />}
            GP Mode: {subjects.every(s => s.showGPOnly) ? 'On' : 'Off'}
          </button>
          <button 
            onClick={() => {
              const allLG = subjects.every(s => s.showLGOnly);
              setSubjects(subjects.map(s => ({ ...s, showLGOnly: !allLG, showGPOnly: false })));
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              subjects.every(s => s.showLGOnly)
                ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            {subjects.every(s => s.showLGOnly) ? <Eye size={16} /> : <EyeOff size={16} />}
            LG Mode: {subjects.every(s => s.showLGOnly) ? 'On' : 'Off'}
          </button>
          <button 
            onClick={() => setShowDetailed(!showDetailed)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
              showDetailed
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
            }`}
          >
            {showDetailed ? <Eye size={16} /> : <EyeOff size={16} />}
            {showDetailed ? 'Split Mode (Th/In)' : 'Total Mode (At Once)'}
          </button>
          <button 
            onClick={() => generateBulkGradeSheets(students, subjects, config, showDetailed)}
            className="btn-primary flex items-center gap-2"
          >
            <Printer size={18} />
            Bulk Print
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card !p-0 overflow-hidden border-slate-800 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700">
                <th rowSpan={2} 
                  className="p-3 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-700 w-14 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => {
                    if (sortBy === 'rollNumber') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else setSortBy('rollNumber');
                  }}
                >
                  Roll {sortBy === 'rollNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th rowSpan={2} 
                  className="p-3 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-700 min-w-[180px] cursor-pointer hover:text-white transition-colors"
                  onClick={() => {
                    if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else setSortBy('name');
                  }}
                >
                  Student Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                {subjects.map(sub => (
                  <th key={sub.id} colSpan={!showDetailed ? 3 : (sub.hasPractical ? 4 : 3)} className="p-1 px-3 text-[10px] font-bold uppercase text-indigo-300 border-r border-slate-700 text-center bg-indigo-500/5 group">
                    <div className="flex items-center justify-center gap-2">
                       {sub.name}
                       {sub.hasPractical && (
                         <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubjects(subjects.map(s => s.id === sub.id ? { ...s, showGPOnly: !s.showGPOnly, showLGOnly: false } : s));
                            }}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${sub.showGPOnly ? 'text-amber-400' : 'text-slate-600 opacity-20 group-hover:opacity-100'}`}
                            title={sub.showGPOnly ? "Showing GP" : "Show GP"}
                          >
                            GP
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubjects(subjects.map(s => s.id === sub.id ? { ...s, showLGOnly: !s.showLGOnly, showGPOnly: false } : s));
                            }}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${sub.showLGOnly ? 'text-purple-400' : 'text-slate-600 opacity-20 group-hover:opacity-100'}`}
                            title={sub.showLGOnly ? "Showing LG" : "Show LG"}
                          >
                            LG
                          </button>
                         </div>
                       )}
                    </div>
                  </th>
                ))}
                <th rowSpan={2} 
                  className="p-3 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-700 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => {
                    if (sortBy === 'gpa') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else setSortBy('gpa');
                  }}
                >
                  GPA {sortBy === 'gpa' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th rowSpan={2} 
                  className="p-3 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-700 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => {
                    if (sortBy === 'rank') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else setSortBy('rank');
                  }}
                >
                  Rank {sortBy === 'rank' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th rowSpan={2} 
                  className="p-3 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-700 text-center cursor-pointer hover:text-white transition-colors"
                  onClick={() => {
                    if (sortBy === 'attendance') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else setSortBy('attendance');
                  }}
                >
                  Atten. {sortBy === 'attendance' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th rowSpan={2} className="p-3 text-[10px] font-bold uppercase text-slate-400 text-right sticky right-0 bg-slate-900 border-l border-slate-700 shadow-l">Actions</th>
              </tr>
              <tr className="bg-slate-900/50 border-b border-slate-700">
                {subjects.map(sub => (
                  <React.Fragment key={sub.id}>
                    {sub.hasPractical && showDetailed ? (
                      <>
                        <th className="p-1.5 text-[9px] font-bold text-slate-500 border-r border-slate-800/50 text-center w-10">
                          {sub.showGPOnly ? 'Th(GP)' : sub.showLGOnly ? 'Th(LG)' : 'Th'}
                        </th>
                        <th className="p-1.5 text-[9px] font-bold text-slate-500 border-r border-slate-800/50 text-center w-10">
                          {sub.showGPOnly ? 'In(GP)' : sub.showLGOnly ? 'In(LG)' : 'In'}
                        </th>
                      </>
                    ) : (
                      <th className="p-1.5 text-[9px] font-bold text-slate-500 border-r border-slate-800/50 text-center w-10">
                        {sub.showGPOnly ? 'M(GP)' : sub.showLGOnly ? 'M(LG)' : 'Total'}
                      </th>
                    )}
                    <th className="p-1.5 text-[9px] font-bold text-slate-500 border-r border-slate-800/50 text-center w-10">GP</th>
                    <th className="p-1.5 text-[9px] font-bold text-slate-500 border-r border-slate-700 text-center w-10">LG</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredStudents.map((s) => (
                <tr key={s.id} className={`hover:bg-slate-800/30 transition-colors ${editingId === s.id ? 'bg-indigo-500/5' : ''}`}>
                  <td className="p-2 text-[11px] font-bold text-white border-r border-slate-800/50 text-center">
                    {editingId === s.id ? (
                      <input className="bg-slate-800 border-none rounded p-1 w-12 text-center text-[10px]" value={editForm.rollNumber} onChange={e => setEditForm({...editForm, rollNumber: e.target.value})}/>
                    ) : s.rollNumber}
                  </td>
                  <td className="p-2 text-[11px] font-medium text-slate-300 border-r border-slate-800/50 truncate max-w-[180px]">
                    {editingId === s.id ? (
                      <input className="bg-slate-800 border-none rounded p-1 w-full text-[10px]" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/>
                    ) : s.name.toUpperCase()}
                  </td>
                  
                  {subjects.map(sub => {
                    let totalMark = 0;
                    let thMark = 0;
                    let inMark = 0;
                    if (sub.hasPractical) {
                      thMark = (editingId === s.id ? editForm.marks?.[sub.id + '_th'] : s.marks[sub.id + '_th']) || 0;
                      inMark = (editingId === s.id ? editForm.marks?.[sub.id + '_in'] : s.marks[sub.id + '_in']) || 0;
                      totalMark = thMark + inMark;
                    } else {
                      totalMark = (editingId === s.id ? editForm.marks?.[sub.id] : s.marks[sub.id]) || 0;
                    }

                    const lgTotal = getLetterGrade(totalMark, sub.fullMarks);
                    const gpTotal = getGradePoint(totalMark, sub.fullMarks);
                    const isSubNGText = lgTotal === 'NG';
                    
                    return (
                      <React.Fragment key={sub.id}>
                        {sub.hasPractical && showDetailed ? (
                          <>
                            <td className="p-1 border-r border-slate-800/30 text-center w-10 transition-colors">
                              {editingId === s.id ? (
                                <input type="number" className="bg-slate-800 border-none rounded p-0.5 w-10 text-center text-[9px]" value={editForm.marks?.[sub.id + '_th'] || 0} onChange={e => updateMark(sub.id + '_th', parseFloat(e.target.value) || 0)}/>
                              ) : (
                                <span className={`text-[10px] font-medium transition-colors ${isSubNGText ? 'text-rose-500' : sub.showGPOnly ? 'text-amber-400' : sub.showLGOnly ? 'text-purple-400' : 'text-slate-300'}`}>
                                  {sub.showGPOnly 
                                    ? getGradePoint(s.marks[sub.id + '_th'] || 0, sub.thFullMarks || 75) 
                                    : sub.showLGOnly 
                                      ? getLetterGrade(s.marks[sub.id + '_th'] || 0, sub.thFullMarks || 75)
                                      : (s.marks[sub.id + '_th'] || 0)
                                  }
                                </span>
                              )}
                            </td>
                            <td className="p-1 border-r border-slate-800/30 text-center w-10 transition-colors">
                              {editingId === s.id ? (
                                <input type="number" className="bg-slate-800 border-none rounded p-0.5 w-10 text-center text-[9px]" value={editForm.marks?.[sub.id + '_in'] || 0} onChange={e => updateMark(sub.id + '_in', parseFloat(e.target.value) || 0)}/>
                              ) : (
                                <span className={`text-[10px] font-medium transition-colors ${isSubNGText ? 'text-rose-500' : sub.showGPOnly ? 'text-amber-400' : sub.showLGOnly ? 'text-purple-400' : 'text-slate-300'}`}>
                                  {sub.showGPOnly 
                                    ? getGradePoint(s.marks[sub.id + '_in'] || 0, sub.inFullMarks || 25) 
                                    : sub.showLGOnly
                                      ? getLetterGrade(s.marks[sub.id + '_in'] || 0, sub.inFullMarks || 25)
                                      : (s.marks[sub.id + '_in'] || 0)
                                  }
                                </span>
                              )}
                            </td>
                          </>
                        ) : (
                          <td className="p-1 border-r border-slate-800/30 text-center w-10 transition-colors">
                            {editingId === s.id ? (
                              <input type="number" className="bg-slate-800 border-none rounded p-0.5 w-10 text-center text-[9px]" value={sub.hasPractical ? ((editForm.marks?.[sub.id + '_th'] || 0) + (editForm.marks?.[sub.id + '_in'] || 0)) : (editForm.marks?.[sub.id] || 0)} readOnly/>
                            ) : (
                              <span className={`text-[10px] font-medium transition-colors ${isSubNGText ? 'text-rose-500' : sub.showGPOnly ? 'text-amber-400' : sub.showLGOnly ? 'text-purple-400' : 'text-slate-300'}`}>
                                {sub.showGPOnly 
                                  ? getGradePoint(totalMark, sub.fullMarks) 
                                  : sub.showLGOnly
                                    ? lgTotal
                                    : totalMark
                                }
                              </span>
                            )}
                          </td>
                        )}
                        <td className="p-1 border-r border-slate-800/30 text-center w-10">
                          <span className={`text-[9px] font-bold ${isSubNGText ? 'text-rose-500/70' : 'text-amber-500/70'}`}>{gpTotal}</span>
                        </td>
                        <td className="p-1 border-r border-slate-700/50 text-center w-10 bg-slate-900/20">
                          <span className={`text-[9px] font-black ${isSubNGText ? 'text-rose-600' : 'text-indigo-400'}`}>{lgTotal}</span>
                        </td>
                      </React.Fragment>
                    );
                  })}

                  <td className="p-2 text-[11px] font-bold text-center border-r border-slate-800/50 min-w-[50px]">
                    <span className={s.status === 'NG' ? 'text-rose-500' : 'text-emerald-400'}>
                      {s.gpa.toFixed(2)}
                    </span>
                  </td>
                  <td className={`p-2 text-[11px] font-black text-center border-r border-slate-800/50 min-w-[50px] ${s.status === 'NG' ? 'text-rose-500/80' : 'text-amber-500'}`}>
                    {s.rank ? `#${s.rank}` : '-'}
                  </td>
                  <td className="p-2 text-[11px] text-center border-r border-slate-800/50 text-slate-400 w-12 text-center">
                    {editingId === s.id ? (
                      <input className="bg-slate-800 border-none rounded p-1 w-10 text-center text-[10px]" value={editForm.attendance} onChange={e => setEditForm({...editForm, attendance: parseFloat(e.target.value) || 0})}/>
                    ) : s.attendance}
                  </td>
                  <td className="p-2 text-right sticky right-0 bg-slate-900/90 backdrop-blur-sm border-l border-slate-700 shadow-l">
                    <div className="flex items-center justify-end gap-1.5">
                      {editingId === s.id ? (
                        <>
                          <button onClick={handleSave} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
                            <Save size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEdit(s)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handlePreview(s)}
                            className="p-1.5 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-lg transition-colors"
                            title="Preview GradeSheet"
                          >
                            <FileText size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center text-slate-700">
               <Search size={32} />
            </div>
            <p className="text-slate-500">No students found matching your criteria.</p>
          </div>
        )}
      </div>

      <PDFPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfUrl={previewUrl}
        title={previewTitle}
        subtitle={previewSubtitle}
        onDownload={() => {
          const link = document.createElement('a');
          link.href = previewUrl;
          link.download = downloadFilename;
          link.click();
        }}
      />
    </div>
  );
};

export default ResultsTable;
