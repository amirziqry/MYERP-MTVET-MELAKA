import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  APP_URL,
  SITE_NAME,
  container,
  fmtMoney,
  footer,
  h1,
  header,
  headerSubtitle,
  headerTitle,
  inner,
  li,
  link,
  main,
  text,
} from './_styles'

interface Props {
  fullName?: string
  proposalNumber?: string
  projectTitle?: string
  bidAmount?: number | null
  pitch?: string
}

const Email = ({
  fullName = 'Trainer',
  proposalNumber = '-',
  projectTitle = '-',
  bidAmount = 0,
  pitch = '',
}: Props) => (
  <Html lang="ms" dir="ltr">
    <Head />
    <Preview>Resit penerimaan proposal: {proposalNumber}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>{SITE_NAME}</Heading>
          <Text style={headerSubtitle}>Pengesahan Penerimaan Proposal</Text>
        </Section>
        <Section style={inner}>
          <Heading style={h1}>Proposal Diterima</Heading>
          <Text style={text}>Tuan/Puan {fullName},</Text>
          <Text style={text}>
            Sistem pengurusan Majlis TVET Melaka mengesahkan bahawa dokumen proposal permohonan projek anda telah selamat diterima dan direkodkan ke dalam pangkalan data.
          </Text>
          <Text style={{ ...text, fontWeight: 'bold' }}>Resit Rasmi Penerimaan:</Text>
          <ul style={{ paddingLeft: '20px', margin: '0 0 16px' }}>
            <li style={li}><strong>Nombor Unik Proposal:</strong> {proposalNumber}</li>
            <li style={li}><strong>Projek Sasaran:</strong> {projectTitle}</li>
            <li style={li}><strong>Nilai Bidaan:</strong> {fmtMoney(bidAmount)}</li>
            <li style={li}><strong>Status Dokumen:</strong> Berjaya Dimuat Naik</li>
            {pitch && (
              <li style={li}><strong>Ringkasan Pitch:</strong> "{pitch}"</li>
            )}
          </ul>
          <Text style={text}>
            Status permohonan anda kini diklasifikasikan sebagai "Submitted". Pihak jawatankuasa penilaian akan menyemak dokumentasi anda secara kolektif bersama bidaan-bidaan lain. Anda boleh memantau proses penilaian ini melalui kemas kini berkala pada Trainer Dashboard:
            {' '}<Link href={`${APP_URL}/workspace`} style={link}>{APP_URL}/workspace</Link>.
          </Text>
          <Text style={text}>Terima kasih atas penyertaan kompetitif anda dalam tender ini.</Text>
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
    `[PENGESAHAN] Penerimaan Proposal Bagi Kod Rujukan: ${data.proposalNumber ?? '-'}`,
  displayName: 'Proposal Submitted',
  previewData: {
    fullName: 'Ahmad bin Ali',
    proposalNumber: 'MTVET-2026-0001',
    projectTitle: 'Latihan Kemahiran Digital 2026',
    bidAmount: 25000,
    pitch: 'Cadangan pelaksanaan latihan 12 minggu.',
  },
} satisfies TemplateEntry

export default Email