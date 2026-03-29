import { calculateResult } from './src/utils/processor.js';

// mock subjects
const subjects = [
  { id: '1', name: 'English', fullMarks: 40, creditHour: '4' },
  { id: '2', name: 'Nepali', fullMarks: 40, creditHour: '4' },
  { id: '3', name: 'Serofero', fullMarks: 40, creditHour: '4' },
  { id: '4', name: 'Math', fullMarks: 40, creditHour: '4' },
  { id: '5', name: 'Science', fullMarks: 40, creditHour: '4' },
  { id: '6', name: 'Nepali Byakaran', fullMarks: 20, creditHour: '4' },
  { id: '7', name: 'G.K', fullMarks: 20, creditHour: '4' },
];

const marks = {
  '1': 40, '2': 39, '3': 39.5, '4': 39, '5': 39, '6': 19, '7': 20
};

const result1 = calculateResult('24', 'Sanabi', 'TWO', marks, 65, subjects);
console.log('Result with creditHour as string "4":', result1.gpa);

const subjectsNumeric = subjects.map(s => ({...s, creditHour: 4}));
const result2 = calculateResult('24', 'Sanabi', 'TWO', marks, 65, subjectsNumeric);
console.log('Result with creditHour as numeric 4:', result2.gpa);
