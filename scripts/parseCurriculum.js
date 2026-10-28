const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '../../..');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'data', 'curriculum');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 1. PARSE JAVASCRIPT (Archetype A: Interview Q&A)
// -------------------------------------------------------------
function parseJavaScript() {
  console.log('📦 Parsing JavaScript (Interview Q&A)...');
  const questionsPath = path.join(ROOT_DIR, 'javascript', 'javascript-interview-questions.md');
  const answersDir = path.join(ROOT_DIR, 'javascript', 'answers');

  const SECTIONS = [
    { id: '1', file: '01-js-fundamentals-engine-and-scope.md', name: '1. JS Fundamentals, Engine & Scope', range: '#1 – #15', start: 1, end: 15 },
    { id: '2', file: '02-functions-closures-and-this.md', name: '2. Functions, Closures & this Binding', range: '#16 – #24', start: 16, end: 24 },
    { id: '3', file: '03-objects-prototypes-and-classes.md', name: '3. Objects, Prototypes & Classes', range: '#25 – #31', start: 25, end: 31 },
    { id: '4', file: '04-arrays-iteration-and-error-handling.md', name: '4. Array Methods, Iteration & Error Handling', range: '#32 – #35', start: 32, end: 35 },
    { id: '5', file: '05-async-event-loop-and-promises.md', name: '5. Async, Event Loop & Promises', range: '#36 – #45', start: 36, end: 45 },
    { id: '6', file: '06-dom-storage-web-apis-and-modules.md', name: '6. DOM, Storage, Web APIs & Modules', range: '#46 – #51', start: 46, end: 51 },
    { id: '7', file: '07-output-and-debugging-questions.md', name: '7. Output & Debugging Questions', range: '#52 – #58', start: 52, end: 58 },
    { id: '8', file: '08-coding-challenges-and-polyfills.md', name: '8. Coding Challenges (High-Yield Polyfills & Utilities)', range: '#59 – #65', start: 59, end: 65 },
    { id: '9', file: '09-dsa-in-javascript.md', name: '9. DSA in JavaScript', range: '#66 – #78', start: 66, end: 78 },
  ];

  // Extract full answer metadata (TLDR, Explanation, Code Blocks, Gotchas, LeetCode link)
  const answersMeta = new Map();
  for (const sec of SECTIONS) {
    const fPath = path.join(answersDir, sec.file);
    let content = fs.readFileSync(fPath, 'utf-8').replace(/\r\n/g, '\n');

    // Match all question headers
    const headerRegex = /(?:^|\n)###\s*(\d+)\.\s*(🔴 P0|🟠 P1)\s*\[([CQDP])\]\s*([^\n]+)/g;
    let match;
    const qHeaders = [];

    while ((match = headerRegex.exec(content)) !== null) {
      qHeaders.push({
        qNum: parseInt(match[1], 10),
        startIndex: match.index + match[0].length,
      });
    }

    for (let i = 0; i < qHeaders.length; i++) {
      const q = qHeaders[i];
      let endIndex = content.length;
      if (i + 1 < qHeaders.length) {
        // find position of next header
        const nextHeader = content.indexOf(`### ${qHeaders[i + 1].qNum}.`, q.startIndex);
        if (nextHeader !== -1) endIndex = nextHeader;
      }

      const qBlock = content.slice(q.startIndex, endIndex).trim();

      // 1. TL;DR
      let tldr = '';
      const tldrMatch = qBlock.match(/>\s*\*\*TL;DR:\*\*\s*([^\n]+(?:\n>[^\n]+)*)/i);
      if (tldrMatch) {
        tldr = tldrMatch[1].replace(/\n>\s*/g, ' ').trim();
      } else {
        const patternMatch = qBlock.match(/-\s*\*\*Pattern:\*\*\s*([^\n]+)/);
        const mnemonicMatch = qBlock.match(/-\s*\*\*Mnemonic:\*\*\s*([^\n]+)/);
        if (patternMatch || mnemonicMatch) {
          const p = patternMatch ? patternMatch[1].trim() : '';
          const m = mnemonicMatch ? mnemonicMatch[1].trim().replace(/\*+/g, '') : '';
          tldr = `${p ? `Pattern: ${p} | ` : ''}${m ? `Mnemonic: ${m}` : ''}`;
        }
      }

      // 2. LeetCode Link
      const lcMatch = qBlock.match(/https:\/\/leetcode\.com\/problems\/[a-zA-Z0-9-]+\/?/);
      const leetcodeUrl = lcMatch ? lcMatch[0] : null;

      // 3. Code Blocks
      const codeBlocks = [];
      const codeRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
      let cMatch;
      while ((cMatch = codeRegex.exec(qBlock)) !== null) {
        codeBlocks.push(cMatch[1].trim());
      }
      const codeSnippet = codeBlocks.length > 0 ? codeBlocks.join('\n\n// =========================================\n\n') : undefined;

      // 4. Explanation
      let explanation = '';
      const expMatch = qBlock.match(/\*\*💡 Core Concept & Explanation\*\*([\s\S]*?)(?=\*\*🛠️|```|\*\*⚠️|---|$)/i);
      if (expMatch) {
        explanation = expMatch[1].trim();
      } else {
        const dsaMatch = qBlock.match(/\*\*📜 Problem Statement.*?\*\*([\s\S]*?)(?=\*\*🐢|```|\*\*⚠️|---|$)/i);
        if (dsaMatch) {
          explanation = dsaMatch[1].trim();
        }
      }

      // 5. Gotchas
      let gotchas = '';
      const gotchaMatch = qBlock.match(/\*\*⚠️\s*(?:Interview Pitfall|Edge Cases).*?\*\*([\s\S]*?)(?=---|###|$)/i);
      if (gotchaMatch) {
        gotchas = gotchaMatch[1].trim().replace(/^[-*]\s*/gm, '• ');
      }

      answersMeta.set(q.qNum, {
        tldr: tldr || 'Refer to master answer key.',
        explanation: explanation || undefined,
        codeSnippet: codeSnippet || undefined,
        gotchas: gotchas || undefined,
        leetcodeUrl: leetcodeUrl || undefined,
        docRef: `javascript/answers/${sec.file}#${q.qNum}`,
      });
    }
  }

  // Parse questions list
  const qContent = fs.readFileSync(questionsPath, 'utf-8');
  const qLines = qContent.split('\n');
  const items = [];

  for (const line of qLines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)\.\s+(🔴 P0|🟠 P1)\s+\[([CQDP])\]\s+(.+)$/);
    if (!match) continue;

    const qNum = parseInt(match[1], 10);
    const priority = match[2].includes('P0') ? 'P0' : 'P1';
    const type = match[3];
    let title = match[4].trim().replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    const sec = SECTIONS.find(s => qNum >= s.start && qNum <= s.end);
    const meta = answersMeta.get(qNum) || {};

    items.push({
      id: `js_${qNum}`,
      subjectId: 'javascript',
      topicId: sec.id,
      order: qNum,
      title,
      priority,
      type,
      summary: meta.tldr || 'Refer to master answer key.',
      explanation: meta.explanation || undefined,
      codeSnippet: meta.codeSnippet || undefined,
      gotchas: meta.gotchas || undefined,
      leetcodeUrl: meta.leetcodeUrl || undefined,
      docRef: meta.docRef || `javascript/answers/${sec.file}#${qNum}`,
    });
  }

  assert.strictEqual(items.length, 78, `Expected 78 JS questions, got ${items.length}`);

  const topics = SECTIONS.map(s => {
    const count = items.filter(i => i.topicId === s.id).length;
    return {
      id: s.id,
      order: parseInt(s.id, 10),
      name: s.name,
      rangeOrLabel: s.range,
      itemCount: count,
    };
  });

  const manifest = {
    id: 'javascript',
    name: 'JavaScript Technical Master List',
    description: 'Track: Fresher → 0–1 YOE → Junior Full Stack / Backend / Frontend / Startup',
    category: 'interview_qa',
    totalItems: items.length,
    topics,
    items,
  };

  const outFile = path.join(OUTPUT_DIR, 'javascript.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ JavaScript manifest written (${manifest.totalItems} questions in 9 topics).`);
  return manifest;
}

// -------------------------------------------------------------
// 2. PARSE JS FUNDAMENTALS (Archetype B: Revision Handbook)
// -------------------------------------------------------------
function parseJsFundamentals() {
  console.log('📦 Parsing JS DSA Fundamentals (Revision Handbook)...');
  const handbookPath = path.join(ROOT_DIR, 'js dsa fundamentals', 'js-dsa-revision-handbook.md');
  const content = fs.readFileSync(handbookPath, 'utf-8');
  const lines = content.split('\n');

  const topics = [];
  const items = [];

  let currentTopic = null;
  let currentSubItem = null;
  let codeBuffer = [];
  let inCodeBlock = false;
  let subOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check Chapter Header: ## 1. Numbers, Integer Math & Precision
    const chapterMatch = trimmed.match(/^##\s*(\d+)\.\s*(.+)$/);
    if (chapterMatch && !trimmed.includes('Quick Navigation Index')) {
      const chapterNum = parseInt(chapterMatch[1], 10);
      const chapterName = chapterMatch[2].trim();

      currentTopic = {
        id: `${chapterNum}`,
        order: chapterNum,
        name: `${chapterNum}. ${chapterName}`,
        rangeOrLabel: `Chapter ${chapterNum}`,
        itemCount: 0,
      };
      topics.push(currentTopic);
      subOrder = 0;
      continue;
    }

    if (!currentTopic) continue;

    // Check Sub-topic Header: ### Constants & Numeric Boundaries
    const subMatch = trimmed.match(/^###\s*(.+)$/);
    if (subMatch) {
      if (currentSubItem) {
        if (codeBuffer.length > 0) {
          currentSubItem.codeSnippet = codeBuffer.join('\n').trim();
        }
        items.push(currentSubItem);
      }

      subOrder++;
      currentTopic.itemCount++;

      const subTitle = subMatch[1].trim();
      currentSubItem = {
        id: `jsfund_c${currentTopic.id}_s${subOrder}`,
        subjectId: 'js-fundamentals',
        topicId: currentTopic.id,
        order: subOrder,
        title: subTitle,
        type: 'SYNTAX',
        summary: '',
        codeSnippet: '',
        gotchas: '',
        docRef: `js dsa fundamentals/js-dsa-revision-handbook.md`,
      };
      codeBuffer = [];
      inCodeBlock = false;
      continue;
    }

    if (!currentSubItem) continue;

    // Check for code blocks
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
      } else {
        inCodeBlock = false;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
    } else {
      // Check for Gotchas: > ⚠️ **Don't Forget...**
      if (trimmed.startsWith('> ⚠️') || trimmed.startsWith('⚠️')) {
        currentSubItem.gotchas = (currentSubItem.gotchas ? currentSubItem.gotchas + ' ' : '') + trimmed.replace(/^>\s*/, '');
      } else if (trimmed.length > 0 && !trimmed.startsWith('---')) {
        // Collect text explanation/summary
        if (!currentSubItem.summary) {
          currentSubItem.summary = trimmed;
        } else if (currentSubItem.summary.length < 200) {
          currentSubItem.summary += ' ' + trimmed;
        }
      }
    }
  }

  // Push last item
  if (currentSubItem) {
    if (codeBuffer.length > 0) {
      currentSubItem.codeSnippet = codeBuffer.join('\n').trim();
    }
    items.push(currentSubItem);
  }

  assert.strictEqual(topics.length, 12, `Expected 12 chapters in JS Fundamentals, got ${topics.length}`);
  assert.ok(items.length >= 30, `Expected multiple syntax items, got ${items.length}`);

  const manifest = {
    id: 'js-fundamentals',
    name: 'JavaScript Algorithmic Fundamentals & Syntax Handbook',
    description: 'Pre-Interview Revision Handbook: Rapid reference syntax, method behaviors, copy-paste templates, and fatal JS language gotchas.',
    category: 'revision_handbook',
    totalItems: topics.length, // Tracked by chapter
    topics,
    items,
  };

  const outFile = path.join(OUTPUT_DIR, 'js-fundamentals.json');
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ JS Fundamentals manifest written (${topics.length} chapters, ${items.length} reference cards).`);
  return manifest;
}

function main() {
  console.log('🚀 Running Universal Curriculum Parsers...\n');
  parseJavaScript();
  console.log('');
  parseJsFundamentals();
  console.log('\n🎉 Both curriculum manifests successfully created!');
}

main();
