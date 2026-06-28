const API_URL = "/api/v1"
const ACCESS_TOKEN_KEY = "access_token"
const REFRESH_TOKEN_KEY = "refresh_token"
const LEGACY_TOKEN_KEY = "token"

export type AuthTokens = {
  access_token: string
  refresh_token: string
  token_type?: string
}

function readAccessToken() {
  if (typeof window === "undefined") return null

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (accessToken) return accessToken

  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacyToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, legacyToken)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }

  return legacyToken
}

function readRefreshToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredTokens() {
  return {
    accessToken: readAccessToken(),
    refreshToken: readRefreshToken(),
  }
}

export function storeTokens(tokens: AuthTokens) {
  if (typeof window === "undefined") return
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

async function refreshAccessToken() {
  const refreshToken = readRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    clearStoredTokens()
    return null
  }

  const tokens = (await res.json()) as AuthTokens
  storeTokens(tokens)
  return tokens.access_token
}

function redirectToLogin() {
  if (typeof window === "undefined") return
  clearStoredTokens()
  window.location.href = "/auth/login"
}

async function parseErrorMessage(res: Response) {
  let message = "Something went wrong"

  try {
    const error = await res.json()
    message =
      error.error?.message ??
      error.error ??
      error.detail ??
      message
  } catch {}

  return message
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const token = readAccessToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    const newAccessToken = await refreshAccessToken()

    if (newAccessToken) {
      res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newAccessToken}`,
        },
      })
    }
  }

  if (res.status === 401) {
    redirectToLogin()
    throw new Error("Session expired")
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  return res.json()
}

export async function downloadApiBlob(path: string, fallbackFilename: string) {
  const headers: Record<string, string> = {}
  const token = readAccessToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let res = await fetch(`${API_URL}${path}`, { headers })

  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    const newAccessToken = await refreshAccessToken()
    if (newAccessToken) {
      res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${newAccessToken}` },
      })
    }
  }

  if (res.status === 401) {
    redirectToLogin()
    throw new Error("Session expired")
  }

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res))
  }

  const blob = await res.blob()
  const contentDisposition = res.headers.get("content-disposition")
  const filename = filenameFromContentDisposition(contentDisposition) ?? fallbackFilename
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) return null
  const filenamePart = value
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("filename="))
  if (!filenamePart) return null
  return filenamePart.slice("filename=".length).replaceAll('"', "")
}

export async function logoutSession() {
  const refreshToken = readRefreshToken()

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {}
  }

  clearStoredTokens()
}
