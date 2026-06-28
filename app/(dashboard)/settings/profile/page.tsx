"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Building2,
  KeyRound,
  Laptop,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { apiFetch } from "@/lib/api"
import { type CurrentUser, useAuth } from "@/lib/auth-context"

type ProfileForm = {
  full_name: string
  display_name: string
  phone: string
  timezone: string
  language: string
  email_workflow_summaries: boolean
  compact_tables: boolean
}

type PasswordForm = {
  current_password: string
  new_password: string
  confirm_password: string
}

const emptyProfileForm: ProfileForm = {
  full_name: "",
  display_name: "",
  phone: "",
  timezone: "Asia/Calcutta",
  language: "English",
  email_workflow_summaries: true,
  compact_tables: true,
}

const emptyPasswordForm: PasswordForm = {
  current_password: "",
  new_password: "",
  confirm_password: "",
}

function profileToForm(profile: CurrentUser | null): ProfileForm {
  if (!profile) return emptyProfileForm

  return {
    full_name: profile.full_name ?? "",
    display_name: profile.display_name ?? "",
    phone: profile.phone ?? "",
    timezone: profile.timezone ?? "Asia/Calcutta",
    language: profile.language ?? "English",
    email_workflow_summaries: profile.email_workflow_summaries,
    compact_tables: profile.compact_tables,
  }
}

function initials(profile: CurrentUser | null) {
  const source =
    profile?.display_name || profile?.full_name || profile?.email || "Opslora User"

  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<CurrentUser | null>(user)
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(user))
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(emptyPasswordForm)
  const [loading, setLoading] = useState(!user)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const displayName = useMemo(
    () =>
      profile?.display_name ||
      profile?.full_name ||
      profile?.email ||
      "Opslora User",
    [profile]
  )

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoading(true)

      try {
        const nextProfile = await refreshUser()

        if (!cancelled) {
          setProfile(nextProfile)
          setForm(profileToForm(nextProfile))
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load profile")
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      cancelled = true
    }
  }, [refreshUser])

  function updateForm<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updatePasswordForm<K extends keyof PasswordForm>(
    key: K,
    value: PasswordForm[K]
  ) {
    setPasswordForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const updated = await apiFetch<CurrentUser>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: form.full_name || null,
          display_name: form.display_name || null,
          phone: form.phone || null,
          timezone: form.timezone || null,
          language: form.language || null,
          email_workflow_summaries: form.email_workflow_summaries,
          compact_tables: form.compact_tables,
        }),
      })

      setProfile(updated)
      setForm(profileToForm(updated))
      await refreshUser()
      toast.success("Profile settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New password and confirmation do not match")
      return
    }

    setChangingPassword(true)

    try {
      await apiFetch<{ status: string }>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      })

      setPasswordForm(emptyPasswordForm)
      toast.success("Password changed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-[28px]">Profile Settings</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Manage your signed-in user profile, preferences, and account security.
            Organization settings stay separate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-blue-300/40 bg-blue-500/10 text-blue-600 dark:text-blue-200">
            User scope
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md"
            onClick={() => setForm(profileToForm(profile))}
            disabled={saving}
          >
            Discard
          </Button>
          <Button form="profile-form" className="h-9 rounded-md bg-primary text-primary-foreground hover:bg-[#262a33]" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      <Card className="rounded-lg border">
        <CardContent className="grid gap-5 pt-0 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:items-center">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#181c24] text-lg font-semibold text-white">
              {initials(profile)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-foreground">{displayName}</h2>
                {profile?.roles.map((role) => (
                  <Badge key={role} className="border-emerald-300/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                    {role}
                  </Badge>
                ))}
                <Badge className="border-amber-300/40 bg-amber-500/10 text-amber-700 dark:text-amber-200">
                  2FA ready
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">
            This page changes the current user only. Business identity, invoice settings,
            and feature flags remain in Organization Settings.
          </p>
        </CardContent>
      </Card>

      <form id="profile-form" onSubmit={handleSave}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-4 w-4" />
                Personal details
              </CardTitle>
              <CardDescription>
                These details identify you inside Opslora audit trails and ownership
                fields.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="full_name">Full name</FieldLabel>
                    <Input
                      id="full_name"
                      value={form.full_name}
                      onChange={(e) => updateForm("full_name", e.target.value)}
                      placeholder="Opslora Admin"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="display_name">Display name</FieldLabel>
                    <Input
                      id="display_name"
                      value={form.display_name}
                      onChange={(e) => updateForm("display_name", e.target.value)}
                      placeholder="Admin"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" value={profile?.email ?? ""} disabled />
                  <FieldDescription>
                    Email changes need a verification flow, so this stays read-only for
                    now.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    placeholder="+91 90000 00000"
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="rounded-lg border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Workspace identity
              </CardTitle>
              <CardDescription>
                Role and organization membership are read-only here. Admins manage
                access from team settings later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Role</FieldLabel>
                    <Input value={profile?.roles[0] ?? "Member"} disabled />
                  </Field>
                  <Field>
                    <FieldLabel>Organization</FieldLabel>
                    <Input value={profile?.organization_name ?? "Opslora"} disabled />
                  </Field>
                  <Field>
                    <FieldLabel>Default workspace</FieldLabel>
                    <Input value={profile?.organization_slug ?? "main-workspace"} disabled />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="language">Language</FieldLabel>
                    <Input id="language" value={form.language} onChange={(e) => updateForm("language", e.target.value)} />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Preferences
            </CardTitle>
            <CardDescription>
              Default choices that make the admin app faster for repeated daily work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
                <Input
                  id="timezone"
                  form="profile-form"
                  value={form.timezone}
                  onChange={(e) => updateForm("timezone", e.target.value)}
                  placeholder="Asia/Calcutta"
                />
              </Field>
                <PreferenceToggle
                  id="email_workflow_summaries"
                  title="Email workflow summaries"
                  description="Receive summaries for order, invoice, and payment activity."
                  checked={form.email_workflow_summaries}
                  onCheckedChange={(checked) =>
                    updateForm("email_workflow_summaries", checked)
                  }
                />

                <PreferenceToggle
                  id="compact_tables"
                  title="Compact tables"
                  description="Use denser rows across customers, inventory, invoices, and payments."
                  checked={form.compact_tables}
                  onCheckedChange={(checked) => updateForm("compact_tables", checked)}
                />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Security
            </CardTitle>
            <CardDescription>
              Password changes are live. Two-factor authentication is staged for the
              next auth-service contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="current_password">Current password</FieldLabel>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) =>
                      updatePasswordForm("current_password", e.target.value)
                    }
                    required
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="new_password">New password</FieldLabel>
                    <Input
                      id="new_password"
                      type="password"
                      minLength={8}
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        updatePasswordForm("new_password", e.target.value)
                      }
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm_password">Confirm password</FieldLabel>
                    <Input
                      id="confirm_password"
                      type="password"
                      minLength={8}
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        updatePasswordForm("confirm_password", e.target.value)
                      }
                      required
                    />
                  </Field>
                </div>
                <Button disabled={changingPassword}>
                  <KeyRound className="h-4 w-4" />
                  {changingPassword ? "Changing..." : "Change password"}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Laptop className="h-4 w-4" />
              Active sessions
            </CardTitle>
            <CardDescription>
              Session detail will later map to refresh-token device metadata.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Current browser</p>
                  <p className="text-sm text-muted-foreground">
                    Signed in with the active access token.
                  </p>
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Unknown-device sign-out and 2FA setup are intentionally not faked.
                They need backend support before becoming active controls.
              </p>
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

function PreferenceToggle({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: Readonly<{
  id: string
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}>) {
  return (
    <Field orientation="horizontal" className="items-center rounded-lg border bg-card p-4 text-card-foreground">
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <FieldContent>
        <FieldTitle>{title}</FieldTitle>
        <FieldDescription>{description}</FieldDescription>
      </FieldContent>
    </Field>
  )
}
