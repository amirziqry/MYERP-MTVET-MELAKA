import type { ComponentType } from 'react'
import { template as applicationApproved } from './application-approved'
import { template as applicationSubmitted } from './application-submitted'
import { template as projectOpened } from './project-opened'
import { template as proposalSubmitted } from './proposal-submitted'
import { template as proposalDecided } from './proposal-decided'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-approved': applicationApproved,
  'application-submitted': applicationSubmitted,
  'project-opened': projectOpened,
  'proposal-submitted': proposalSubmitted,
  'proposal-decided': proposalDecided,
}
