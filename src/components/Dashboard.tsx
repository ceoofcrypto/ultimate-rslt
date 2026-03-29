import React from 'react';
import { Users, BookOpen, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { useResult } from '../context/ResultContextCore';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const { students, subjects } = useResult();

  const totalStudents = students.length;
  const passedStudents = students.filter(s => s.status === 'PASS').length;
  const failedStudents = totalStudents - passedStudents;
  const passPercentage = totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : '0';

  const stats = [
    { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Subjects', value: subjects.length, icon: BookOpen, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
    { label: 'Passed', value: passedStudents, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Not Graded (NG)', value: failedStudents, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Overview Statistics</h3>
          <p className="text-slate-400 mt-1">Real-time summary of academic performance.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-medium">
          <TrendingUp size={16} />
          <span>Pass Rate: {passPercentage}%</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card flex flex-col gap-4"
          >
            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
              <h4 className="text-3xl font-bold text-white mt-1">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card h-64 flex flex-col items-center justify-center text-slate-500 border-dashed border-2 border-slate-800">
           <p className="text-sm italic">Subject-wise performance chart will appear here after data processing.</p>
        </div>
        <div className="glass-card flex flex-col gap-4">
          <h4 className="font-semibold text-white">Top Performers</h4>
          {students.length === 0 ? (
             <p className="text-slate-500 text-sm italic mt-4">No data available yet.</p>
          ) : (
            <div className="space-y-4 mt-2">
               {students.sort((a, b) => b.percentage - a.percentage).slice(0, 5).map((s, idx) => (
                 <div key={s.rollNumber} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                       #{idx + 1}
                     </div>
                     <span className="text-sm font-medium text-slate-200">{s.name}</span>
                   </div>
                   <span className="text-sm font-bold text-indigo-400">{s.percentage}%</span>
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
