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
  main,
  text,
} from './_styles'

interface Props {
  trainerName?: string
  institution?: string
  adminLink?: string
}

const Email = ({
  trainerName = 'Trainer',
  institution = '-',
  adminLink = `${APP_URL}/admin`,
}: Props) => (
  <Html lang="ms" dir="ltr">
    <Head />
    <Preview>Permohonan pelatih baharu untuk semakan</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>{SITE_NAME}</Heading>
          <Text style={headerSubtitle}>Notifikasi Admin</Text>
        </Section>
        <Section style={inner}>
          <Heading style={h1}>Permohonan Pelatih Baharu</Heading>
          <Text style={text}>
            Satu permohonan pelatih baharu telah diterima dan menunggu semakan anda.
          </Text>
          <Text style={text}>
            <strong>Nama Pelatih:</strong> {trainerName}
            <br />
            <strong>Institusi:</strong> {institution}
          </Text>
          <Text style={text}>
            Sila log masuk ke dashboard admin untuk meluluskan atau menolak permohonan ini.
          </Text>
          <Button style={button} href={adminLink}>Buka Dashboard Admin</Button>
          <Text style={footer}>{SITE_NAME}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `New Trainer Application ${d.trainerName ?? 'Trainer'} | ${d.institution ?? '-'}`,
  displayName: 'Trainer Application Submitted (Admin)',
  previewData: {
    trainerName: 'Ahmad bin Ali',
    institution: 'Politeknik Melaka',
    adminLink: `${APP_URL}/admin`,
  },
} satisfies TemplateEntry

export default Email