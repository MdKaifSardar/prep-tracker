"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { ShieldAlert, Sparkles, CheckCircle2, Zap } from "lucide-react";

export default function AuthScreen() {
  const { user, isAuthorized, signInWithGoogle, logOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignIn = async () => {
    setErrorMsg("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMsg(err.message || "Failed to sign in with Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "mkaifsard564773@gmail.com";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
      position: "relative",
    }}>
      <div className="glass-card" style={{
        width: "100%",
        maxWidth: "440px",
        padding: "2.5rem 2rem",
        textAlign: "center",
        boxShadow: "var(--shadow-card)",
      }}>
        {/* Logo */}
        <div style={{
          width: "3.5rem",
          height: "3.5rem",
          borderRadius: "var(--radius-lg)",
          background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "1.75rem",
          fontWeight: 800,
          margin: "0 auto 1.5rem",
          boxShadow: "0 0 25px rgba(99, 102, 241, 0.4)",
        }}>
          <Zap size={28} fill="#fff" color="#fff" />
        </div>

        {/* Not Signed In */}
        {!user && (
          <>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
              Interview Prep Tracker
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Track daily progress, build consistency streaks, and monitor your syllabus completion across DSA, JavaScript, and CS fundamentals.
            </p>

            {errorMsg && (
              <div style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-sm)",
                background: "rgba(244, 63, 94, 0.15)",
                color: "var(--accent-rose)",
                fontSize: "0.8rem",
                marginBottom: "1rem",
              }}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "0.8rem 1.25rem",
                fontSize: "0.95rem",
                marginBottom: "1.75rem",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#fff"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#fff"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#fff"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#fff"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? "Signing in..." : "Sign in with Google"}</span>
            </button>

            {/* Feature Highlights */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              textAlign: "left",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "1.25rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span>Automated consecutive-day streaks & records</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span>Interactive GitHub-style contribution heatmap</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span>Real-time cloud sync powered by Cloud Firestore</span>
              </div>
            </div>
          </>
        )}

        {/* Signed In with Unauthorized Account */}
        {user && !isAuthorized && (
          <>
            <div style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "var(--radius-full)",
              background: "rgba(244, 63, 94, 0.15)",
              color: "var(--accent-rose)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}>
              <ShieldAlert size={24} />
            </div>

            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Access Denied
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              This personal preparation tracker is restricted to <strong>{adminEmail}</strong>.
            </p>
            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              padding: "0.5rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              marginBottom: "1.5rem",
            }}>
              Currently signed in as: <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>
            </div>

            <button
              onClick={logOut}
              className="btn-primary"
              style={{ width: "100%", background: "var(--accent-rose)" }}
            >
              Sign Out & Switch Account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
