import * as XLSX from 'xlsx';
import type { Student, Subject, SchoolConfig } from '../lib/db';

export const exportToExcel = (students: Student[], subjects: Subject[], config: SchoolConfig) => {
  // Prepare data for export
  const data = students.map(s => {
    const row: any = {
      'Roll': s.rollNumber,
      'Name': s.name,
    };

    // Add subject marks
    subjects.forEach(sub => {
      if (sub.hasPractical) {
        row[`${sub.name}-Th`] = s.marks[`${sub.id}_th`] || 0;
        row[`${sub.name}-In`] = s.marks[`${sub.id}_in`] || 0;
        row[`${sub.name}-Total`] = (s.marks[`${sub.id}_th`] || 0) + (s.marks[`${sub.id}_in`] || 0);
      } else {
        row[sub.name] = s.marks[sub.id] || 0;
      }
    });

    // Add totals and status
    row['Total Marks'] = s.totalMarks;
    row['GPA'] = s.gpa;
    row['Rank'] = s.rank || 'N/A';
    row['Attendance'] = s.attendance;
    row['Status'] = s.status;
    row['Grade'] = s.grade;

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Add FM row at the top (optional but helpful)
  // For simplicity, we just export the ledger as is.

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Result Ledger");

  // Save file
  const fileName = `${config.name.replace(/\s+/g, '_')}_Result_Ledger_${config.academicYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};
