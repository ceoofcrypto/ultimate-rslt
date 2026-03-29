import { createContext, useContext } from 'react';
import type { Student, Subject, SchoolConfig } from '../lib/db';

export interface ResultContextType {
  students: Student[];
  subjects: Subject[];
  config: SchoolConfig;
  currentClass: string;
  availableClasses: string[];
  loading: boolean;
  setStudents: (students: Student[]) => void;
  setSubjects: (subjects: Subject[]) => void;
  setConfig: (config: SchoolConfig) => void;
  setCurrentClass: (className: string) => void;
  refreshData: () => Promise<void>;
  resetData: () => Promise<void>;
}

export const ResultContext = createContext<ResultContextType | undefined>(undefined);

export const useResult = () => {
  const context = useContext(ResultContext);
  if (context === undefined) {
    throw new Error('useResult must be used within a ResultProvider');
  }
  return context;
};
