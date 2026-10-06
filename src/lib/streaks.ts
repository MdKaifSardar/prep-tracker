import { DailyLog, KPIStats } from "@/types";

/**
 * Returns YYYY-MM-DD string for a given Date in local time
 */
export function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateKPIs(logs: DailyLog[]): KPIStats {
  const now = new Date();
  const todayStr = formatLocalDate(now);

  // Group by date
  const dateCounts = new Map<string, number>();
  const todayTopicSet = new Set<string>();
  let todayCount = 0;
  let totalCompleted = 0;

  for (const log of logs) {
    totalCompleted += log.parsedCount;
    dateCounts.set(log.date, (dateCounts.get(log.date) || 0) + log.parsedCount);

    if (log.date === todayStr) {
      todayCount += log.parsedCount;
      todayTopicSet.add(log.topicId);
    }
  }

  // 1. Calculate Last 7 Days
  let last7Days = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = formatLocalDate(d);
    last7Days += dateCounts.get(dateKey) || 0;
  }

  // 2. Calculate This Week (Mon to Sun)
  const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const daysSinceMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
  let thisWeek = 0;
  for (let i = 0; i <= daysSinceMonday; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateKey = formatLocalDate(d);
    thisWeek += dateCounts.get(dateKey) || 0;
  }

  // 3. Calculate This Month
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
  let thisMonth = 0;
  for (const [dateKey, count] of dateCounts.entries()) {
    if (dateKey.startsWith(currentYearMonth)) {
      thisMonth += count;
    }
  }

  // 4. Calculate Current Streak & Best Streak
  // Get all unique dates with activity > 0, sorted ascending
  const activeDates = Array.from(dateCounts.keys())
    .filter(k => (dateCounts.get(k) || 0) > 0)
    .sort();

  let bestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of activeDates) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const curDate = new Date(y, m - 1, d);

    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffTime = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    prevDate = curDate;
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  // Current Streak: check if today or yesterday was active
  let currentStreak = 0;
  const checkDate = new Date(now);
  const hasToday = (dateCounts.get(todayStr) || 0) > 0;

  if (hasToday) {
    currentStreak = 1;
    checkDate.setDate(now.getDate() - 1);
  } else {
    // If today hasn't been logged yet, streak can still be alive if yesterday was active
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatLocalDate(yesterday);
    if ((dateCounts.get(yesterdayStr) || 0) > 0) {
      currentStreak = 1;
      checkDate.setDate(now.getDate() - 2);
    }
  }

  if (currentStreak > 0) {
    while (true) {
      const dStr = formatLocalDate(checkDate);
      if ((dateCounts.get(dStr) || 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    todayQuestions: todayCount,
    todayTopics: todayTopicSet.size,
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    totalCompleted,
    last7Days,
    thisWeek,
    thisMonth,
  };
}
