"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthorized: false,
  signInWithGoogle: async () => {},
  logOut: async () => {},
});

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase().trim();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        const userEmail = currentUser.email.toLowerCase().trim();
        // Check if admin email matches or whitelist is unset in local dev
        const authorized = !ADMIN_EMAIL || userEmail === ADMIN_EMAIL;
        setIsAuthorized(authorized);
      } else {
        setIsAuthorized(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign in failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthorized(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthorized,
        signInWithGoogle,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
