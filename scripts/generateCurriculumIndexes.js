const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'src', 'data', 'indexes');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const GITHUB_REPO_BASE = 'https://github.com/MdKaifSardar/Interview-Prep/blob/main';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function parseStandardQuestions(sub) {
  const filePath = path.join(ROOT_DIR, sub.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;
  let sectionIndex = 1;
  let allQuestions = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // Check for Section Header (## ...)
    if (line.startsWith('## ') && !line.includes('Legend') && !line.includes('Track:') && !line.includes('Revision Modes') && !line.includes('Next Step')) {
      const titleClean = line.replace(/^##\s+/, '').trim();
      currentSection = {
        id: sectionIndex++,
        name: titleClean.replace(/^\d+\.\s*/, ''),
        fullName: titleClean,
        range: '',
        questionCount: 0,
        questions: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Check for Question Line: e.g. "1. 🔴 P0 [Q] Question title..."
    const m = line.match(/^(\d+)\.\s*(🔴\s*P0|🟠\s*P1|🟡\s*P2|🟢\s*P2)?\s*(\[[A-Z]\])?\s*(.+)$/i);
    if (m) {
      const qNum = parseInt(m[1], 10);
      const priorityRaw = m[2] || '';
      const priority = priorityRaw.includes('P0') ? 'P0' : priorityRaw.includes('P1') ? 'P1' : 'P2';
      const qType = m[3] ? m[3].replace(/[\[\]]/g, '') : 'Q';
      let title = m[4].trim();

      const githubUrl = `${GITHUB_REPO_BASE}/${sub.file}#${qNum}-${slugify(title.slice(0, 60))}`;

      const qObj = {
        number: qNum,
        title,
        priority,
        type: qType,
        sectionId: currentSection ? currentSection.id : 1,
        githubUrl,
      };

      if (!currentSection) {
        currentSection = {
          id: 1,
          name: 'General',
          fullName: '1. General',
          range: '',
          questionCount: 0,
          questions: [],
        };
        sections.push(currentSection);
      }

      currentSection.questions.push(qObj);
      allQuestions.push(qObj);
    }
  }

  // Filter out empty sections and compute ranges
  const validSections = sections.filter((s) => s.questions.length > 0);
  validSections.forEach((s, idx) => {
    s.id = idx + 1;
    s.questionCount = s.questions.length;
    const firstQ = s.questions[0].number;
    const lastQ = s.questions[s.questions.length - 1].number;
    s.range = `#${firstQ} – #${lastQ}`;
    s.questions.forEach((q) => {
      q.sectionId = s.id;
    });
  });

  return {
    id: sub.id,
    name: sub.name,
    category: 'interview_qa',
    totalQuestions: allQuestions.length,
    githubFilePath: sub.file,
    githubUrl: `${GITHUB_REPO_BASE}/${sub.file}`,
    sections: validSections,
  };
}

function parseDsaQuestions(sub) {
  const filePath = path.join(ROOT_DIR, sub.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const sections = [];
  let currentSection = null;
  let sectionIndex = 1;
  let allQuestions = [];
  let globalCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Section header
    if (line.startsWith('## ') && !line.includes('Priority Legend') && !line.includes('---')) {
      const secName = line.replace(/^##\s+/, '').trim();
      currentSection = {
        id: sectionIndex++,
        name: secName.replace(/^\d+\.\s*/, ''),
        fullName: secName,
        range: '',
        questionCount: 0,
        questions: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Blueprint: ### 1. 🔴 P0 [Q] LC 54: Spiral Matrix [MEDIUM]
    const m = line.match(/^###\s+(\d+)\.\s*(🔴\s*P0|🟠\s*P1|🟡\s*P2|🟢\s*P2)?\s*(\[[A-Z]\])?\s*(.+)$/i);
    // Follow-up: #### 1a. 🔁 Follow-up Variant: LC 59: Spiral Matrix II [MEDIUM]
    const mf = line.match(/^####\s+(\d+[a-z]?)\.\s*(.+)$/i);

    if (m || mf) {
      globalCount++;
      const qNum = m ? parseInt(m[1], 10) : globalCount;
      const numLabel = m ? m[1] : mf[1];
      const priorityRaw = m ? (m[2] || '') : 'P1';
      const priority = priorityRaw.includes('P0') ? 'P0' : priorityRaw.includes('P1') ? 'P1' : 'P2';
      const qType = m && m[3] ? m[3].replace(/[\[\]]/g, '') : 'Q';
      const title = (m ? m[4] : mf[2]).trim();

      // Look ahead for LeetCode link
      let leetcodeUrl = '';
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const linkMatch = lines[j].match(/\[(LC\s*\d+[^\]]*)\]\((https:\/\/leetcode\.com\/problems\/[^\)]+)\)/);
        if (linkMatch) {
          leetcodeUrl = linkMatch[2];
          break;
        }
      }

      const qObj = {
        number: globalCount,
        label: `#${numLabel}`,
        title,
        priority,
        type: qType,
        leetcodeUrl: leetcodeUrl || undefined,
        sectionId: currentSection ? currentSection.id : 1,
        githubUrl: `${GITHUB_REPO_BASE}/${sub.file}`,
      };

      if (!currentSection) {
        currentSection = {
          id: 1,
          name: 'General',
          fullName: '1. General',
          range: '',
          questionCount: 0,
          questions: [],
        };
        sections.push(currentSection);
      }

      currentSection.questions.push(qObj);
      allQuestions.push(qObj);
    }
  }

  const validSections = sections.filter((s) => s.questions.length > 0);
  validSections.forEach((s, idx) => {
    s.id = idx + 1;
    s.questionCount = s.questions.length;
    const firstQ = s.questions[0].label || `#${s.questions[0].number}`;
    const lastQ = s.questions[s.questions.length - 1].label || `#${s.questions[s.questions.length - 1].number}`;
    s.range = `${firstQ} – ${lastQ}`;
    s.questions.forEach((q) => {
      q.sectionId = s.id;
    });
  });

  return {
    id: sub.id,
    name: sub.name,
    category: 'interview_qa',
    totalQuestions: allQuestions.length,
    githubFilePath: sub.file,
    githubUrl: `${GITHUB_REPO_BASE}/${sub.file}`,
    sections: validSections,
  };
}

function parseHandbookChapters(sub) {
  const filePath = path.join(ROOT_DIR, sub.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const chapters = [];
  for (let line of lines) {
    line = line.trim();
    const m = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (m) {
      const chNum = parseInt(m[1], 10);
      const chTitle = m[2].trim();
      const githubAnchor = `#${chNum}-${slugify(chTitle)}`;
      chapters.push({
        number: chNum,
        label: `Chapter ${chNum}`,
        title: chTitle,
        priority: 'P0',
        type: 'CHAPTER',
        sectionId: 1,
        githubUrl: `${GITHUB_REPO_BASE}/${sub.file}${githubAnchor}`,
      });
    }
  }

  const section = {
    id: 1,
    name: 'Handbook Chapters',
    fullName: 'Handbook Chapters & Syntax Blueprints',
    range: `Ch 1 – Ch ${chapters.length}`,
    questionCount: chapters.length,
    questions: chapters,
  };

  return {
    id: sub.id,
    name: sub.name,
    category: 'revision_handbook',
    totalQuestions: chapters.length,
    githubFilePath: sub.file,
    githubUrl: `${GITHUB_REPO_BASE}/${sub.file}`,
    sections: [section],
  };
}

const SUBJECT_CONFIGS = [
  { id: 'javascript', name: 'JavaScript', file: 'javascript/javascript-interview-questions.md', parser: parseStandardQuestions },
  { id: 'sql', name: 'SQL & Query Engineering', file: 'sql/sql-interview-questions.md', parser: parseStandardQuestions },
  { id: 'nodejs', name: 'Node.js & Express.js', file: 'nodejs/nodejs-interview-questions.md', parser: parseStandardQuestions },
  { id: 'react', name: 'React & Next.js', file: 'react/react-interview-questions.md', parser: parseStandardQuestions },
  { id: 'mongodb', name: 'MongoDB', file: 'mongodb/mongodb-interview-questions.md', parser: parseStandardQuestions },
  { id: 'dbms', name: 'DBMS Architecture', file: 'dbms/dbms-interview-questions.md', parser: parseStandardQuestions },
  { id: 'typescript', name: 'TypeScript', file: 'typescript/typescript-interview-questions.md', parser: parseStandardQuestions },
  { id: 'dsa', name: 'Data Structures & Algorithms', file: 'dsa/dsa-interview-questions.md', parser: parseDsaQuestions },
  { id: 'js-fundamentals', name: 'JS DSA Fundamentals', file: 'js dsa fundamentals/js-dsa-revision-handbook.md', parser: parseHandbookChapters },
  { id: 'cpp-fundamentals', name: 'C++ Fundamentals & STL', file: 'cpp fundamentals/cpp-revision-handbook.md', parser: parseHandbookChapters },
  { id: 'sql-fundamentals', name: 'SQL Fundamentals', file: 'sql fundamentals/sql-revision-handbook.md', parser: parseHandbookChapters },
  { id: 'postgresql', name: 'PostgreSQL', file: 'postgresql/postgresql-interview-questions.md', parser: parseStandardQuestions },
];

console.log('⚡ Generating lightweight question indexes directly from GitHub Markdown files...\n');

const manifestList = [];

for (const sub of SUBJECT_CONFIGS) {
  try {
    const data = sub.parser(sub);
    const outPath = path.join(OUTPUT_DIR, `${sub.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');

    const stat = fs.statSync(outPath);
    const kb = (stat.size / 1024).toFixed(1);

    manifestList.push({
      id: data.id,
      name: data.name,
      category: data.category,
      totalQuestions: data.totalQuestions,
      sectionCount: data.sections.length,
      fileSizeKb: kb,
    });

    console.log(`✓ ${sub.id.padEnd(18)} : ${String(data.totalQuestions).padStart(3)} items | ${String(data.sections.length).padStart(2)} sections | ${kb} KB`);
  } catch (err) {
    console.error(`✗ Error generating index for ${sub.id}:`, err);
  }
}

const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifestList, null, 2), 'utf8');

console.log(`\n🎉 Successfully generated indexes for ${manifestList.length} subjects in src/data/indexes/!`);

