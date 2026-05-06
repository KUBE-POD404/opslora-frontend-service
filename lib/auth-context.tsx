"use client"

import { createContext, useContext, useState } from "react"

import {
  AuthTokens,
  getStoredTokens,
  logoutSession,
  storeTokens,
} from "@/lib/api"

type AuthContextType = {
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (tokens: AuthTokens) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [token, setToken] = useState<string | null>(() => getStoredTokens().accessToken)
  const [loading] = useState(false)

  function login(tokens: AuthTokens) {
    storeTokens(tokens)
    setToken(tokens.access_token)
  }

  async function logout() {
    await logoutSession()
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider")
  }

  return ctx
}
