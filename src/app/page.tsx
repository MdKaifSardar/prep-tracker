"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
} from "firebase/firestore";
import { Topic, DailyLog, KPIStats } from "@/types";
import { calculateKPIs } from "@/lib/streaks";
import { seedInitialData, DEFAULT_TOPICS } from "@/lib/seedData";

import Navbar from "@/components/Navbar";
import KpiCards from "@/components/KpiCards";
import ActivityHeatmap from "@/components/ActivityHeatmap";
import TopicProgressGrid from "@/components/TopicProgressGrid";
import QuickLogModal from "@/components/QuickLogModal";
import RecentLogsList from "@/components/RecentLogsList";
import AuthScreen from "@/components/AuthScreen";
import { Zap } from "lucide-react";

export default function DashboardPage() {
  const { user, loading: authLoading, isAuthorized } = useAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTopicForLog, setSelectedTopicForLog] = useState<Topic | null>(null);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!user || !isAuthorized) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setPermissionError(null);

    // 1. Listen to Topics
    const topicsRef = collection(db, "topics");
    const unsubscribeTopics = onSnapshot(
      topicsRef,
      (snapshot) => {
        const topicList: Topic[] = [];
        snapshot.forEach((docSnap) => {
          topicList.push({ id: docSnap.id, ...docSnap.data() } as Topic);
        });
        setTopics(topicList.length > 0 ? topicList : DEFAULT_TOPICS);
      },
      (error) => {
        console.error("Firestore topics listener error:", error);
        if (error.code === "permission-denied") {
          setPermissionError(
            "Firestore Security Rules are currently blocking reads. In your Firebase Console, go to Firestore Database → Rules and set rules to allow access."
          );
        }
      }
    );

    // 2. Listen to Daily Logs
    const logsRef = collection(db, "daily_logs");
    const logsQuery = query(logsRef, orderBy("date", "desc"));
    const unsubscribeLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const logList: DailyLog[] = [];
        snapshot.forEach((docSnap) => {
          logList.push({ id: docSnap.id, ...docSnap.data() } as DailyLog);
        });
        setLogs(logList);
        setLoadingData(false);
      },
      (error) => {
        console.error("Firestore logs listener error:", error);
        if (error.code === "permission-denied") {
          setPermissionError(
            "Firestore Security Rules are currently blocking reads. In your Firebase Console, go to Firestore Database → Rules and set rules to allow access."
          );
        }
        setLoadingData(false);
      }
    );

    return () => {
      unsubscribeTopics();
      unsubscribeLogs();
    };
  }, [user, isAuthorized]);

  // Calculate KPIs
  const kpiStats: KPIStats = calculateKPIs(logs);

  // Action: Quick Log New Problems
  const handleSaveLog = async (logData: {
    date: string;
    topicId: string;
    topicName: string;
    problemRange: string;
    parsedCount: number;
    isRevision: boolean;
    notes?: string;
  }) => {
    try {
      await addDoc(collection(db, "daily_logs"), {
        date: logData.date,
        topicId: logData.topicId,
        topicName: logData.topicName,
        problemRange: logData.problemRange,
        parsedCount: logData.parsedCount,
        isRevision: logData.isRevision,
        notes: logData.notes?.trim() || "",
        timestamp: new Date(logData.date).getTime(),
      });
    } catch (error) {
      console.error("Failed to add daily log:", error);
      alert("Failed to save log to Firestore. Please check your network or Firestore permissions.");
    }
  };

  // Action: Delete Log
  const handleDeleteLog = async (id: string) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
      try {
        await deleteDoc(doc(db, "daily_logs", id));
      } catch (error) {
        console.error("Failed to delete log:", error);
      }
    }
  };

  // Action: Update Topic Target
  const handleUpdateTopicTarget = async (topicId: string, newTarget: number) => {
    try {
      const existing = topics.find((t) => t.id === topicId) || DEFAULT_TOPICS.find((t) => t.id === topicId);
      await setDoc(
        doc(db, "topics", topicId),
        {
          ...(existing || {}),
          target: newTarget,
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Failed to update target:", error);
    }
  };

  // Action: Seed / Sync Data from Excel
  const handleSeedData = async () => {
    setSeedNotice("Syncing initial topics and Excel historical sessions to Firestore...");
    try {
      const res = await seedInitialData(db);
      setSeedNotice(
        `Sync completed! Seeded ${res.topicsSeeded} topics and ${res.logsSeeded} historical entries.`
      );
      setTimeout(() => setSeedNotice(null), 5000);
    } catch (error: any) {
      console.error("Seeding error:", error);
      setSeedNotice(`Sync error: ${error.message || "Unknown error"}`);
    }
  };

  // Handle open modal for specific topic
  const handleQuickLogTopic = (t: Topic) => {
    setSelectedTopicForLog(t);
    setIsLogModalOpen(true);
  };

  // 1. Loading State
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        color: "var(--text-muted)",
      }}>
        <div style={{
          width: "2.5rem",
          height: "2.5rem",
          border: "3px solid rgba(255,255,255,0.1)",
          borderTopColor: "var(--accent-primary)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span>Checking authentication...</span>
      </div>
    );
  }

  // 2. Auth Guard
  if (!user || !isAuthorized) {
    return <AuthScreen />;
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: "3rem" }}>
      {/* Sticky Navbar */}
      <Navbar
        onOpenLogModal={() => {
          setSelectedTopicForLog(null);
          setIsLogModalOpen(true);
        }}
        onSeedData={handleSeedData}
        streak={kpiStats.currentStreak}
      />

      <main className="container" style={{ marginTop: "1.75rem" }}>
        {/* Permission Denied Guide Banner */}
        {permissionError && (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fecaca",
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                🔒 Firestore Permission Denied
              </span>
              <button
                onClick={() => setPermissionError(null)}
                style={{ color: "#fca5a5", fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4, color: "#fecaca" }}>
              Your Firebase Firestore Security Rules are currently blocking reads. To fix this, open the <strong>Firebase Console</strong> → <strong>Firestore Database</strong> → <strong>Rules</strong> tab and publish:
            </p>
            <pre style={{
              background: "rgba(0, 0, 0, 0.4)",
              padding: "0.6rem 0.8rem",
              borderRadius: "4px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              color: "#38bdf8",
              overflowX: "auto",
            }}>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
            </pre>
          </div>
        )}

        {/* Seed Notification Banner */}
        {seedNotice && (
          <div style={{
            background: "rgba(99, 102, 241, 0.15)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            color: "#fff",
            padding: "0.75rem 1.25rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Zap size={14} /> {seedNotice}
            </span>
            <button
              onClick={() => setSeedNotice(null)}
              style={{ color: "var(--text-muted)", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Hero KPI Cards */}
        <KpiCards stats={kpiStats} />

        {/* 2. Contribution Activity Heatmap */}
        <ActivityHeatmap logs={logs} />

        {/* 3. Topic Progress & Syllabus Goals Grid */}
        <TopicProgressGrid
          topics={topics}
          logs={logs}
          onQuickLogTopic={handleQuickLogTopic}
          onUpdateTopicTarget={handleUpdateTopicTarget}
        />

        {/* 4. Filterable Log History Table */}
        <RecentLogsList
          logs={logs}
          topics={topics}
          onDeleteLog={handleDeleteLog}
        />
      </main>

      {/* Quick Log Modal Dialog */}
      <QuickLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        topics={topics.length > 0 ? topics : DEFAULT_TOPICS}
        logs={logs}
        selectedTopic={selectedTopicForLog}
        onSaveLog={handleSaveLog}
      />
    </div>
  );
}
