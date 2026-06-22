"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"

import {
  apiFetch,
  AuthTokens,
  getStoredTokens,
  logoutSession,
  storeTokens,
} from "@/lib/api"

export type CurrentUser = {
  user_id: number
  email: string
  org_id: number
  organization_name: string
  organization_slug: string
  full_name?: string | null
  display_name?: string | null
  phone?: string | null
  timezone?: string | null
  language?: string | null
  email_workflow_summaries: boolean
  compact_tables: boolean
  roles: string[]
  permissions: string[]
}

type AuthContextType = {
  token: string | null
  user: CurrentUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (tokens: AuthTokens) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<CurrentUser | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const [token, setToken] = useState<string | null>(() => getStoredTokens().accessToken)
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(() => !!getStoredTokens().accessToken)

  const refreshUser = useCallback(async () => {
    if (!getStoredTokens().accessToken) {
      setUser(null)
      return null
    }

    const profile = await apiFetch<CurrentUser>("/auth/me")
    setUser(profile)
    return profile
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const profile = await apiFetch<CurrentUser>("/auth/me")

        if (!cancelled) {
          setUser(profile)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [token])

  function login(tokens: AuthTokens) {
    storeTokens(tokens)
    setToken(tokens.access_token)
  }

  async function logout() {
    await logoutSession()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        loading,
        login,
        logout,
        refreshUser,
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
