"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
} from "firebase/firestore";
import { getSubjectManifest } from "@/lib/curriculum";
import { CurriculumItem, TopicManifest } from "@/types/curriculum";
import CodeBlock from "@/components/CodeBlock";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import {
  ArrowLeft,
  ExternalLink,
  CheckSquare,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Check,
  BookOpen,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  Layers,
  CheckCircle2,
  Zap,
} from "lucide-react";

export default function DedicatedTopicPage() {
  const params = useParams();
  const subjectId = (params?.subjectId as string) || "javascript";
  const topicId = (params?.topicId as string) || "1";
  const { user } = useAuth();

  const manifest = getSubjectManifest(subjectId);
  const isHandbook = manifest?.category === "revision_handbook";

  // Find current, prev, next topics
  const currentTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.id === topicId);
  const currentOrder = currentTopic ? currentTopic.order : parseInt(topicId, 10);
  const prevTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.order === currentOrder - 1);
  const nextTopic: TopicManifest | undefined = manifest?.topics.find((t) => t.order === currentOrder + 1);

  // Completed items set (from single Firestore doc per subject)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<"ALL" | "P0" | "P1">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNCOMPLETED" | "COMPLETED">("ALL");
  const [isSyncing, setIsSyncing] = useState(false);

  // Collapsible Dual Sidebar States (Desktop)
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string>("");

  // Responsive Mobile Drawer States
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar_left_collapsed") === "true") {
        setIsLeftCollapsed(true);
      }
      if (localStorage.getItem("sidebar_right_collapsed") === "true") {
        setIsRightCollapsed(true);
      }
    } catch (_) {}
  }, []);

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1200;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileLeftOpen(false);
        setIsMobileRightOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileLeftOpen(false);
        setIsMobileRightOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleLeftSidebar = () => {
    if (isDesktop) {
      setIsLeftCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar_left_collapsed", String(next));
        return next;
      });
    } else {
      setIsMobileLeftOpen((prev) => !prev);
      setIsMobileRightOpen(false);
    }
  };

  const toggleRightSidebar = () => {
    if (isDesktop) {
      setIsRightCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("sidebar_right_collapsed", String(next));
        return next;
      });
    } else {
      setIsMobileRightOpen((prev) => !prev);
      setIsMobileLeftOpen(false);
    }
  };

  // Firestore Realtime Listener: Exactly 1 single document read per subject!
  useEffect(() => {
    if (!manifest) return;

    if (!user) {
      const saved = localStorage.getItem(`progress_${subjectId}`);
      if (saved) {
        try {
          setCompletedIds(new Set(JSON.parse(saved)));
        } catch (_) {}
      }
      return;
    }

    const docRef = doc(db, "curriculum_progress", `${user.uid}_${subjectId}`);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const items = Array.isArray(data.completedItemIds) ? data.completedItemIds : [];
          setCompletedIds(new Set(items));
          localStorage.setItem(`progress_${subjectId}`, JSON.stringify(items));
        } else {
          setCompletedIds(new Set());
        }
      },
      (error) => {
        console.error("Firestore single-doc progress listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user, subjectId, manifest]);

  // Questions or Reference Blocks for this topic
  const topicItems: CurriculumItem[] = useMemo(() => {
    if (!manifest) return [];
    return manifest.items.filter((item) => item.topicId === topicId);
  }, [manifest, topicId]);

  // Filtered items (for Q&A)
  const displayedItems = useMemo(() => {
    return topicItems.filter((item) => {
      if (filterPriority !== "ALL" && item.priority !== filterPriority) return false;
      const isDone = completedIds.has(item.id);
      if (filterStatus === "COMPLETED" && !isDone) return false;
      if (filterStatus === "UNCOMPLETED" && isDone) return false;
      return true;
    });
  }, [topicItems, filterPriority, filterStatus, completedIds]);

  // Active section scrollspy via IntersectionObserver
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSectionId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-80px 0px -65% 0px",
        threshold: 0,
      }
    );

    const elements = document.querySelectorAll("article[id], section[id]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [displayedItems, isHandbook]);

  // Toggle item completion (Optimistic + Atomic arrayUnion on single Firestore doc)
  const handleToggleItem = async (itemId: string, itemTitle?: string, qNum?: number) => {
    const isCurrentlyDone = completedIds.has(itemId);
    const newCompleted = !isCurrentlyDone;

    // 1. Optimistic local update
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(itemId);
      else next.delete(itemId);
      localStorage.setItem(`progress_${subjectId}`, JSON.stringify(Array.from(next)));
      return next;
    });

    if (!user) return;

    try {
      setIsSyncing(true);
      const docRef = doc(db, "curriculum_progress", `${user.uid}_${subjectId}`);
      const todayStr = new Date().toISOString().split("T")[0];

      // Atomic single-doc update
      await setDoc(
        docRef,
        {
          userId: user.uid,
          subjectId,
          completedItemIds: newCompleted ? arrayUnion(itemId) : arrayRemove(itemId),
          lastStudiedAt: todayStr,
          updatedAt: Date.now(),
        },
        { merge: true }
      );

      // Auto-log to daily_logs on completion to tick Heatmaps & Streaks!
      if (newCompleted) {
        await addDoc(collection(db, "daily_logs"), {
          date: todayStr,
          topicId: subjectId,
          topicName: manifest?.name || subjectId,
          problemRange: qNum ? `${qNum}` : currentTopic?.name || "Topic Review",
          parsedCount: 1,
          isRevision: false,
          notes: itemTitle ? `Completed: ${itemTitle.slice(0, 60)}` : `Revised: ${currentTopic?.name}`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error("Failed to sync progress:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!manifest || !currentTopic) {
    return (
      <div className="container" style={{ padding: "4rem 0", textAlign: "center" }}>
        <h2>Topic not found</h2>
        <Link href={`/subjects/${subjectId}`} style={{ color: "var(--accent-primary)" }}>
          Return to {manifest?.name || "Subject"} Index
        </Link>
      </div>
    );
  }

  // Progress metrics
  const isChapterRevised = completedIds.has(`chapter_${currentTopic.id}`);
  const doneCount = topicItems.filter((i) => completedIds.has(i.id)).length;
  const progressPercent = topicItems.length > 0 ? Math.round((doneCount / topicItems.length) * 100) : 0;

  // DRY Topics Navigator (Used in Desktop Left Sidebar & Mobile Drawer)
  const renderTopicsNav = (onItemClick?: () => void) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      {manifest.topics.map((t) => {
        const isActive = t.id === topicId;
        const topicItemsTotal = manifest.items.filter((i) => i.topicId === t.id);
        const topicDone = topicItemsTotal.filter((i) => completedIds.has(i.id)).length;
        const isAllDone = topicItemsTotal.length > 0 && topicDone === topicItemsTotal.length;

        return (
          <Link
            key={t.id}
            href={`/subjects/${subjectId}/${t.id}`}
            onClick={() => onItemClick && onItemClick()}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
              padding: "0.5rem 0.65rem",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: isActive ? 700 : 500,
              color: isActive ? "#fff" : "var(--text-secondary)",
              background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
              borderLeft: isActive ? "3px solid var(--accent-primary)" : "3px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}>
              {t.name}
            </span>

            <span style={{
              fontSize: "0.72rem",
              color: isAllDone ? "var(--accent-emerald)" : "var(--text-muted)",
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "0.2rem",
              flexShrink: 0,
            }}>
              {isAllDone ? (
                <Check size={13} style={{ color: "var(--accent-emerald)" }} />
              ) : (
                `${topicDone}/${topicItemsTotal.length}`
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );

  // DRY In-Page Outline (Used in Desktop Right Sidebar & Mobile Drawer)
  const renderOutlineNav = (onItemClick?: () => void) => (
    <nav style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      {topicItems.map((item) => {
        const targetId = isHandbook ? `ref-${item.id}` : `q-${item.order}`;
        const isActive = activeSectionId === targetId;
        const isDone = completedIds.has(item.id);

        return (
          <a
            key={item.id}
            href={`#${targetId}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(targetId);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
                setActiveSectionId(targetId);
              }
              if (onItemClick) onItemClick();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.4rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.78rem",
              textDecoration: "none",
              color: isActive ? "var(--accent-cyan)" : isDone ? "#34d399" : "var(--text-secondary)",
              background: isActive ? "rgba(6, 182, 212, 0.1)" : "transparent",
              borderLeft: isActive ? "2px solid var(--accent-cyan)" : "2px solid transparent",
              fontWeight: isActive ? 700 : 400,
              transition: "all 0.15s ease",
              lineHeight: 1.4,
            }}
          >
            <span style={{
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              color: isActive ? "var(--accent-cyan)" : "var(--text-muted)",
              flexShrink: 0,
            }}>
              {isHandbook ? "•" : `#${item.order}`}
            </span>
            <span style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}>
              {item.title}
            </span>
            {isDone && (
              <Check size={12} style={{ color: "#34d399", flexShrink: 0 }} />
            )}
          </a>
        );
      })}
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Off-Canvas Backdrop (Mobile & Tablet) */}
      {!isDesktop && (
        <div
          className={`drawer-backdrop ${isMobileLeftOpen || isMobileRightOpen ? "drawer-open" : "drawer-closed"}`}
          onClick={() => {
            setIsMobileLeftOpen(false);
            setIsMobileRightOpen(false);
          }}
        />
      )}

      {/* Mobile Off-Canvas Drawer: Topics */}
      {!isDesktop && (
        <aside className={`mobile-drawer mobile-drawer-left sidebar-scroll ${isMobileLeftOpen ? "drawer-open" : ""}`} style={{ padding: "1.25rem 1rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "0.85rem",
            marginBottom: "0.75rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <BookOpen size={16} style={{ color: "var(--accent-primary)" }} />
              <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                {manifest.name}
              </strong>
            </div>
            <button
              onClick={() => setIsMobileLeftOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                padding: "0.3rem",
                cursor: "pointer",
                display: "flex",
              }}
              title="Close drawer"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {renderTopicsNav(() => setIsMobileLeftOpen(false))}
          </div>
        </aside>
      )}

      {/* Mobile Off-Canvas Drawer: In-Page Outline */}
      {!isDesktop && (
        <aside className={`mobile-drawer mobile-drawer-right sidebar-scroll ${isMobileRightOpen ? "drawer-open" : ""}`} style={{ padding: "1.25rem 1rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "0.85rem",
            marginBottom: "0.75rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <List size={16} style={{ color: "var(--accent-cyan)" }} />
              <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)" }}>
                On This Page ({topicItems.length})
              </strong>
            </div>
            <button
              onClick={() => setIsMobileRightOpen(false)}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "4px",
                color: "var(--text-secondary)",
                padding: "0.3rem",
                cursor: "pointer",
                display: "flex",
              }}
              title="Close outline"
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {renderOutlineNav(() => setIsMobileRightOpen(false))}
          </div>
        </aside>
      )}

      {/* Top Navbar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(8, 11, 17, 0.95)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "0.6rem 0",
      }}>
        <div style={{
          maxWidth: "1650px",
          margin: "0 auto",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
        }}>
          {/* Left section: Topics toggle + breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <button
              onClick={toggleLeftSidebar}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: isDesktop && !isLeftCollapsed ? "rgba(99, 102, 241, 0.15)" : "rgba(255,255,255,0.06)",
                border: isDesktop && !isLeftCollapsed ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid var(--border-subtle)",
                color: isDesktop && !isLeftCollapsed ? "#fff" : "var(--text-secondary)",
                padding: "0.32rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={isDesktop ? (isLeftCollapsed ? "Open Topics Sidebar" : "Collapse Topics Sidebar") : "Browse Topics"}
            >
              <BookOpen size={14} />
              <span>Topics</span>
            </button>

            <Link
              href="/"
              className="hide-on-mobile"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                color: "var(--text-muted)",
                fontSize: "0.82rem",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={13} /> Dashboard
            </Link>
            <span className="hide-on-mobile" style={{ color: "var(--border-subtle)" }}>/</span>

            <Link
              href={`/subjects/${subjectId}`}
              style={{
                color: "var(--accent-primary)",
                fontSize: "0.82rem",
                textDecoration: "none",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
              title="Return to Master Index"
            >
              <Layers size={14} style={{ flexShrink: 0 }} />
              <span className="hide-on-mobile">{isHandbook ? "Handbook Index" : "Master Index"}</span>
              <span className="show-on-mobile">{manifest.name.replace(/Interview.*/i, "").trim()}</span>
            </Link>
          </div>

          {/* Right section: Progress + Outline toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
            {isHandbook ? (
              <button
                onClick={() => handleToggleItem(`chapter_${currentTopic.id}`, currentTopic.name)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isChapterRevised ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.15)",
                  background: isChapterRevised ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: isChapterRevised ? "#34d399" : "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {isChapterRevised ? <CheckSquare size={14} /> : <Square size={14} />}
                <span className="hide-on-mobile">{isChapterRevised ? "Chapter Revised ✓" : "Mark as Revised"}</span>
                <span className="show-on-mobile">{isChapterRevised ? "Revised ✓" : "Revise"}</span>
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                  <strong style={{ color: "var(--accent-emerald)" }}>{doneCount}</strong>/{topicItems.length}
                  <span className="hide-on-mobile"> ({progressPercent}%)</span>
                </span>
                <div className="hide-on-mobile" style={{
                  width: "80px",
                  height: "5px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${progressPercent}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #10b981, #06b6d4)",
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}

            {isSyncing && (
              <span style={{ fontSize: "0.7rem", color: "var(--accent-primary)" }}>
                ●
              </span>
            )}

            <button
              onClick={toggleRightSidebar}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: isDesktop && !isRightCollapsed ? "rgba(6, 182, 212, 0.15)" : "rgba(255,255,255,0.06)",
                border: isDesktop && !isRightCollapsed ? "1px solid rgba(6, 182, 212, 0.4)" : "1px solid var(--border-subtle)",
                color: isDesktop && !isRightCollapsed ? "#fff" : "var(--text-secondary)",
                padding: "0.32rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
              title={isDesktop ? (isRightCollapsed ? "Open Outline" : "Collapse Outline") : "On This Page"}
            >
              <List size={14} />
              <span>Outline</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{
        display: "flex",
        width: "100%",
        maxWidth: "1650px",
        margin: "0 auto",
        position: "relative",
        alignItems: "stretch",
        minHeight: "calc(100vh - 52px)",
      }}>
        {/* ========================================================= */}
        {/* 1. DESKTOP LEFT SIDEBAR: MASTER TOPICS INDEX (>= 1200px)  */}
        {/* ========================================================= */}
        {isDesktop && (
          <aside
            className={`sidebar-desktop sidebar-desktop-left sidebar-scroll ${
              isLeftCollapsed ? "sidebar-desktop-collapsed" : "sidebar-desktop-expanded"
            }`}
            aria-label="Topics Navigation"
          >
            <div className="sidebar-content-inner">
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "0.75rem",
                marginBottom: "0.5rem",
                borderBottom: "1px solid var(--border-subtle)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <BookOpen size={15} style={{ color: "var(--accent-primary)" }} />
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                    Topics ({manifest.topics.length})
                  </span>
                </div>
                <button
                  onClick={toggleLeftSidebar}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "0.2rem",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                  }}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>

              {renderTopicsNav()}
            </div>
          </aside>
        )}

        {/* ========================================================= */}
        {/* 2. CENTER COLUMN: MAIN READING CONTENT                    */}
        {/* ========================================================= */}
        <main style={{
          flex: 1,
          minWidth: 0,
          padding: isDesktop ? "2rem 2.5rem 6rem 2.5rem" : "1.25rem 1rem 6rem 1rem",
          maxWidth: isDesktop ? (isLeftCollapsed && isRightCollapsed ? "1060px" : "900px") : "100%",
          margin: "0 auto",
          transition: "max-width 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          {/* Markdown-Style Top Navigation Bar */}
          <nav style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "1.25rem",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "0.88rem",
            color: "var(--text-muted)",
          }}>
            {prevTopic ? (
              <Link
                href={`/subjects/${subjectId}/${prevTopic.id}`}
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <ChevronLeft size={14} />
                <span className="hide-on-mobile">Previous: </span>{prevTopic.name.replace(/^\d+\.\s*/, "")}
              </Link>
            ) : (
              <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <SkipBack size={13} /> (start)
              </span>
            )}

            <Link
              href={`/subjects/${subjectId}`}
              style={{
                color: "var(--accent-primary)",
                textDecoration: "none",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.85rem",
              }}
            >
              <Layers size={14} /> Index
            </Link>

            {nextTopic ? (
              <Link
                href={`/subjects/${subjectId}/${nextTopic.id}`}
                style={{
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <span className="hide-on-mobile">Next: </span>{nextTopic.name.replace(/^\d+\.\s*/, "")}
                <ChevronRight size={14} />
              </Link>
            ) : (
              <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                (end) <SkipForward size={13} />
              </span>
            )}
          </nav>

          {/* Topic Heading matching Markdown */}
          <header style={{ marginBottom: "1.75rem" }}>
            <h1 style={{
              fontSize: "1.85rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: "0.5rem",
              color: "var(--text-primary)",
            }}>
              ## {currentTopic.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {isHandbook ? (
                <span>Revision Scope: <code style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{currentTopic.rangeOrLabel}</code> &nbsp;·&nbsp; {topicItems.length} Reference Cards</span>
              ) : (
                <span>Problem IDs: <code style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>{currentTopic.rangeOrLabel}</code> &nbsp;·&nbsp; {topicItems.length} Questions</span>
              )}
            </p>
          </header>

        {!isHandbook && (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.6rem",
            marginBottom: "2rem",
            padding: "0.6rem 0.85rem",
            background: "rgba(15, 23, 42, 0.4)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}>
            <div className="filter-scroll-row" style={{ flex: 1 }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.2rem", flexShrink: 0 }}>Filter:</span>
              <button
                onClick={() => setFilterPriority("ALL")}
                style={{
                  background: filterPriority === "ALL" ? "var(--accent-primary)" : "rgba(255,255,255,0.06)",
                  color: filterPriority === "ALL" ? "#fff" : "var(--text-secondary)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                All ({topicItems.length})
              </button>
              <button
                onClick={() => setFilterPriority(filterPriority === "P0" ? "ALL" : "P0")}
                style={{
                  background: filterPriority === "P0" ? "#dc2626" : "rgba(220, 38, 38, 0.12)",
                  color: filterPriority === "P0" ? "#fff" : "#fca5a5",
                  border: "1px solid rgba(220, 38, 38, 0.3)",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                🔴 P0 Only ({topicItems.filter((q) => q.priority === "P0").length})
              </button>
              <button
                onClick={() => setFilterStatus(filterStatus === "UNCOMPLETED" ? "ALL" : "UNCOMPLETED")}
                style={{
                  background: filterStatus === "UNCOMPLETED" ? "var(--accent-amber)" : "rgba(245, 158, 11, 0.12)",
                  color: filterStatus === "UNCOMPLETED" ? "#000" : "#fcd34d",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "4px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Unsolved ({topicItems.length - doneCount})
              </button>
            </div>

            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Showing {displayedItems.length} of {topicItems.length} items
            </span>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ARCHETYPE A: INTERVIEW Q&A (Full Content & Syntax Highlighting) */}
        {/* ------------------------------------------------------------- */}
        {!isHandbook && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "3.5rem" }}>
            {displayedItems.map((q) => {
              const isDone = completedIds.has(q.id);

              return (
                <article
                  key={q.id}
                  id={`q-${q.order}`}
                  style={{
                    background: isDone ? "rgba(16, 185, 129, 0.025)" : "rgba(15, 23, 42, 0.45)",
                    border: `1px solid ${isDone ? "rgba(16, 185, 129, 0.3)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: isDesktop ? "1.5rem" : "1.1rem 0.9rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Question Header: ### QNum. 🔴 P0 [Type] Title */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "1rem" }}>
                    <button
                      onClick={() => handleToggleItem(q.id, q.title, q.order)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: isDone ? "#34d399" : "var(--text-muted)",
                        minWidth: "36px",
                        minHeight: "36px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.2rem",
                        flexShrink: 0,
                      }}
                      title={isDone ? "Mark as uncompleted" : "Mark as completed (auto-logs to streak)"}
                    >
                      {isDone ? <CheckSquare size={22} /> : <Square size={22} />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.35rem" }}>
                        <span style={{ fontWeight: 800, color: isDone ? "#34d399" : "var(--text-primary)", fontSize: "1.15rem" }}>
                          ### {q.order}.
                        </span>

                        <span style={{
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          color: q.priority === "P0" ? "#fca5a5" : "#fed7aa",
                        }}>
                          {q.priority === "P0" ? "🔴 P0" : "🟠 P1"}
                        </span>

                        <span style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          background: "rgba(255, 255, 255, 0.05)",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "3px",
                        }}>
                          [{q.type}]
                        </span>

                        <h3 style={{
                          fontSize: "1.05rem",
                          fontWeight: 700,
                          color: isDone ? "var(--text-secondary)" : "var(--text-primary)",
                          textDecoration: isDone ? "line-through" : "none",
                          lineHeight: 1.5,
                          display: "inline",
                        }}>
                          {q.title}
                        </h3>

                        {q.leetcodeUrl && (
                          <a
                            href={q.leetcodeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.8rem",
                              color: "#f59e0b",
                              textDecoration: "none",
                              marginLeft: "0.4rem",
                              fontWeight: 600,
                            }}
                            title="Open official LeetCode problem"
                          >
                            LeetCode <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 1. TL;DR Blockquote (Markdown Style) */}
                  {q.summary && (
                    <blockquote style={{
                      padding: "0.75rem 1rem",
                      background: "rgba(99, 102, 241, 0.07)",
                      borderLeft: "3px solid var(--accent-primary)",
                      borderRadius: "0 6px 6px 0",
                      fontSize: "0.9rem",
                      color: "#e0e7ff",
                      lineHeight: 1.6,
                      marginBottom: "1.25rem",
                    }}>
                      <strong style={{ color: "var(--accent-primary)", display: "inline-block", marginRight: "0.4rem" }}>
                        TL;DR:
                      </strong>
                      <MarkdownRenderer content={q.summary} />
                    </blockquote>
                  )}

                  {/* 2. Core Concept & Explanation */}
                  {q.explanation && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h4 style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        marginBottom: "0.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}>
                        💡 Core Concept & Explanation
                      </h4>
                      <MarkdownRenderer content={q.explanation} />
                    </div>
                  )}

                  {/* 3. Code Implementation with Syntax Highlighting */}
                  {q.codeSnippet && (
                    <div style={{ marginBottom: "1.25rem" }}>
                      <h4 style={{
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        color: "var(--text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        marginBottom: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}>
                        🛠️ Code / Implementation
                      </h4>
                      <CodeBlock code={q.codeSnippet} language="javascript" title="JavaScript Solution & Logic" />
                    </div>
                  )}

                  {/* 4. Interview Pitfalls & Gotchas Alert */}
                  {q.gotchas && (
                    <div style={{
                      padding: "0.85rem 1.1rem",
                      background: "rgba(239, 68, 68, 0.07)",
                      borderLeft: "3px solid #ef4444",
                      borderRadius: "0 6px 6px 0",
                      fontSize: "0.88rem",
                      color: "#fecaca",
                      lineHeight: 1.6,
                    }}>
                      <strong style={{ color: "#f87171", display: "block", marginBottom: "0.35rem" }}>
                        ⚠️ Interview Pitfall / Pro-Tip:
                      </strong>
                      <MarkdownRenderer content={q.gotchas} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* ARCHETYPE B: REVISION HANDBOOK (Syntax Cards with Highlighting) */}
        {/* ------------------------------------------------------------- */}
        {isHandbook && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem", marginBottom: "3.5rem" }}>
            {topicItems.map((item) => (
              <section
                key={item.id}
                id={`ref-${item.id}`}
                style={{
                  background: "rgba(15, 23, 42, 0.45)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: isDesktop ? "1.5rem" : "1.1rem 0.9rem",
                }}
              >
                {/* Reference Block Title */}
                <h3 style={{
                  fontSize: isDesktop ? "1.2rem" : "1.05rem",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}>
                  <span style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: "0.95rem" }}>
                    ###
                  </span>
                  {item.title}
                </h3>

                {/* Explanation text */}
                {item.summary && (
                  <div style={{ marginBottom: "1rem" }}>
                    <MarkdownRenderer content={item.summary} />
                  </div>
                )}

                {/* Syntax Highlighted Code Template */}
                {item.codeSnippet && (
                  <div style={{ marginBottom: "1rem" }}>
                    <CodeBlock code={item.codeSnippet} language="javascript" title="Algorithmic Syntax Template" />
                  </div>
                )}

                {/* Highlighted Gotchas Blockquote */}
                {item.gotchas && (
                  <blockquote style={{
                    padding: "0.75rem 1rem",
                    background: "rgba(245, 158, 11, 0.08)",
                    borderLeft: "3px solid var(--accent-amber)",
                    borderRadius: "0 6px 6px 0",
                    fontSize: "0.88rem",
                    color: "#fef3c7",
                    lineHeight: 1.6,
                  }}>
                    <strong style={{ display: "block", marginBottom: "0.25rem", color: "var(--accent-amber)" }}>
                      ⚠️ Don't Forget:
                    </strong>
                    <MarkdownRenderer content={item.gotchas.replace(/^⚠️\s*\*\*Don't Forget.*?\*\*:\s*/i, "")} />
                  </blockquote>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Markdown-Style Bottom Navigation Bar */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}>
          {prevTopic ? (
            <Link
              href={`/subjects/${subjectId}/${prevTopic.id}`}
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <ChevronLeft size={14} />
              <span className="hide-on-mobile">Prev: </span>{prevTopic.name.replace(/^\d+\.\s*/, "").slice(0, 16)}
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <SkipBack size={13} /> (start)
            </span>
          )}

          <Link
            href={`/subjects/${subjectId}`}
            style={{
              color: "var(--accent-primary)",
              textDecoration: "none",
              fontWeight: 700,
              padding: "0.3rem 0.65rem",
              borderRadius: "4px",
              background: "rgba(99, 102, 241, 0.08)",
              fontSize: "0.82rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Layers size={13} /> Index
          </Link>

          {nextTopic ? (
            <Link
              href={`/subjects/${subjectId}/${nextTopic.id}`}
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span className="hide-on-mobile">Next: </span>{nextTopic.name.replace(/^\d+\.\s*/, "").slice(0, 16)}
              <ChevronRight size={14} />
            </Link>
          ) : (
            <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              (end) <SkipForward size={13} />
            </span>
          )}
        </nav>
      </main>

      {/* ========================================================= */}
      {/* 3. DESKTOP RIGHT SIDEBAR: IN-PAGE OUTLINE (>= 1200px)     */}
      {/* ========================================================= */}
      {isDesktop && (
        <aside
          className={`sidebar-desktop sidebar-desktop-right sidebar-scroll ${
            isRightCollapsed ? "sidebar-desktop-collapsed" : "sidebar-desktop-expanded"
          }`}
          aria-label="In-page outline"
        >
          <div className="sidebar-content-inner">
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "0.75rem",
              marginBottom: "0.5rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <List size={15} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-muted)" }}>
                  On This Page ({topicItems.length})
                </span>
              </div>
              <button
                onClick={toggleRightSidebar}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "0.2rem",
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "4px",
                }}
                title="Collapse outline"
              >
                <PanelRightClose size={16} />
              </button>
            </div>

            {renderOutlineNav()}
          </div>
        </aside>
      )}
    </div>
  </div>
);
}
