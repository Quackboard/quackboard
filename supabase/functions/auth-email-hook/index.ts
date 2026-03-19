import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// Configuration
const SITE_NAME = 'Quackboard'
const SUPABASE_PROJECT_ID = 'dkbahxjibpobbefqufqa'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Welcome to Quackboard — confirm your email',
  invite: "You're invited to Quackboard",
  magiclink: 'Your Quackboard login link',
  recovery: 'Reset your Quackboard password',
  email_change: 'Confirm your new email for Quackboard',
  reauthentication: 'Your Quackboard verification code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

// Sample data for preview mode
const SAMPLE_PROJECT_URL = 'https://quackboard1.lovable.app'
const SAMPLE_EMAIL = 'user@example.test'
const SAMPLE_DATA: Record<string, object> = {
  signup: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    recipient: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  magiclink: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  recovery: {
    siteName: SITE_NAME,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  invite: {
    siteName: SITE_NAME,
    siteUrl: SAMPLE_PROJECT_URL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  email_change: {
    siteName: SITE_NAME,
    email: SAMPLE_EMAIL,
    newEmail: SAMPLE_EMAIL,
    confirmationUrl: SAMPLE_PROJECT_URL,
  },
  reauthentication: {
    token: '123456',
  },
}

/**
 * Build the confirmation URL that Supabase Auth expects users to click.
 * This URL hits Supabase's /auth/v1/verify endpoint which validates the
 * token_hash and then redirects the user to redirect_to.
 */
function buildConfirmationUrl(emailData: any): string {
  const siteUrl = emailData.site_url || `https://${SUPABASE_PROJECT_ID}.supabase.co`
  const redirectTo = emailData.redirect_to || siteUrl
  const tokenHash = emailData.token_hash
  const type = emailData.email_action_type

  // For Supabase-hosted auth, the verify endpoint is on the Supabase project URL
  const verifyBase = `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1/verify`
  const params = new URLSearchParams({
    token: tokenHash,
    type,
    redirect_to: redirectTo,
  })

  return `${verifyBase}?${params.toString()}`
}

/**
 * Send an email via Zeptomail API
 */
async function sendViaZeptomail(params: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const apiToken = Deno.env.get('ZEPTOMAIL_API_TOKEN')
  const fromEmail = Deno.env.get('ZEPTOMAIL_FROM_EMAIL') || 'noreply@quackboard.com'
  const fromName = Deno.env.get('ZEPTOMAIL_FROM_NAME') || SITE_NAME

  if (!apiToken) {
    throw new Error('ZEPTOMAIL_API_TOKEN not configured')
  }

  const response = await fetch('https://api.zeptomail.com/v1.1/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': apiToken,
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: fromName },
      to: [{ email_address: { address: params.to } }],
      subject: params.subject,
      htmlbody: params.html,
      textbody: params.text,
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Zeptomail API error:', response.status, errorBody)
    throw new Error(`Zeptomail API error: ${response.status} ${errorBody}`)
  }

  console.log('Email sent successfully via Zeptomail to', params.to)
}

// Preview endpoint handler
async function handlePreview(req: Request): Promise<Response> {
  const previewCorsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: previewCorsHeaders })
  }

  const apiKey = Deno.env.get('LOVABLE_API_KEY')
  const authHeader = req.headers.get('Authorization')

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let type: string
  try {
    const body = await req.json()
    type = body.type
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const EmailTemplate = EMAIL_TEMPLATES[type]
  if (!EmailTemplate) {
    return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
      status: 400,
      headers: { ...previewCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sampleData = SAMPLE_DATA[type] || {}
  const html = await renderAsync(React.createElement(EmailTemplate, sampleData))

  return new Response(html, {
    status: 200,
    headers: { ...previewCorsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/**
 * Supabase Auth Send Email Hook handler.
 *
 * Supabase sends a POST with payload:
 * {
 *   "user": { "id": "...", "email": "...", ... },
 *   "email_data": {
 *     "token": "otp-code",
 *     "token_hash": "hashed-token",
 *     "redirect_to": "https://...",
 *     "email_action_type": "signup" | "magiclink" | "recovery" | ...,
 *     "site_url": "https://...",
 *     "token_new": "",
 *     "token_hash_new": ""
 *   }
 * }
 *
 * The hook must send the email and return an empty JSON object on success.
 */
async function handleWebhook(req: Request): Promise<Response> {
  // Supabase Auth Hooks use Standard Webhooks (https://www.standardwebhooks.com/)
  // The hook secret is in format "v1,whsec_<base64-secret>"
  // Signature verification uses HMAC-SHA256
  const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')

  if (!hookSecret) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured')
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Read the raw body for signature verification
  const rawBody = await req.text()

  // Verify Standard Webhook signature
  const webhookId = req.headers.get('webhook-id')
  const webhookTimestamp = req.headers.get('webhook-timestamp')
  const webhookSignature = req.headers.get('webhook-signature')

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error('Missing webhook headers', { webhookId: !!webhookId, webhookTimestamp: !!webhookTimestamp, webhookSignature: !!webhookSignature })
    return new Response(
      JSON.stringify({ error: 'Missing webhook signature headers' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check timestamp is not too old (5 minutes tolerance)
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(webhookTimestamp, 10)
  if (isNaN(ts) || Math.abs(now - ts) > 300) {
    console.error('Webhook timestamp too old or invalid', { webhookTimestamp, now })
    return new Response(
      JSON.stringify({ error: 'Invalid webhook timestamp' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Extract the base64 secret from "v1,whsec_<base64>" format
  const secretParts = hookSecret.split(',')
  const rawSecret = secretParts.length > 1
    ? secretParts[1].replace('whsec_', '')
    : hookSecret.replace('whsec_', '')

  // Decode the base64 secret
  const secretBytes = Uint8Array.from(atob(rawSecret), c => c.charCodeAt(0))

  // Build the signed content: "{webhook-id}.{webhook-timestamp}.{body}"
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`
  const encoder = new TextEncoder()

  // Compute HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent))
  const computedSignature = 'v1,' + btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

  // Compare against provided signatures (there can be multiple, space-separated)
  const providedSignatures = webhookSignature.split(' ')
  const isValid = providedSignatures.some(sig => sig === computedSignature)

  if (!isValid) {
    console.error('Invalid webhook signature')
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const emailData = payload.email_data
  const user = payload.user

  if (!emailData || !user) {
    console.error('Invalid payload: missing email_data or user', payload)
    return new Response(
      JSON.stringify({ error: 'Invalid payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const emailType = emailData.email_action_type
  const recipientEmail = user.email

  console.log('Received auth email hook', { emailType, email: recipientEmail })

  const EmailTemplate = EMAIL_TEMPLATES[emailType]
  if (!EmailTemplate) {
    console.error('Unknown email type', { emailType })
    return new Response(
      JSON.stringify({ error: `Unknown email type: ${emailType}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build confirmation URL from token_hash
  const confirmationUrl = buildConfirmationUrl(emailData)

  const templateProps = {
    siteName: SITE_NAME,
    siteUrl: emailData.site_url || 'https://quackboard.com',
    recipient: recipientEmail,
    confirmationUrl,
    token: emailData.token,
    email: recipientEmail,
    newEmail: user.new_email || user.email_change_confirm_to,
  }

  // Render email
  const html = await renderAsync(React.createElement(EmailTemplate, templateProps))
  const text = await renderAsync(React.createElement(EmailTemplate, templateProps), {
    plainText: true,
  })

  // Send via Zeptomail
  try {
    await sendViaZeptomail({
      to: recipientEmail,
      subject: EMAIL_SUBJECTS[emailType] || 'Notification',
      html,
      text,
    })
  } catch (error) {
    console.error('Failed to send email', { error, emailType, email: recipientEmail })
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  console.log('Auth email sent successfully', { emailType, email: recipientEmail })

  // Supabase expects an empty JSON object on success
  return new Response(
    JSON.stringify({}),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Route to preview handler for /preview path
  if (url.pathname.endsWith('/preview')) {
    return handlePreview(req)
  }

  // Main webhook handler
  try {
    return await handleWebhook(req)
  } catch (error) {
    console.error('Webhook handler error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
