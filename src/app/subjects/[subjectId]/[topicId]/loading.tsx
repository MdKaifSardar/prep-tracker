import React from "react";
import Skeleton from "@/components/Skeleton";

export default function DedicatedTopicLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Top Navbar Skeleton */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          height: "52px",
          background: "rgba(8, 11, 17, 0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Skeleton width={75} height={28} borderRadius={6} />
          <Skeleton width={80} height={16} />
          <span style={{ color: "var(--border-subtle)" }}>/</span>
          <Skeleton width={130} height={16} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Skeleton width={60} height={24} borderRadius={12} />
          <Skeleton width={80} height={28} borderRadius={6} />
        </div>
      </div>

      {/* Main Dual Sidebar Layout Container */}
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: "1650px",
          margin: "0 auto",
          alignItems: "stretch",
          minHeight: "calc(100vh - 52px)",
        }}
      >
        {/* Left Desktop Sidebar Skeleton */}
        <aside
          className="hide-on-tablet"
          style={{
            width: "270px",
            minWidth: "270px",
            borderRight: "1px solid var(--border-subtle)",
            background: "rgba(10, 15, 29, 0.5)",
            padding: "1.25rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <Skeleton width={110} height={16} />
            <Skeleton width={20} height={20} borderRadius={4} />
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0" }}>
              <Skeleton width={22} height={14} />
              <Skeleton width="75%" height={14} />
              <Skeleton width={24} height={12} style={{ marginLeft: "auto" }} />
            </div>
          ))}
        </aside>

        {/* Center Main Reading Content Skeleton */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "2rem 2.5rem 6rem 2.5rem",
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* Top Breadcrumb Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <Skeleton width={120} height={16} />
            <Skeleton width={80} height={16} />
            <Skeleton width={120} height={16} />
          </div>

          {/* Header & Meta Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Skeleton width={70} height={22} borderRadius={12} />
              <Skeleton width={100} height={22} borderRadius={12} />
            </div>
            <Skeleton width="65%" height={36} />
            <Skeleton width="90%" height={16} />
          </div>

          {/* Question / Card Wireframes */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Skeleton width={24} height={24} borderRadius={4} />
                <Skeleton width={32} height={18} />
                <Skeleton width="55%" height={20} />
              </div>

              {/* Code block placeholder */}
              <Skeleton height={140} borderRadius={6} />

              {/* Explanation lines placeholder */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
                <Skeleton width="95%" height={14} />
                <Skeleton width="88%" height={14} />
                <Skeleton width="72%" height={14} />
              </div>
            </div>
          ))}
        </main>

        {/* Right Desktop Outline Skeleton */}
        <aside
          className="hide-on-tablet"
          style={{
            width: "260px",
            minWidth: "260px",
            borderLeft: "1px solid var(--border-subtle)",
            background: "rgba(10, 15, 29, 0.5)",
            padding: "1.25rem 0.85rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <Skeleton width={120} height={16} />
            <Skeleton width={20} height={20} borderRadius={4} />
          </div>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0" }}>
              <Skeleton width={18} height={12} />
              <Skeleton width="80%" height={13} />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
