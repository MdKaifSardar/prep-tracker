const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Paths relative to workspace
const ROOT_DIR = path.resolve(__dirname, '../../..');
const QUESTIONS_INDEX_PATH = path.join(ROOT_DIR, 'javascript', 'javascript-interview-questions.md');
const ANSWERS_DIR = path.join(ROOT_DIR, 'javascript', 'answers');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'question_bank');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'javascript.json');

// Sections definition matching index table
const SECTIONS = [
  { id: 1, file: '01-js-fundamentals-engine-and-scope.md', name: '1. JS Fundamentals, Engine & Scope', range: '#1 – #15', start: 1, end: 15 },
  { id: 2, file: '02-functions-closures-and-this.md', name: '2. Functions, Closures & this Binding', range: '#16 – #24', start: 16, end: 24 },
  { id: 3, file: '03-objects-prototypes-and-classes.md', name: '3. Objects, Prototypes & Classes', range: '#25 – #31', start: 25, end: 31 },
  { id: 4, file: '04-arrays-iteration-and-error-handling.md', name: '4. Array Methods, Iteration & Error Handling', range: '#32 – #35', start: 32, end: 35 },
  { id: 5, file: '05-async-event-loop-and-promises.md', name: '5. Async, Event Loop & Promises', range: '#36 – #45', start: 36, end: 45 },
  { id: 6, file: '06-dom-storage-web-apis-and-modules.md', name: '6. DOM, Storage, Web APIs & Modules', range: '#46 – #51', start: 46, end: 51 },
  { id: 7, file: '07-output-and-debugging-questions.md', name: '7. Output & Debugging Questions', range: '#52 – #58', start: 52, end: 58 },
  { id: 8, file: '08-coding-challenges-and-polyfills.md', name: '8. Coding Challenges (High-Yield Polyfills & Utilities)', range: '#59 – #65', start: 59, end: 65 },
  { id: 9, file: '09-dsa-in-javascript.md', name: '9. DSA in JavaScript', range: '#66 – #78', start: 66, end: 78 },
];

function getSectionForQuestion(qNum) {
  for (const s of SECTIONS) {
    if (qNum >= s.start && qNum <= s.end) return s;
  }
  throw new Error(`Question ${qNum} does not belong to any defined section`);
}

function parseAnswerFiles() {
  const answerMetadata = new Map();

  for (const section of SECTIONS) {
    const filePath = path.join(ANSWERS_DIR, section.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Answer file missing: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let currentQNum = null;
    let tldrLines = [];
    let collectingTldr = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Heading regex: ### 1. 🔴 P0 [Q] What is...
      const headingMatch = line.match(/^###\s*(\d+)\.\s*(🔴 P0|🟠 P1)\s*\[([CQDP])\]\s*(.+)$/);
      if (headingMatch) {
        if (currentQNum !== null && tldrLines.length > 0) {
          const prev = answerMetadata.get(currentQNum) || {};
          prev.tldr = tldrLines.join(' ').replace(/^>\s*\*\*TL;DR:\*\*\s*/i, '').trim();
          answerMetadata.set(currentQNum, prev);
        }

        currentQNum = parseInt(headingMatch[1], 10);
        tldrLines = [];
        collectingTldr = false;

        const meta = answerMetadata.get(currentQNum) || {};
        meta.docRef = `javascript/answers/${section.file}#${currentQNum}`;
        answerMetadata.set(currentQNum, meta);
        continue;
      }

      if (currentQNum !== null) {
        // LeetCode link regex: - **LeetCode Link:** [LeetCode 1: Two Sum](https://leetcode.com/problems/two-sum/)
        const lcMatch = line.match(/https:\/\/leetcode\.com\/problems\/[a-zA-Z0-9-]+\/?/);
        if (lcMatch) {
          const meta = answerMetadata.get(currentQNum) || {};
          meta.leetcodeUrl = lcMatch[0];
          answerMetadata.set(currentQNum, meta);
        }

        // TL;DR line
        if (line.startsWith('> **TL;DR:**') || line.startsWith('> **TL;DR**')) {
          collectingTldr = true;
          tldrLines.push(line);
        } else if (collectingTldr) {
          if (line.startsWith('>') && !line.startsWith('---')) {
            tldrLines.push(line.replace(/^>\s*/, ''));
          } else {
            collectingTldr = false;
            const meta = answerMetadata.get(currentQNum) || {};
            meta.tldr = tldrLines.join(' ').replace(/^>\s*\*\*TL;DR:\*\*\s*/i, '').trim();
            answerMetadata.set(currentQNum, meta);
          }
        }

        // Handle Pattern & Mnemonic for DSA
        if (line.includes('- **Pattern:**')) {
          const patternText = line.replace(/.*-\s*\*\*Pattern:\*\*\s*/, '').trim();
          const meta = answerMetadata.get(currentQNum) || {};
          meta.pattern = patternText;
          answerMetadata.set(currentQNum, meta);
        }
        if (line.includes('- **Mnemonic:**')) {
          const mnemonicText = line.replace(/.*-\s*\*\*Mnemonic:\*\*\s*/, '').trim();
          const meta = answerMetadata.get(currentQNum) || {};
          meta.mnemonic = mnemonicText;
          if (!meta.tldr || meta.tldr.length === 0) {
            meta.tldr = `${meta.pattern ? `Pattern: ${meta.pattern} | ` : ''}Mnemonic: ${mnemonicText}`.replace(/\*+/g, '');
          }
          answerMetadata.set(currentQNum, meta);
        }
      }
    }

    if (currentQNum !== null && tldrLines.length > 0) {
      const meta = answerMetadata.get(currentQNum) || {};
      meta.tldr = tldrLines.join(' ').replace(/^>\s*\*\*TL;DR:\*\*\s*/i, '').trim();
      answerMetadata.set(currentQNum, meta);
    }
  }

  return answerMetadata;
}

function parseQuestionsIndex(answersMeta) {
  if (!fs.existsSync(QUESTIONS_INDEX_PATH)) {
    throw new Error(`Questions index file missing: ${QUESTIONS_INDEX_PATH}`);
  }

  const content = fs.readFileSync(QUESTIONS_INDEX_PATH, 'utf-8');
  const lines = content.split('\n');
  const questions = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Pattern: 1. 🔴 P0 [Q] What is...
    const match = trimmed.match(/^(\d+)\.\s+(🔴 P0|🟠 P1)\s+\[([CQDP])\]\s+(.+)$/);
    if (!match) continue;

    const qNum = parseInt(match[1], 10);
    const priority = match[2].includes('P0') ? 'P0' : 'P1';
    const type = match[3];
    let title = match[4].trim();

    // Remove any trailing markdown links if present in title
    title = title.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const section = getSectionForQuestion(qNum);
    const ansMeta = answersMeta.get(qNum) || {};

    questions.push({
      id: `js_${qNum}`,
      topicId: 'javascript',
      qNumber: qNum,
      title,
      sectionId: section.id,
      sectionName: section.name,
      priority,
      type,
      tldr: ansMeta.tldr || 'Refer to master answer key.',
      leetcodeUrl: ansMeta.leetcodeUrl || null,
      docRef: ansMeta.docRef || `javascript/answers/${section.file}#${qNum}`,
    });
  }

  return questions;
}

function main() {
  console.log('🔍 Starting JavaScript Question Bank Parser...');

  const answersMeta = parseAnswerFiles();
  console.log(`✅ Extracted answer metadata for ${answersMeta.size} questions from answer files.`);

  const questions = parseQuestionsIndex(answersMeta);
  console.log(`✅ Extracted ${questions.length} questions from question master list.`);

  // Validation Assertions
  assert.strictEqual(questions.length, 78, `Expected exactly 78 questions, got ${questions.length}`);
  
  // Verify sequential numbers 1..78
  for (let i = 0; i < 78; i++) {
    const expectedNum = i + 1;
    assert.strictEqual(questions[i].qNumber, expectedNum, `Question at index ${i} has number ${questions[i].qNumber}, expected ${expectedNum}`);
    assert.ok(questions[i].title && questions[i].title.length > 5, `Question ${expectedNum} has missing/invalid title`);
    assert.ok(questions[i].tldr && questions[i].tldr.length > 5, `Question ${expectedNum} has missing/invalid TLDR`);
  }

  // Create section info with counts
  const sectionInfos = SECTIONS.map(s => {
    const count = questions.filter(q => q.sectionId === s.id).length;
    return {
      id: s.id,
      name: s.name,
      range: s.range,
      questionCount: count,
    };
  });

  const finalData = {
    topicId: 'javascript',
    topicName: 'JavaScript Technical Interview Master List',
    totalQuestions: questions.length,
    sections: sectionInfos,
    questions,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2), 'utf-8');
  console.log(`🎉 Successfully parsed and stored question bank at: ${OUTPUT_FILE}`);
  console.log(`📊 Statistics:
  - Total Questions: ${finalData.totalQuestions}
  - Total Sections: ${finalData.sections.length}
  - P0 Questions: ${questions.filter(q => q.priority === 'P0').length}
  - P1 Questions: ${questions.filter(q => q.priority === 'P1').length}
  - DSA Questions with LeetCode Links: ${questions.filter(q => q.leetcodeUrl).length}
  `);
}

main();
