import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  APP_URL,
  SITE_NAME,
  button,
  container,
  fmtMoney,
  footer,
  h1,
  header,
  headerSubtitle,
  headerTitle,
  inner,
  li,
  main,
  text,
} from './_styles'

interface Props {
  title?: string
  budget?: number | null
  timeline?: string | null
  description?: string | null
  link?: string
}

const Email = ({
  title = 'Projek Baru',
  budget = 0,
  timeline = '-',
  description = '-',
  link: linkUrl = APP_URL,
}: Props) => (
  <Html lang="ms" dir="ltr">
    <Head />
    <Preview>Projek baru dibuka: {title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>{SITE_NAME}</Heading>
          <Text style={headerSubtitle}>Notifikasi Tender Baru</Text>
        </Section>
        <Section style={inner}>
          <Heading style={h1}>Projek Baru Dibuka</Heading>
          <Text style={text}>Ke hadapan Rangkaian Trainer Majlis TVET Melaka,</Text>
          <Text style={text}>
            Sila ambil maklum bahawa satu program latihan baru telah diterbitkan secara rasmi di portal Majlis TVET Melaka dan kini sedia untuk menerima proposal permohonan.
          </Text>
          <Text style={{ ...text, fontWeight: 'bold' }}>Maklumat Ringkas Projek:</Text>
          <ul style={{ paddingLeft: '20px', margin: '0 0 16px' }}>
            <li style={li}><strong>Tajuk Projek:</strong> {title}</li>
            <li style={li}><strong>Peruntukan Siling Projek:</strong> {fmtMoney(budget)}</li>
            <li style={li}><strong>Garis Masa Cadangan:</strong> {timeline ?? '-'}</li>
            <li style={li}><strong>Skop Tugasan:</strong> {description ?? '-'}</li>
          </ul>
          <Text style={text}>
            Sekiranya program ini bersesuaian dengan bidang kepakaran anda, sila log masuk ke Workspace anda dengan kadar segera dan pilih butang "Submit Proposal" pada kad projek berkenaan.
          </Text>
          <Button style={button} href={linkUrl}>Lihat Projek &amp; Hantar Bidaan</Button>
          <Text style={text}>
            Bagi memastikan ketelusan dan keadilan proses penilaian, sila pastikan semua dokumentasi diserahkan sebelum tarikh tutup yang diumumkan di dalam sistem.
          </Text>
          <Text style={text}>Sekian, terima kasih.</Text>
          <Text style={footer}>{SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `[NOTIFIKASI TENDER] Pembukaan Projek Baru: "${data.title ?? 'Projek Baru'}"`,
  displayName: 'Project Opened',
  previewData: {
    title: 'Latihan Kemahiran Digital 2026',
    budget: 50000,
    timeline: '3 bulan',
    description: 'Latihan modul digital untuk pelatih TVET',
    link: `${APP_URL}/projects`,
  },
} satisfies TemplateEntry

export default Email