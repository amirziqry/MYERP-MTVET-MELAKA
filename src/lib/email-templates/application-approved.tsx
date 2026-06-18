import * as React from 'react'
import {
  Body,
  Button,
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
  button,
  container,
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
  loginUrl?: string
}

const Email = ({ fullName = 'Trainer', loginUrl = `${APP_URL}/workspace` }: Props) => (
  <Html lang="ms" dir="ltr">
    <Head />
    <Preview>Permohonan trainer anda telah DILULUSKAN</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={headerTitle}>{SITE_NAME}</Heading>
          <Text style={headerSubtitle}>Status Permohonan Trainer</Text>
        </Section>
        <Section style={inner}>
          <Heading style={h1}>Permohonan Diluluskan</Heading>
          <Text style={text}>Tuan/Puan {fullName},</Text>
          <Text style={text}>
            Merujuk kepada permohonan pendaftaran anda sebagai sebahagian daripada Rangkaian Trainer Majlis TVET Melaka, sukacita dimaklumkan bahawa permohonan tersebut telah disemak dan <strong>DILULUSKAN</strong> oleh pihak pengurusan.
          </Text>
          <Text style={text}>
            Akaun anda kini telah dinaik taraf kepada akses "Trainer". Anda boleh mula mengakses portal untuk menyemak kriteria program, menghantar cadangan projek (proposal), dan memantau status tawaran bidaan.
          </Text>
          <Text style={{ ...text, fontWeight: 'bold' }}>Tindakan Seterusnya:</Text>
          <ul style={{ paddingLeft: '20px', margin: '0 0 16px' }}>
            <li style={li}>
              Log masuk ke Dashboard anda: <Link href={loginUrl} style={link}>{loginUrl}</Link>
            </li>
            <li style={li}>Layari tab "Project Page" untuk melihat senarai projek aktif.</li>
            <li style={li}>Kemas kini parameter profil dan lencana kompetensi anda bagi memastikan kualiti bidaan anda memenuhi standard penilaian.</li>
          </ul>
          <Button style={button} href={loginUrl}>Buka Dashboard</Button>
          <Text style={text}>
            Kerjasama dan komitmen anda amat dihargai dalam menyokong agenda pemerkasaan TVET negeri Melaka.
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
  subject: '[RASMI] Status Permohonan Rangkaian Trainer Majlis TVET Melaka',
  displayName: 'Trainer Application Approved',
  previewData: { fullName: 'Ahmad bin Ali', loginUrl: `${APP_URL}/workspace` },
} satisfies TemplateEntry

export default Email