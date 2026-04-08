import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string
  from: string
  replyTo: string
  subject: string
  html: string
  text: string
  unsubscribeUrl: string
}

export async function sendEmail(params: SendEmailParams) {
  const { to, from, replyTo, subject, html, text, unsubscribeUrl } = params

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject,
    html,
    text,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return { resendId: data?.id ?? null }
}
