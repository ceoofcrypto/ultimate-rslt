import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

export interface Student {
  id?: number;
  rollNumber: string;
  name: string;
  className: string; // Added for multi-class support
  marks: Record<string, number>; // subjectId -> mark
  attendance: number;
  totalMarks: number;
  percentage: number;
  status: 'PASS' | 'NG';
  grade: string;
  gpa: number;
  rank?: number;
}

export interface Subject {
  id: string; // combined className_id to ensure uniqueness
  className: string; // Added for multi-class support
  name: string; // display name
  fullMarks: number;
  passMarks: number;
  creditHour: number;
  order: number; // preserves original column order from Excel
  hasPractical?: boolean; // true if subject has Th/In split
  thFullMarks?: number; // Theory full marks (e.g. 75)
  inFullMarks?: number; // Internal/Practical full marks (e.g. 25)
  showGPOnly?: boolean; // If true, gradesheet shows GP instead of Marks for Th/In
  showLGOnly?: boolean; // If true, gradesheet shows Letter Grade instead of Marks
}

export interface ClassConfig {
  className: string;
  hasPractical: boolean;
  creditHours: Record<string, number>; // subjectId -> creditHour
}

export interface CHPreset {
  name: string;
  creditHours: Record<string, number>; // Subject Name -> creditHour
}

export interface SchoolConfig {
  id: string;
  name: string;
  address: string;
  academicYear: string;
  terminalName: string;
  section: string;
  className: string; // Current selected/default class
  estdYear: string;
  issuedDate: string;
  logo?: string;
  preparedBySig?: string;
  principalSig?: string;
}

interface ResultDB extends DBSchema {
  students: {
    key: number;
    value: Student;
    indexes: { 
      'by-roll': string;
      'by-class': string; 
    };
  };
  subjects: {
    key: string;
    value: Subject;
    indexes: { 'by-class': string };
  };
  config: {
    key: string;
    value: SchoolConfig;
  };
  classConfigs: {
    key: string;
    value: ClassConfig;
  };
  chPresets: {
    key: string;
    value: CHPreset;
  };
}

const DB_NAME = 'school-result-db';
const DB_VERSION = 4; // Incremented for CHPresets

export async function initDB(): Promise<IDBPDatabase<ResultDB>> {
  return openDB<ResultDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const studentStore = db.createObjectStore('students', {
          keyPath: 'id',
          autoIncrement: true,
        });
        studentStore.createIndex('by-roll', 'rollNumber', { unique: true });
        db.createObjectStore('subjects', { keyPath: 'id' });
        db.createObjectStore('config', { keyPath: 'id' });
      }
      
      if (oldVersion < 2) {
        // Migration to version 2
        const studentStore = transaction.objectStore('students');
        studentStore.createIndex('by-class', 'className');
        
        const subjectStore = transaction.objectStore('subjects');
        subjectStore.createIndex('by-class', 'className');
        
        if (!db.objectStoreNames.contains('classConfigs')) {
          db.createObjectStore('classConfigs', { keyPath: 'className' });
        }
      }

      if (oldVersion < 3) {
        const studentStore = transaction.objectStore('students');
        if (studentStore.indexNames.contains('by-roll')) {
          studentStore.deleteIndex('by-roll');
        }
        studentStore.createIndex('by-roll', 'rollNumber', { unique: false });
      }

      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('chPresets')) {
          db.createObjectStore('chPresets', { keyPath: 'name' });
        }
      }
    },
  });
}

export const db = {
  async getStudents(className?: string) {
    const d = await initDB();
    if (className) {
      return d.getAllFromIndex('students', 'by-class', className);
    }
    return d.getAll('students');
  },
  async saveStudents(students: Student[], className?: string) {
    const d = await initDB();
    const tx = d.transaction('students', 'readwrite');
    
    if (className) {
      // Clear only students of this class
      const index = tx.store.index('by-class');
      let cursor = await index.openKeyCursor(IDBKeyRange.only(className));
      while (cursor) {
        await tx.store.delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }
    } else {
      await tx.store.clear();
    }

    for (const student of students) {
      await tx.store.add(student);
    }
    await tx.done;
  },
  async getSubjects(className?: string) {
    const d = await initDB();
    let subjects: Subject[];
    if (className) {
      subjects = await d.getAllFromIndex('subjects', 'by-class', className);
    } else {
      subjects = await d.getAll('subjects');
    }
    return subjects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  },
  async saveSubjects(subjects: Subject[], className?: string) {
    const d = await initDB();
    const tx = d.transaction('subjects', 'readwrite');
    
    if (className) {
      const index = tx.store.index('by-class');
      let cursor = await index.openKeyCursor(IDBKeyRange.only(className));
      while (cursor) {
        await tx.store.delete(cursor.primaryKey);
        cursor = await cursor.continue();
      }
    } else {
      await tx.store.clear();
    }

    for (const subject of subjects) {
      await tx.store.add(subject);
    }
    await tx.done;
  },
  async getClassConfigs() {
    const d = await initDB();
    return d.getAll('classConfigs');
  },
  async getClassConfig(className: string) {
    const d = await initDB();
    return d.get('classConfigs', className);
  },
  async saveClassConfig(config: ClassConfig) {
    const d = await initDB();
    await d.put('classConfigs', config);
  },
  async getConfig() {
    const d = await initDB();
    const configs = await d.getAll('config');
    return configs[0] || { 
      id: 'default', 
      name: 'Your School Name', 
      address: 'School Address', 
      academicYear: '2080-2081',
      terminalName: 'Annual Examination',
      section: 'A',
      className: 'TEN',
      estdYear: '2061',
      issuedDate: '2082-03-30'
    };
  },
  async getAllClassNames() {
    const d = await initDB();
    const students = await d.getAll('students');
    const classes = new Set(students.map(s => s.className));
    return Array.from(classes).sort();
  },
  async saveConfig(config: SchoolConfig) {
    const d = await initDB();
    await d.put('config', config);
  },
  async clearAll() {
    const d = await initDB();
    await d.clear('students');
    await d.clear('subjects');
    await d.clear('classConfigs');
    await d.clear('chPresets');
  },
  async getCHPresets() {
    const d = await initDB();
    return d.getAll('chPresets');
  },
  async saveCHPreset(preset: CHPreset) {
    const d = await initDB();
    await d.put('chPresets', preset);
  },
  async deleteCHPreset(name: string) {
    const d = await initDB();
    await d.delete('chPresets', name);
  }
};
