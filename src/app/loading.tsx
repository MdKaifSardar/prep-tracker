import React from "react";
import Skeleton from "@/components/Skeleton";

export default function Loading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Top Navbar Skeleton */}
      <header
        style={{
          height: "56px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(8, 11, 17, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Skeleton width={32} height={32} borderRadius={8} />
          <Skeleton width={140} height={18} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Skeleton width={90} height={32} borderRadius={6} />
          <Skeleton width={32} height={32} variant="circular" />
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "2rem 1.5rem 5rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.75rem",
        }}
      >
        {/* KPI Cards Skeleton Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width={80} height={14} />
                <Skeleton width={24} height={24} variant="circular" />
              </div>
              <Skeleton width={120} height={28} />
              <Skeleton width={160} height={12} />
            </div>
          ))}
        </div>

        {/* Heatmap Section Skeleton */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Skeleton width={180} height={20} />
            <Skeleton width={100} height={14} />
          </div>
          <Skeleton height={140} borderRadius={8} />
        </div>

        {/* Curriculum Grid Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.9rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Skeleton width={140} height={18} />
                <Skeleton width={60} height={20} borderRadius={12} />
              </div>
              <Skeleton height={8} borderRadius={4} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width={80} height={12} />
                <Skeleton width={50} height={12} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
