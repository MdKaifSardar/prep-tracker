export interface ParsedProblems {
  isValid: boolean;
  count: number;
  problems: number[];
  cleanString: string;
  error?: string;
}

/**
 * Parses user problem string like "58-61" or "1, 2, 5" or "1-3, 5, 8-10"
 */
export function parseProblemRange(input: string): ParsedProblems {
  const trimmed = input.trim();
  if (!trimmed) {
    return { isValid: false, count: 0, problems: [], cleanString: "", error: "Problem range cannot be empty." };
  }

  const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
  const problemSet = new Set<number>();

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        return { isValid: false, count: 0, problems: [], cleanString: trimmed, error: `Invalid range format: "${part}"` };
      }
      if (start > end) {
        return { isValid: false, count: 0, problems: [], cleanString: trimmed, error: `Range start cannot be greater than end: "${part}"` };
      }
      if (end - start > 100) {
        return { isValid: false, count: 0, problems: [], cleanString: trimmed, error: `Range too large: "${part}" (max 100 per entry)` };
      }

      for (let i = start; i <= end; i++) {
        problemSet.add(i);
      }
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) {
        return { isValid: false, count: 0, problems: [], cleanString: trimmed, error: `Invalid number: "${part}"` };
      }
      problemSet.add(num);
    }
  }

  const sorted = Array.from(problemSet).sort((a, b) => a - b);
  return {
    isValid: sorted.length > 0,
    count: sorted.length,
    problems: sorted,
    cleanString: trimmed,
  };
}
