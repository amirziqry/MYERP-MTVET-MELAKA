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
  decision?: 'accepted' | 'rejected'
  fullName?: string
  proposalNumber?: string
  projectTitle?: string
}

const Email = ({
  decision = 'accepted',
  fullName = 'Trainer',
  proposalNumber = '-',
  projectTitle = '-',
}: Props) => {
  if (decision === 'accepted') {
    return (
      <Html lang="ms" dir="ltr">
        <Head />
        <Preview>Tahniah! Proposal {proposalNumber} diluluskan</Preview>
        <Body style={main}>
          <Container style={container}>
            <Section style={header}>
              <Heading style={headerTitle}>{SITE_NAME}</Heading>
              <Text style={headerSubtitle}>Keputusan Tender</Text>
            </Section>
            <Section style={inner}>
              <Heading style={h1}>Tahniah — Proposal Diluluskan</Heading>
              <Text style={text}>Tuan/Puan {fullName},</Text>
              <Text style={text}>
                Dimaklumkan bahawa Jawatankuasa Penilaian Majlis TVET Melaka telah memutuskan untuk <strong>MENERIMA</strong> proposal anda ({proposalNumber}) dan menganugerahkan kontrak pelaksanaan latihan ini kepada pihak anda.
              </Text>
              <Text style={text}>
                Status projek ini telah dikemas kini kepada "Awarded" di dalam platform Workspace anda.
              </Text>
              <Text style={{ ...text, fontWeight: 'bold' }}>Tindakan Seterusnya:</Text>
              <ul style={{ paddingLeft: '20px', margin: '0 0 16px' }}>
                <li style={li}>Log masuk ke Dashboard dan semak segmen "Granted".</li>
                <li style={li}>Teliti garis masa pelaksanaan, milestones, dan syarat-syarat persediaan.</li>
                <li style={li}>Selepas fasa latihan selesai, kemukakan laporan serahan akhir untuk mengaktifkan proses tuntutan bayaran.</li>
              </ul>
              <Button style={button} href={`${APP_URL}/workspace`}>Buka Workspace</Button>
              <Text style={text}>Selamat menjalankan tugas.</Text>
              <Text style={footer}>{SITE_NAME}</Text>
            </Section>
          </Container>
        </Body>
      </Html>
    )
  }

  return (
    <Html lang="ms" dir="ltr">
      <Head />
      <Preview>Keputusan proposal {proposalNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>{SITE_NAME}</Heading>
            <Text style={headerSubtitle}>Keputusan Tender</Text>
          </Section>
          <Section style={inner}>
            <Heading style={h1}>Keputusan Permohonan Proposal</Heading>
            <Text style={text}>Tuan/Puan {fullName},</Text>
            <Text style={text}>
              E-mel ini bertujuan untuk memaklumkan status mutakhir bagi proposal yang telah anda kemukakan bagi program: "{projectTitle}" (Nombor Rujukan: {proposalNumber}).
            </Text>
            <Text style={text}>
              Terima kasih atas penyertaan anda dalam kitaran pemilihan tender terbuka. Setelah penilaian teliti dibuat, pihak panel telah memilih proposal lain yang didapati lebih menepati keseluruhan kriteria struktur dan operasional khusus bagi kohort kali ini.
            </Text>
            <Text style={text}>
              Walau bagaimanapun, permohonan anda dinilai kompetitif dan rekod metrik proposal akan disimpan di bawah arkib "Rejected" untuk rujukan masa hadapan anda.
            </Text>
            <Text style={text}>
              Pihak Majlis TVET Melaka mengalu-alukan anda untuk memohon peluang-peluang projek baru yang akan diterbitkan kelak di portal mengikut kesesuaian profil kompetensi anda.
            </Text>
            <Text style={text}>Kerjasama dan minat anda amat dihargai.</Text>
            <Text style={footer}>{SITE_NAME}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data.decision === 'accepted'
      ? `[KEPUTUSAN TENDER] Tahniah! Proposal ${data.proposalNumber ?? ''} Telah Diluluskan`
      : `[KEPUTUSAN TENDER] Keputusan Permohonan Proposal ${data.proposalNumber ?? ''}${data.projectTitle ? ` untuk ${data.projectTitle}` : ''}`,
  displayName: 'Proposal Decision',
  previewData: {
    decision: 'accepted',
    fullName: 'Ahmad bin Ali',
    proposalNumber: 'MTVET-2026-0001',
    projectTitle: 'Latihan Kemahiran Digital 2026',
  },
} satisfies TemplateEntry

export default Email