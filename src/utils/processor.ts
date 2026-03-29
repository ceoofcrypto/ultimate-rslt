import type { Student, Subject } from '../lib/db';

export const calculateResult = (
  rollNumber: string,
  name: string,
  className: string, // Added for multi-class
  marks: Record<string, number>,
  attendance: number,
  subjects: Subject[]
): Student => {
  let totalMarks = 0;
  let totalFullMarks = 0;
  let passCount = 0;
  let totalWeightedGradePoints = 0;
  let totalCreditHours = 0;

  subjects.forEach(sub => {
    let mark = 0;
    if (sub.hasPractical) {
      const thMark = marks[sub.id + '_th'] || 0;
      const inMark = marks[sub.id + '_in'] || 0;
      mark = thMark + inMark;
    } else {
      mark = marks[sub.id] || 0;
    }
    totalMarks += mark;
    totalFullMarks += sub.fullMarks;
    
    // Check if passed this subject (default to 35% of full marks if not set or invalid)
    const subPassMarks = sub.passMarks || Math.ceil(sub.fullMarks * 0.35);
    if (mark >= subPassMarks) {
      passCount++;
    }

    // GPA Logic (Nepal Standard or similar v4.0)
    const percentageInSub = (mark / sub.fullMarks) * 100;
    let gp = 0;
    if (percentageInSub >= 90) gp = 4.0;
    else if (percentageInSub >= 80) gp = 3.6;
    else if (percentageInSub >= 70) gp = 3.2;
    else if (percentageInSub >= 60) gp = 2.8;
    else if (percentageInSub >= 50) gp = 2.4;
    else if (percentageInSub >= 40) gp = 2.0;
    else if (percentageInSub >= 35) gp = 1.6;
    else gp = 0;

    totalWeightedGradePoints += (gp * sub.creditHour);
    totalCreditHours += sub.creditHour;
  });

  const percentage = totalFullMarks > 0 ? (totalMarks / totalFullMarks) * 100 : 0;
  const gpa = totalCreditHours > 0 ? totalWeightedGradePoints / totalCreditHours : 0;
  
  // A student gets NG if they fail any subject
  const status = passCount === subjects.length ? 'PASS' : 'NG';

  // Final Letter Grade based on GPA
  let grade = 'NG';
  if (status === 'PASS') {
    if (gpa >= 3.6) grade = 'A+';
    else if (gpa >= 3.2) grade = 'A';
    else if (gpa >= 2.8) grade = 'B+';
    else if (gpa >= 2.4) grade = 'B';
    else if (gpa >= 2.0) grade = 'C+';
    else if (gpa >= 1.6) grade = 'C';
    else if (gpa >= 1.2) grade = 'D';
    else grade = 'NG';
  }

  return {
    rollNumber,
    name,
    className,
    marks,
    attendance,
    totalMarks,
    percentage: parseFloat(percentage.toFixed(2)),
    gpa: parseFloat(gpa.toFixed(2)),
    status,
    grade
  };
};

export const calculateRanks = (students: Student[]): Student[] => {
  const sorted = [...students].sort((a, b) => {
    const gpaA = Math.round(a.gpa * 100);
    const gpaB = Math.round(b.gpa * 100);
    if (gpaB !== gpaA) return gpaB - gpaA;
    return b.totalMarks - a.totalMarks;
  });

  // Get unique GPAs for dense ranking
  const uniqueGpas = Array.from(new Set(sorted.map(s => Math.round(s.gpa * 100)))).sort((a, b) => b - a);

  return students.map(student => {
    const sGpa = Math.round(student.gpa * 100);
    const rank = uniqueGpas.indexOf(sGpa) + 1;
    return { ...student, rank };
  });
};

export const getLetterGrade = (mark: number, fullMarks: number): string => {
  if (fullMarks === 0) return 'NG';
  const percentage = (mark / fullMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 35) return 'D';
  return 'NG';
};

export const getGradePoint = (mark: number, fullMarks: number): string => {
  if (fullMarks === 0) return 'NG';
  const percentage = (mark / fullMarks) * 100;
  if (percentage >= 90) return '4.0';
  if (percentage >= 80) return '3.6';
  if (percentage >= 70) return '3.2';
  if (percentage >= 60) return '2.8';
  if (percentage >= 50) return '2.4';
  if (percentage >= 40) return '2.0';
  if (percentage >= 35) return '1.6';
  return 'NG';
};

export const detectSubjectsFromRow = (row: Record<string, any>): string[] => {
  const excludedColumns = ['roll', 'name', 'attendance', 'total', 'percentage', 'result', 'grade', 'remark', 'id', 's.n.', 'sn'];
  return Object.keys(row).filter(key => {
    const k = key.toLowerCase();
    return !excludedColumns.some(ex => k === ex || k.includes(ex));
  });
};
