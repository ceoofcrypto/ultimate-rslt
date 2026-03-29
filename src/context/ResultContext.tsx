import React, { useEffect, useState } from 'react';
import { db } from '../lib/db';
import type { Student, Subject, SchoolConfig } from '../lib/db';
import { calculateResult, calculateRanks } from '../utils/processor';
import { ResultContext } from './ResultContextCore';

export const ResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudentsState] = useState<Student[]>([]);
  const [subjects, setSubjectsState] = useState<Subject[]>([]);
  const [config, setConfigState] = useState<SchoolConfig>({
    id: 'default',
    name: 'Your School Name',
    address: 'School Address',
    academicYear: '2080-2081',
    terminalName: 'Annual Examination',
    section: 'A',
    className: 'TEN',
    estdYear: '2061',
    issuedDate: '2082-03-30'
  });
  const [currentClass, setCurrentClassState] = useState<string>('TEN');
  const [availableClasses, setAvailableClasses] = useState<string[]>(['TEN']);
  const [loading, setLoading] = useState(true);

  const refreshData = async (targetClass?: string) => {
    setLoading(true);
    try {
      const c = await db.getConfig();
      const activeClass = targetClass || c.className || currentClass;

      const [allClasses, s, sub, dbConfig] = await Promise.all([
        db.getAllClassNames(),
        db.getStudents(activeClass),
        db.getSubjects(activeClass),
        db.getConfig()
      ]);

      // Auto-recalculate all students with the latest subject config to guarantee GPA is always correct
      const updatedStudents = s.map(student => 
        calculateResult(student.rollNumber, student.name, activeClass, student.marks, student.attendance, sub)
      );

      const ranked = calculateRanks(updatedStudents);
      setAvailableClasses(allClasses.length > 0 ? allClasses : [activeClass]);
      setCurrentClassState(activeClass);
      setStudentsState(ranked);
      setSubjectsState(sub);
      setConfigState(dbConfig || c);
      
      // Persist the recalculated results automatically in background
      if (updatedStudents.length > 0) {
        db.saveStudents(ranked, activeClass).catch(console.error);
      }
    } catch (error) {
      console.error('Failed to load data from IndexedDB', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const setCurrentClass = async (className: string) => {
    setCurrentClassState(className);
    await refreshData(className);
  };

  const setStudents = async (s: Student[]) => {
    const rankedStudents = calculateRanks(s);
    // Ensure all students have the correct className
    const studentsWithClass = rankedStudents.map(student => ({
      ...student,
      className: currentClass
    }));
    await db.saveStudents(studentsWithClass, currentClass);
    setStudentsState(studentsWithClass);
    
    // Update available classes if a new one was added
    const allClasses = await db.getAllClassNames();
    setAvailableClasses(allClasses);
  };

  const setSubjects = async (sub: Subject[]) => {
    const subjectsWithClass = sub.map(s => ({
      ...s,
      className: currentClass,
      id: `${currentClass}_${s.id.split('_').slice(1).join('_') || s.id}` // Ensure unique ID per class
    }));
    await db.saveSubjects(subjectsWithClass, currentClass);
    setSubjectsState(subjectsWithClass);
  };

  const setConfig = async (c: SchoolConfig) => {
    await db.saveConfig(c);
    setConfigState(c);
  };

  const resetData = async () => {
    await db.clearAll();
    setStudentsState([]);
    setSubjectsState([]);
    setAvailableClasses([]);
  };

  return (
    <ResultContext.Provider value={{
      students,
      subjects,
      config,
      currentClass,
      availableClasses,
      loading,
      setStudents,
      setSubjects,
      setConfig,
      setCurrentClass,
      refreshData,
      resetData
    }}>
      {children}
    </ResultContext.Provider>
  );
};
