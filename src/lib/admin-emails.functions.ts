import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

export type UserEmailStatus = {
  userId: string
  email: string
  emailConfirmedAt: string | null
  lastEmailStatus: string | null
  lastEmailAt: string | null
  suppressed: boolean
  suppressionReason: string | null
  lastError: string | null
}

async function assertAdmin(context: any) {
  const { data: isAdmin, error } = await context.supabase.rpc('has_role', {
    _user_id: context.userId,
    _role: 'admin',
  })
  if (error) throw new Error(error.message)
  if (!isAdmin) throw new Error('Forbidden')
}

export const listUserEmailStatuses = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserEmailStatus[]> => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
    if (pErr) throw new Error(pErr.message)
    if (!profiles || profiles.length === 0) return []

    const emails = profiles
      .map((p: any) => (p.email ?? '').toLowerCase())
      .filter(Boolean)

    const { data: logs } = await supabaseAdmin
      .from('email_send_log')
      .select('recipient_email, status, error_message, created_at, template_name')
      .in('recipient_email', emails)
      .in('template_name', ['signup', 'magiclink', 'recovery', 'invite'])
      .order('created_at', { ascending: false })

    const latestByEmail = new Map<string, any>()
    for (const row of (logs as any[]) ?? []) {
      const k = (row.recipient_email ?? '').toLowerCase()
      if (!latestByEmail.has(k)) latestByEmail.set(k, row)
    }

    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('email, reason')
      .in('email', emails)
    const suppressedMap = new Map<string, string>()
    for (const s of (suppressed as any[]) ?? []) {
      suppressedMap.set((s.email ?? '').toLowerCase(), s.reason ?? 'suppressed')
    }

    const confirmedMap = new Map<string, string | null>()
    for (let page = 1; page <= 5; page++) {
      const { data: usersPage, error: uErr } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      })
      if (uErr) break
      const users = usersPage?.users ?? []
      for (const u of users) {
        if (u.email) {
          confirmedMap.set(u.email.toLowerCase(), (u as any).email_confirmed_at ?? null)
        }
      }
      if (users.length < 1000) break
    }

    return profiles.map((p: any): UserEmailStatus => {
      const key = (p.email ?? '').toLowerCase()
      const log = latestByEmail.get(key)
      const suppressionReason = suppressedMap.get(key) ?? null
      return {
        userId: p.id,
        email: p.email,
        emailConfirmedAt: confirmedMap.get(key) ?? null,
        lastEmailStatus: log?.status ?? null,
        lastEmailAt: log?.created_at ?? null,
        suppressed: !!suppressionReason,
        suppressionReason,
        lastError: log?.error_message ?? null,
      }
    })
  })

export const resendUserVerification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input?.userId || typeof input.userId !== 'string') {
      throw new Error('userId is required')
    }
    return input
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(data.userId)
    if (getErr) throw new Error(getErr.message)
    const target = userRes?.user
    if (!target?.email) throw new Error('User has no email address')
    if (target.email_confirmed_at) {
      throw new Error('This user is already verified')
    }

    // Trigger the platform-managed signup confirmation email
    // (delivered from the default Lovable auth sender).
    const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: target.email,
      password: crypto.randomUUID(),
    })
    if (linkErr) {
      // Fallback: use resend
      const { error: resendErr } = await supabaseAdmin.auth.resend({
        type: 'signup',
        email: target.email,
      })
      if (resendErr) throw new Error(resendErr.message)
    }

    return { ok: true, email: target.email }
  })
