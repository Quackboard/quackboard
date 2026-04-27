/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName = 'Quackboard',
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Hey! Here's your magic link 🪄</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={logoSection}>
          <Img
            src="https://quackboard.com/logo-full-clean.png"
            width="200"
            alt="Quackboard"
            style={logoImg}
          />
        </Section>
        <Section style={divider} />
        <Section style={content}>
          <Heading style={h1}>Hey! Here's your magic link 🪄</Heading>
          <Text style={text}>
            Click the button below to log in to Quackboard. This link will expire shortly.
          </Text>
          <Button style={button} href={confirmationUrl}>
            Log In to Quackboard
          </Button>
          <Text style={smallText}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={brandFooter}>
          <Text style={brandFooterText}>Sent by Quackboard · Open mic management for comedy producers</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#f2f5f7', fontFamily: "'Outfit', Arial, sans-serif", padding: '40px 0' }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '600px', margin: '0 auto', overflow: 'hidden' as const }
const logoSection = { backgroundColor: '#ffffff', padding: '32px 24px 24px', textAlign: 'center' as const }
const logoImg = { margin: '0 auto', display: 'block', height: 'auto' as const, maxWidth: '200px' }
const divider = { backgroundColor: '#34a08c', height: '4px', lineHeight: '4px', fontSize: '0' }
const content = { padding: '32px 28px 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a3a34', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#5a6b70', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#34a08c', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', padding: '12px 28px', textDecoration: 'none', display: 'inline-block' }
const smallText = { fontSize: '13px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
const brandFooter = { borderTop: '1px solid #e8ecee', padding: '16px 28px', textAlign: 'center' as const }
const brandFooterText = { fontSize: '12px', color: '#b0b8bc', margin: '0' }
