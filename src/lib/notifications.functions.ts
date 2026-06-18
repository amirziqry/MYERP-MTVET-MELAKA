import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

type NotifyEvent =
  | { event: 'application_approved'; applicationId: string }
  | { event: 'application_submitted'; applicationId: string }
  | { event: 'project_opened'; projectId: string }
  | { event: 'proposal_submitted'; proposalId: string }
  | { event: 'proposal_decided'; proposalId: string; decision: 'accepted' | 'rejected' }

async function postEmail(opts: {
  origin: string
  bearer: string
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData: Record<string, any>
}) {
  try {
    const res = await fetch(`${opts.origin}/lovable/email/transactional/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.bearer}`,
      },
      body: JSON.stringify({
        templateName: opts.templateName,
        recipientEmail: opts.recipientEmail,
        idempotencyKey: opts.idempotencyKey,
        templateData: opts.templateData,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('email send failed', {
        status: res.status,
        body: text.slice(0, 200),
        template: opts.templateName,
      })
    }
  } catch (e) {
    console.error('email send threw', { error: String(e), template: opts.templateName })
  }
}

export const notifyAppEvent = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: NotifyEvent) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const req = getRequest()
    const origin = new URL(req.url).origin
    const bearer = req.headers.get('authorization')?.slice('Bearer '.length).trim() ?? ''
    if (!bearer) return { ok: false, error: 'missing auth' }

    const APP_URL = 'https://myerptvetmelakatrainer.lovable.app'

    switch (data.event) {
      case 'application_approved': {
        const { data: app } = await supabaseAdmin
          .from('trainer_applications')
          .select('id, user_id, profiles:user_id(email, full_name)')
          .eq('id', data.applicationId)
          .maybeSingle()
        const recipient = (app as any)?.profiles?.email
        if (!recipient) return { ok: false, error: 'no recipient' }
        await postEmail({
          origin,
          bearer,
          templateName: 'application-approved',
          recipientEmail: recipient,
          idempotencyKey: `application-approved-${data.applicationId}`,
          templateData: {
            fullName: (app as any).profiles?.full_name ?? 'Trainer',
            loginUrl: `${APP_URL}/workspace`,
          },
        })
        return { ok: true }
      }

      case 'application_submitted': {
        const { data: app } = await supabaseAdmin
          .from('trainer_applications')
          .select('id, institution_name, user_id, profiles:user_id(full_name)')
          .eq('id', data.applicationId)
          .maybeSingle()
        if (!app) return { ok: false, error: 'application not found' }
        const trainerName = (app as any).profiles?.full_name ?? 'Trainer'
        const institution = (app as any).institution_name ?? '-'

        const { data: admins, error: adminErr } = await supabaseAdmin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
        if (adminErr) {
          console.error('admin lookup failed', adminErr)
          return { ok: false, error: 'admin lookup failed' }
        }
        const adminIds = (admins ?? []).map((r: any) => r.user_id).filter(Boolean)
        if (adminIds.length === 0) return { ok: true, sent: 0 }
        const { data: profs, error: profErr } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .in('id', adminIds)
        if (profErr) {
          console.error('admin profile lookup failed', profErr)
          return { ok: false, error: 'admin profile lookup failed' }
        }
        let sent = 0
        await Promise.all(
          (profs ?? []).map((row: any) => {
            const email = row.email
            if (!email) return Promise.resolve()
            sent += 1
            return postEmail({
              origin,
              bearer,
              templateName: 'application-submitted',
              recipientEmail: email,
              idempotencyKey: `application-submitted-${data.applicationId}-${row.id}`,
              templateData: {
                trainerName,
                institution,
                adminLink: `${APP_URL}/admin`,
              },
            })
          }),
        )
        return { ok: true, sent }
      }

      case 'project_opened': {
        const { data: project } = await supabaseAdmin
          .from('projects')
          .select('id, title, budget, description, closing_date')
          .eq('id', data.projectId)
          .maybeSingle()
        if (!project) return { ok: false, error: 'project not found' }

        const pageSize = 500
        let from = 0
        let total = 0
        while (true) {
          const { data: trainers, error } = await supabaseAdmin
            .from('user_roles')
            .select('user_id, profiles!inner(email)')
            .eq('role', 'trainer')
            .range(from, from + pageSize - 1)
          if (error) {
            console.error('trainer fan-out failed', error)
            break
          }
          if (!trainers || trainers.length === 0) break

          await Promise.all(
            trainers.map((row: any) => {
              const email = row.profiles?.email
              if (!email) return Promise.resolve()
              total += 1
              return postEmail({
                origin,
                bearer,
                templateName: 'project-opened',
                recipientEmail: email,
                idempotencyKey: `project-opened-${data.projectId}-${row.user_id}`,
                templateData: {
                  title: (project as any).title,
                  budget: (project as any).budget,
                  timeline: (project as any).closing_date
                    ? `Tutup pada ${new Date((project as any).closing_date).toLocaleDateString('en-MY')}`
                    : '-',
                  description: (project as any).description ?? '-',
                  link: `${APP_URL}/projects?id=${data.projectId}`,
                },
              })
            }),
          )

          if (trainers.length < pageSize) break
          from += pageSize
        }
        return { ok: true, sent: total }
      }

      case 'proposal_submitted': {
        const { data: proposal } = await supabaseAdmin
          .from('proposals')
          .select('id, proposal_number, bid_amount, pitch, trainer_id, project_id, projects:project_id(title), profiles:trainer_id(email, full_name)')
          .eq('id', data.proposalId)
          .maybeSingle()
        const recipient = (proposal as any)?.profiles?.email
        if (!recipient) return { ok: false, error: 'no recipient' }
        await postEmail({
          origin,
          bearer,
          templateName: 'proposal-submitted',
          recipientEmail: recipient,
          idempotencyKey: `proposal-submitted-${data.proposalId}`,
          templateData: {
            fullName: (proposal as any).profiles?.full_name ?? 'Trainer',
            proposalNumber: (proposal as any).proposal_number ?? '-',
            projectTitle: (proposal as any).projects?.title ?? '-',
            bidAmount: (proposal as any).bid_amount,
            pitch: (proposal as any).pitch ?? '',
          },
        })
        return { ok: true }
      }

      case 'proposal_decided': {
        const { data: proposal } = await supabaseAdmin
          .from('proposals')
          .select('id, proposal_number, trainer_id, project_id, projects:project_id(title), profiles:trainer_id(email, full_name)')
          .eq('id', data.proposalId)
          .maybeSingle()
        const recipient = (proposal as any)?.profiles?.email
        if (!recipient) return { ok: false, error: 'no recipient' }
        await postEmail({
          origin,
          bearer,
          templateName: 'proposal-decided',
          recipientEmail: recipient,
          idempotencyKey: `proposal-decided-${data.proposalId}-${data.decision}`,
          templateData: {
            decision: data.decision,
            fullName: (proposal as any).profiles?.full_name ?? 'Trainer',
            proposalNumber: (proposal as any).proposal_number ?? '-',
            projectTitle: (proposal as any).projects?.title ?? '-',
          },
        })
        return { ok: true }
      }
    }
  })