import React from "react";
import Skeleton from "@/components/Skeleton";

export default function SubjectIndexLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* Top Navbar Skeleton */}
      <div
        style={{
          height: "52px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(8, 11, 17, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Skeleton width={100} height={16} />
          <span style={{ color: "var(--border-subtle)" }}>/</span>
          <Skeleton width={140} height={16} />
        </div>
        <Skeleton width={110} height={26} borderRadius={16} />
      </div>

      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1rem 5rem 1rem" }}>
        {/* Subject Header Skeleton */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.75rem",
            marginBottom: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Skeleton width={160} height={24} borderRadius={12} />
            <Skeleton width={100} height={24} borderRadius={12} />
          </div>
          <Skeleton width="45%" height={32} />
          <Skeleton width="70%" height={16} />
          <Skeleton height={8} borderRadius={4} />
        </div>

        {/* Master Index Table Skeleton */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.85rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <Skeleton width={200} height={22} />
            <Skeleton width={120} height={22} />
          </div>

          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                gap: "1rem",
              }}
            >
              <Skeleton width={32} height={16} />
              <Skeleton width="40%" height={16} />
              <Skeleton width={90} height={16} />
              <Skeleton width={110} height={24} borderRadius={12} />
              <Skeleton width={80} height={28} borderRadius={6} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
