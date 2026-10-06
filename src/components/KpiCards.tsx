"use client";

import React from "react";
import { KPIStats } from "@/types";
import { CheckCircle2, Layers, Flame, Trophy, Calendar, TrendingUp } from "lucide-react";

interface KpiCardsProps {
  stats: KPIStats;
}

export default function KpiCards({ stats }: KpiCardsProps) {
  const cards = [
    {
      label: "QUESTIONS TODAY",
      value: stats.todayQuestions,
      subtext: stats.todayQuestions > 0 ? "Active today" : "Not logged yet today",
      icon: CheckCircle2,
      color: "var(--accent-emerald)",
      glow: "rgba(16, 185, 129, 0.2)",
    },
    {
      label: "TOPICS TODAY",
      value: stats.todayTopics,
      subtext: stats.todayTopics > 0 ? `${stats.todayTopics} distinct subjects` : "0 subjects so far",
      icon: Layers,
      color: "var(--accent-cyan)",
      glow: "rgba(6, 182, 212, 0.2)",
    },
    {
      label: "CURRENT STREAK",
      value: `${stats.currentStreak}d`,
      subtext: stats.currentStreak > 0 ? "Consistency on fire!" : "Start your streak today",
      icon: Flame,
      color: "var(--accent-fire)",
      glow: "rgba(239, 68, 68, 0.25)",
    },
    {
      label: "BEST STREAK",
      value: `${stats.bestStreak}d`,
      subtext: "All-time personal record",
      icon: Trophy,
      color: "var(--accent-amber)",
      glow: "rgba(245, 158, 11, 0.2)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "2rem" }}>
      {/* 4 Primary Hero KPI Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1rem",
      }}>
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: "1.25rem 1.4rem",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle accent line at top */}
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                background: `linear-gradient(90deg, ${c.color}, transparent)`,
              }} />

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                }}>
                  {c.label}
                </span>
                <div style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "var(--radius-sm)",
                  background: c.glow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: c.color,
                }}>
                  <Icon size={16} />
                </div>
              </div>

              <div style={{
                fontSize: "2.25rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                lineHeight: 1.1,
                marginBottom: "0.35rem",
              }}>
                {c.value}
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {c.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Period Aggregations Bar (Matches Excel Dashboard B10:N11) */}
      <div className="glass-card" style={{
        padding: "1rem 1.5rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: "1rem",
        alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", borderRight: "1px solid var(--border-subtle)" }}>
          <TrendingUp size={18} color="var(--accent-primary)" />
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>PERIOD METRICS</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 700 }}>Progress Breakdown</div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>TODAY</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)" }}>{stats.todayQuestions}</div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>LAST 7 DAYS</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-cyan)" }}>{stats.last7Days}</div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>THIS WEEK</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-primary)" }}>{stats.thisWeek}</div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>THIS MONTH</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-amber)" }}>{stats.thisMonth}</div>
        </div>

        <div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>ALL-TIME TOTAL</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--accent-emerald)" }}>{stats.totalCompleted}</div>
        </div>
      </div>
    </div>
  );
}
