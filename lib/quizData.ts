// @/lib/quizData.ts

export const QUIZ_BANK: Record<string, { q: string, a: string, options: string[] }[]> = {
  'JavaScript': [
    { q: 'What is the output of typeof null?', a: 'object', options: ['object', 'null', 'undefined', 'string'] },
    { q: 'Which method adds an element to the end of an array?', a: 'push()', options: ['pop()', 'push()', 'shift()', 'unshift()'] },
    { q: 'Which of these is NOT a JS data type?', a: 'Float', options: ['Boolean', 'Undefined', 'Float', 'Symbol'] },
    { q: 'Which company developed JavaScript?', a: 'Netscape', options: ['Microsoft', 'Google', 'Netscape', 'Oracle'] },
    { q: 'What does "===" check?', a: 'Value and Type', options: ['Value only', 'Type only', 'Value and Type', 'None'] }
  ],
  'Python': [
    { q: 'Which keyword is used to create a function?', a: 'def', options: ['func', 'define', 'def', 'function'] },
    { q: 'Which of these is used to define a block of code?', a: 'Indentation', options: ['Brackets', 'Parentheses', 'Indentation', 'Quotes'] },
    { q: 'Which data type is immutable?', a: 'tuple', options: ['list', 'set', 'dict', 'tuple'] },
    { q: 'What is the correct file extension for Python?', a: '.py', options: ['.py', '.pyt', '.pt', '.pyw'] },
    { q: 'Which operator is used for power (exponent)?', a: '**', options: ['^', '**', 'exp', 'pow'] }
  ],
  'C': [
    { q: 'Which header file is needed for printf()?', a: 'stdio.h', options: ['conio.h', 'stdlib.h', 'stdio.h', 'string.h'] },
    { q: 'What is a pointer in C?', a: 'A variable that stores address', options: ['A data type', 'A variable that stores address', 'A function', 'A keyword'] },
    { q: 'Which operator is used to get the address?', a: '&', options: ['*', '&', '->', '.'] },
    { q: 'Size of int in C is usually?', a: '4 bytes', options: ['2 bytes', '4 bytes', '8 bytes', '1 byte'] },
    { q: 'Which keyword is used to exit a loop?', a: 'break', options: ['stop', 'exit', 'break', 'return'] }
  ],
  'Java': [
    { q: 'Which component is used to compile Java code?', a: 'JDK', options: ['JRE', 'JVM', 'JDK', 'JIT'] },
    { q: 'Which keyword is used to inherit a class?', a: 'extends', options: ['implements', 'inherits', 'extends', 'super'] },
    { q: 'What is the default value of a boolean?', a: 'false', options: ['true', 'false', '0', 'null'] },
    { q: 'Which package contains the Scanner class?', a: 'java.util', options: ['java.lang', 'java.util', 'java.io', 'java.net'] },
    { q: 'Java is a ___ language.', a: 'Platform Independent', options: ['Platform Dependent', 'Platform Independent', 'Low-level', 'Scripting'] }
  ],
  'SQL': [
    { q: 'Which command is used to fetch data?', a: 'SELECT', options: ['GET', 'FETCH', 'SELECT', 'SHOW'] },
    { q: 'Which clause is used to filter records?', a: 'WHERE', options: ['FILTER', 'WHERE', 'HAVING', 'GROUP BY'] },
    { q: 'A Primary Key must be?', a: 'Unique and Not Null', options: ['Unique', 'Not Null', 'Unique and Not Null', 'Incremental'] },
    { q: 'Which JOIN returns matching rows only?', a: 'INNER JOIN', options: ['LEFT JOIN', 'INNER JOIN', 'FULL JOIN', 'OUTER JOIN'] },
    { q: 'Which command deletes all rows but keeps the table?', a: 'TRUNCATE', options: ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'] }
  ]
};