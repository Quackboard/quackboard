/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Quackboard verification code</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Img src="https://quackboard1.lovable.app/favicon.png" width="40" height="40" alt="Quackboard" style={{ margin: '0 auto 8px', display: 'block' }} />
          <Text style={headerText}>Quackboard</Text>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Verification code 🔐</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={smallText}>
            This code will expire shortly. If you didn't request this, you can safely ignore this email.
          </Text>
        </Section>
        <Section style={brandFooter}>
          <Text style={brandFooterText}>Sent by Quackboard · Open mic management for comedy producers</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f2f5f7', fontFamily: "'Outfit', Arial, sans-serif", padding: '40px 0' }
const card = { backgroundColor: '#ffffff', borderRadius: '12px', maxWidth: '600px', margin: '0 auto', overflow: 'hidden' as const }
const header = { background: 'linear-gradient(135deg, #34a08c, #298070)', padding: '28px 24px 20px', textAlign: 'center' as const }
const headerText = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' as const, margin: '0', fontFamily: "'Outfit', Arial, sans-serif" }
const content = { padding: '32px 28px 20px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a3a34', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#5a6b70', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#1a3a34', margin: '0 0 30px', letterSpacing: '4px' }
const smallText = { fontSize: '13px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
const brandFooter = { borderTop: '1px solid #e8ecee', padding: '16px 28px', textAlign: 'center' as const }
const brandFooterText = { fontSize: '12px', color: '#b0b8bc', margin: '0' }
