import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student, Subject, SchoolConfig } from '../lib/db';

import { getLetterGrade, getGradePoint } from './processor';
import logo from '../assets/logo.png';

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    // No need to declare autoTable here if we use the default export
  }
}

const drawHeader = (doc: jsPDF, config: SchoolConfig) => {
  // Logo
  try {
    doc.addImage(logo, 'PNG', 15, 12, 30, 30);
  } catch (e) {
    console.error("Logo failed to load", e);
  }

  const pageWidth = 210;
  const centerX = pageWidth / 2;

  // School Name
  const schoolName = config.name.toUpperCase();
  let fontSize = 22;
  const maxTextWidth = 140; // Allow it to span most of the page but avoid logo
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  
  // Dynamic font size for long names
  while (doc.getTextWidth(schoolName) > maxTextWidth && fontSize > 14) {
    fontSize -= 1;
    doc.setFontSize(fontSize);
  }

  doc.setTextColor(22, 163, 74); // green-600
  doc.text(schoolName, centerX + 10, 20, { align: 'center' }); // Offset center slightly to the right to balance logo
  
  // Address
  fontSize = 11;
  doc.setFontSize(fontSize);
  doc.setFont('helvetica', 'bold');
  doc.text(config.address.toUpperCase(), centerX + 10, 27, { align: 'center' });
  
  // ESTD
  doc.setFontSize(10);
  doc.text(`ESTD: ${config.estdYear}`, centerX + 10, 33, { align: 'center' });

  // Terminal Name (centered on full page)
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`${config.terminalName.toUpperCase()} - ${config.academicYear}`, pageWidth / 2, 45, { align: 'center' });
  
  // Title (centered on full page)
  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74);
  doc.text("GRADE SHEET", pageWidth / 2, 53, { align: 'center' });
  doc.setLineWidth(0.5);
  doc.line((pageWidth / 2) - 25, 55, (pageWidth / 2) + 25, 55); // underline
};

const drawStudentInfo = (doc: jsPDF, student: Student, config: SchoolConfig) => {
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  doc.text("THE GRADE(S) SECURED BY", 20, 70);
  doc.setFont('helvetica', 'bold');
  doc.text(student.name.toUpperCase(), 75, 70);
  doc.line(70, 71, 160, 71);

  doc.setFont('helvetica', 'normal');
  doc.text("ROLL NO", 20, 78);
  doc.setFont('helvetica', 'bold');
  doc.text(student.rollNumber, 40, 78);
  doc.line(38, 79, 50, 79);

  doc.setFont('helvetica', 'normal');
  doc.text("STUDENT OF GRADE", 60, 78);
  doc.setFont('helvetica', 'bold');
  doc.text(config.className.toUpperCase(), 105, 78);
  doc.line(100, 79, 130, 79);

  doc.setFont('helvetica', 'normal');
  doc.text("IN THE ", 140, 78);
  doc.setFont('helvetica', 'bold');
  const termFirstWord = config.terminalName.split(' ')[0].toUpperCase();
  doc.text(termFirstWord, 155, 78);

  doc.setFont('helvetica', 'normal');
  doc.text(`EXAMINATION CONDUCTED IN ${config.academicYear.split('-')[1] || config.academicYear} BS.`, 20, 86);
};

const drawGradesheetContent = (doc: jsPDF, student: Student, subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true) => {
  drawHeader(doc, config);
  drawStudentInfo(doc, student, config);

  const hasPracticalSubjects = subjects.some(s => s.hasPractical) && showDetailed;

  const tableData = subjects.map((sub, index) => {
    let mark = 0;
    let thMark = 0;
    let inMark = 0;

    if (sub.hasPractical) {
      thMark = student.marks[sub.id + '_th'] || 0;
      inMark = student.marks[sub.id + '_in'] || 0;
      mark = thMark + inMark;
    } else {
      mark = student.marks[sub.id] || 0;
    }

    const grade = getLetterGrade(mark, sub.fullMarks);
    
    const getGPFromMark = (m: number, fm: number) => {
      const p = (m / fm) * 100;
      if (p >= 90) return 4.0;
      if (p >= 80) return 3.6;
      if (p >= 70) return 3.2;
      if (p >= 60) return 2.8;
      if (p >= 50) return 2.4;
      if (p >= 40) return 2.0;
      if (p >= 35) return 1.6;
      return 0;
    };

    const gp = getGPFromMark(mark, sub.fullMarks);
    
    if (showDetailed && hasPracticalSubjects) {
      // Use common labels for TH/IN columns
      const displayTh = sub.showGPOnly 
        ? getGPFromMark(thMark, sub.thFullMarks || 75).toFixed(2)
        : sub.showLGOnly
          ? getLetterGrade(thMark, sub.thFullMarks || 75)
          : (sub.hasPractical ? thMark.toString() : mark.toString());
        
      const displayIn = sub.showGPOnly
        ? (sub.hasPractical ? getGPFromMark(inMark, sub.inFullMarks || 25).toFixed(2) : '-')
        : sub.showLGOnly
          ? (sub.hasPractical ? getLetterGrade(inMark, sub.inFullMarks || 25) : '-')
          : (sub.hasPractical ? inMark.toString() : '-');

      return [
        (index + 1).toString(),
        sub.name.toUpperCase(),
        sub.creditHour.toFixed(1),
        displayTh,
        displayIn,
        gp.toFixed(2),
        grade,
        ''
      ];
    } else {
      const displayM = sub.showGPOnly 
        ? gp.toFixed(2) 
        : sub.showLGOnly 
          ? grade 
          : mark.toString();
      return [
        (index + 1).toString(),
        sub.name.toUpperCase(),
        sub.creditHour.toFixed(1),
        displayM,
        gp.toFixed(2),
        grade,
        ''
      ];
    }
  });

  const isNG = student.status === 'NG';
  const gpaDisplay = isNG ? 'NG' : student.gpa.toFixed(2);

  if (showDetailed && hasPracticalSubjects) {
    autoTable(doc, {
      startY: 95,
      head: [
        [
          { content: 'S.N.', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'SUBJECT', rowSpan: 2 },
          { content: 'CREDIT\nHOURS', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'OBTAINED', colSpan: 4, styles: { halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2 }
        ],
        [
          subjects.every(s => s.showGPOnly) ? 'TH(GP)' : subjects.every(s => s.showLGOnly) ? 'TH(LG)' : 'TH',
          subjects.every(s => s.showGPOnly) ? 'IN(GP)' : subjects.every(s => s.showLGOnly) ? 'IN(LG)' : 'IN',
          'GP',
          'GRADE'
        ]
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 2, textColor: 0, lineWidth: 0.1 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 16 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'center', cellWidth: 16 },
        6: { halign: 'center', cellWidth: 18 },
        7: { cellWidth: 25 }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 6) {
          if (data.cell.raw === 'NG') {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      foot: [
        [{ content: 'GRADE POINT AVERAGE (GPA)', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: gpaDisplay, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, '']
      ],
      footStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 }
    });
  } else {
    autoTable(doc, {
      startY: 95,
      head: [
        [
          { content: 'S.N.', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'SUBJECT', rowSpan: 2 },
          { content: 'CREDIT\nHOURS', rowSpan: 2, styles: { halign: 'center' } },
          { content: 'OBTAINED', colSpan: 3, styles: { halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2 }
        ],
        [
          subjects.every(s => s.showGPOnly) ? 'GP' : subjects.every(s => s.showLGOnly) ? 'LG' : 'MARKS',
          'GP',
          'GRADE'
        ]
      ],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 2, textColor: 0, lineWidth: 0.1 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 20 },
        6: { cellWidth: 25 }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'NG') {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      foot: [
        [{ content: 'GRADE POINT AVERAGE (GPA)', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: gpaDisplay, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } }, '']
      ],
      footStyles: { fillColor: [255, 255, 255], textColor: 0, lineWidth: 0.1 }
    });
  }

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  doc.setDrawColor(134, 239, 172);
  doc.setLineWidth(1);
  doc.roundedRect(20, currentY, 170, 12, 3, 3);
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`ATTENDANCE: ${student.attendance}`, 25, currentY + 7.5);
  doc.text(`RANK: ${isNG ? 'NG' : (student.rank || '-')}`, 90, currentY + 7.5, { align: 'center' });
  const resultText = isNG ? 'NG' : student.gpa.toFixed(2);
  doc.text(`RESULT: ${resultText}`, 185, currentY + 7.5, { align: 'right' });

  currentY += 25;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  
  // Left: Prepared By
  if (config.preparedBySig) {
    try {
      doc.addImage(config.preparedBySig, 'PNG', 20, currentY - 18, 40, 15);
    } catch (e) { console.error("Prepared By Sig failed", e); }
  }
  doc.line(20, currentY, 60, currentY);
  doc.text("PREPARED BY:", 20, currentY + 5);

  // Center: Checked By
  doc.line(85, currentY, 125, currentY);
  doc.text("CHECKED BY:", 85, currentY + 5);

  // Right: Principal
  if (config.principalSig) {
    try {
      doc.addImage(config.principalSig, 'PNG', 150, currentY - 18, 40, 15);
    } catch (e) { console.error("Principal Sig failed", e); }
  }
  doc.line(150, currentY, 190, currentY);
  doc.text("PRINCIPAL", 160, currentY + 5);

  currentY += 15;
  doc.line(20, currentY, 190, currentY);
  currentY += 10;

  doc.setFontSize(9);
  doc.text(`DATE OF ISSUED: ${config.issuedDate}`, 20, currentY);
  doc.text("NOTE: ONE CREDIT HOUR IS EQUALS TO 32 WORKING HOURS.", 20, currentY + 8);
  doc.text("ABS: ABSENT", 20, currentY + 16);
  doc.text("NG= NOT-GRADED", 20, currentY + 24);

  const scaleData = [
    ['A+', '4.0', 'Outstanding'],
    ['A', '3.6', 'Excellent'],
    ['B+', '3.2', 'Very Good'],
    ['B', '2.8', 'Good'],
    ['C+', '2.4', 'Satisfactory'],
    ['C', '2.0', 'Acceptable'],
    ['D', '1.6', 'Basic'],
    ['NG', 'NG', 'Not-Graded']
  ];

  autoTable(doc, {
    startY: currentY - 5,
    margin: { left: 130 },
    head: [['GRADE', 'GPA', 'REMARKS']],
    body: scaleData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 30 }
    }
  });
};

export const generateGradeSheet = (student: Student, subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true) => {
  const doc = new jsPDF();
  drawGradesheetContent(doc, student, subjects, config, showDetailed);
  doc.save(`${student.rollNumber}_${student.name.replace(/\s+/g, '_')}_Gradesheet.pdf`);
};

export const generateGradeSheetBlob = (student: Student, subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true): Blob => {
  const doc = new jsPDF();
  drawGradesheetContent(doc, student, subjects, config, showDetailed);
  return doc.output('blob');
};

export const generateBulkGradeSheets = (students: Student[], subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true) => {
  const doc = new jsPDF();
  students.forEach((student, index) => {
    if (index > 0) doc.addPage();
    drawGradesheetContent(doc, student, subjects, config, showDetailed);
  });
  doc.save(`Bulk_Gradesheets_${config.academicYear}.pdf`);
};

const drawLedgerContent = (doc: jsPDF, students: Student[], subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  try {
    doc.addImage(logo, 'PNG', 10, 5, 18, 18);
  } catch (e) { /* ignore */ }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(22, 163, 74);
  doc.text(config.name.toUpperCase(), pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(config.address.toUpperCase(), pageWidth / 2, 17, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${config.terminalName.toUpperCase()} - ${config.academicYear} | RESULT LEDGER`, pageWidth / 2, 23, { align: 'center' });

  // Build header rows
  const headerRow1: any[] = [
    { content: 'Roll', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Student Name', rowSpan: 2, styles: { valign: 'middle' } },
  ];
  subjects.forEach(sub => {
    const colSpan = (sub.hasPractical && showDetailed) ? 4 : 3;
    headerRow1.push({ content: sub.name.toUpperCase(), colSpan, styles: { halign: 'center', fillColor: [240, 245, 255] } });
  });
  headerRow1.push(
    { content: 'GPA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Rank', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Atten.', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Status', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
  );

  const headerRow2: any[] = [];
  subjects.forEach(sub => {
      if (sub.hasPractical && showDetailed) {
        headerRow2.push(
          { content: sub.showGPOnly ? 'Th(GP)' : sub.showLGOnly ? 'Th(LG)' : 'Th', styles: { halign: 'center', fontSize: 6 } },
          { content: sub.showGPOnly ? 'In(GP)' : sub.showLGOnly ? 'In(LG)' : 'In', styles: { halign: 'center', fontSize: 6 } },
        );
      } else {
        headerRow2.push(
          { content: sub.showGPOnly ? 'M(GP)' : sub.showLGOnly ? 'M(LG)' : 'Total', styles: { halign: 'center', fontSize: 6 } },
        );
      }
    headerRow2.push(
      { content: 'GP', styles: { halign: 'center', fontSize: 6 } },
      { content: 'LG', styles: { halign: 'center', fontSize: 6 } },
    );
  });

  // Build body rows
  const sortedStudents = [...students].sort((a, b) => (parseFloat(a.rollNumber) || 0) - (parseFloat(b.rollNumber) || 0));

  const bodyRows = sortedStudents.map(s => {
    const row: any[] = [
      { content: s.rollNumber, styles: { halign: 'center' } },
      s.name.toUpperCase(),
    ];

    subjects.forEach(sub => {
      let totalMark = 0;
      if (sub.hasPractical) {
        const thMark = s.marks[sub.id + '_th'] || 0;
        const inMark = s.marks[sub.id + '_in'] || 0;
        totalMark = thMark + inMark;
        
        if (showDetailed) {
          const displayTh = sub.showGPOnly 
            ? getGradePoint(thMark, sub.thFullMarks || 75) 
            : sub.showLGOnly 
              ? getLetterGrade(thMark, sub.thFullMarks || 75)
              : thMark.toString();
          const displayIn = sub.showGPOnly 
            ? getGradePoint(inMark, sub.inFullMarks || 25) 
            : sub.showLGOnly
              ? getLetterGrade(inMark, sub.inFullMarks || 25)
              : inMark.toString();

          row.push(
            { content: displayTh, styles: { halign: 'center' } },
            { content: displayIn, styles: { halign: 'center' } },
          );
        } else {
          const displayM = sub.showGPOnly 
            ? getGradePoint(totalMark, sub.fullMarks) 
            : sub.showLGOnly
              ? getLetterGrade(totalMark, sub.fullMarks)
              : totalMark.toString();
          row.push(
            { content: displayM, styles: { halign: 'center' } },
          );
        }
      } else {
        totalMark = s.marks[sub.id] || 0;
        const displayM = sub.showGPOnly 
          ? getGradePoint(totalMark, sub.fullMarks) 
          : sub.showLGOnly
            ? getLetterGrade(totalMark, sub.fullMarks)
            : totalMark.toString();
        row.push(
          { content: displayM, styles: { halign: 'center' } },
        );
      }
      const gp = getGradePoint(totalMark, sub.fullMarks);
      const lg = getLetterGrade(totalMark, sub.fullMarks);
      row.push(
        { content: gp, styles: { halign: 'center' } },
        { content: lg, styles: { halign: 'center' } },
      );
    });

    const isNG = s.status === 'NG';
    row.push(
      { content: isNG ? 'NG' : s.gpa.toFixed(2), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: isNG ? 'NG' : (s.rank?.toString() || '-'), styles: { halign: 'center' } },
      { content: s.attendance.toString(), styles: { halign: 'center' } },
      { content: s.status, styles: { halign: 'center', fontStyle: 'bold' } },
    );

    return row;
  });

  autoTable(doc, {
    startY: 27,
    head: [headerRow1, headerRow2],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.5, textColor: 0, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', fontSize: 7 },
    didParseCell: (data: any) => {
      // Color NG grades/status red
      if (data.section === 'body') {
        const cellText = String(data.cell.raw?.content || data.cell.raw || '');
        if (cellText === 'NG') {
          data.cell.styles.textColor = [220, 38, 38];
        }
        if (cellText === 'PASS') {
          data.cell.styles.textColor = [22, 163, 74];
        }
      }
    },
    margin: { left: 5, right: 5 },
  });
};

export const generateLedgerPDF = (students: Student[], subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawLedgerContent(doc, students, subjects, config, showDetailed);
  doc.save(`${config.name.replace(/\s+/g, '_')}_Result_Ledger_${config.academicYear}.pdf`);
};

export const generateLedgerBlob = (students: Student[], subjects: Subject[], config: SchoolConfig, showDetailed: boolean = true): Blob => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  drawLedgerContent(doc, students, subjects, config, showDetailed);
  return doc.output('blob');
};
