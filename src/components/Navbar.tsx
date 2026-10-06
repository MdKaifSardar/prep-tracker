"use client";

import React from "react";
import { useAuth } from "@/lib/authContext";
import { PlusCircle, LogOut, Flame, Database } from "lucide-react";

interface NavbarProps {
  onOpenLogModal: () => void;
  onSeedData: () => void;
  streak: number;
}

export default function Navbar({ onOpenLogModal, onSeedData, streak }: NavbarProps) {
  const { user, logOut } = useAuth();

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 40,
      background: "rgba(8, 11, 17, 0.85)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <div className="container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "4.25rem",
      }}>
        {/* Logo & Subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{
            width: "2.5rem",
            height: "2.5rem",
            borderRadius: "var(--radius-md)",
            background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: "1.1rem",
            boxShadow: "0 0 15px rgba(99, 102, 241, 0.4)",
          }}>
            ⚡
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.02em" }}>
                PREP TRACKER
              </span>
              {streak > 0 && (
                <span className="badge" style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "var(--accent-fire)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}>
                  <Flame size={12} fill="currentColor" /> {streak}d streak
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {todayStr}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Quick Log Button */}
          <button
            onClick={onOpenLogModal}
            className="btn-primary"
            style={{ fontSize: "0.85rem", padding: "0.55rem 1rem" }}
          >
            <PlusCircle size={16} />
            <span>Log Problems</span>
          </button>

          {/* Seed Data Button */}
          <button
            onClick={onSeedData}
            title="Import/Sync initial topics & Excel history"
            className="btn-secondary"
            style={{ padding: "0.55rem 0.75rem", fontSize: "0.8rem" }}
          >
            <Database size={15} />
            <span>Sync Excel</span>
          </button>

          {/* User Profile & Logout */}
          {user && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              paddingLeft: "0.5rem",
              borderLeft: "1px solid var(--border-subtle)",
            }}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                />
              ) : (
                <div style={{
                  width: "2rem",
                  height: "2rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--accent-primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                }}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}

              <button
                onClick={logOut}
                title="Log out"
                style={{
                  color: "var(--text-muted)",
                  padding: "0.4rem",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-rose)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
