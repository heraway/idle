import React, { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, clearToken } from "../api/client";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    acceptedTerms: true;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await api<User>("/users/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) await refreshUser();
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    await setToken(res.token);
    setUser(res.user);
  };

  const register: AuthContextValue["register"] = async (data) => {
    const res = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: data,
      auth: false,
    });
    await setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
