import nodemailer from 'nodemailer'

let transporter = null

function getTransporter() {
  if (transporter) return transporter

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('⚠️  SMTP credentials not configured — email delivery is disabled.')
    return null
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: parseInt(SMTP_PORT || '587') === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  return transporter
}

/**
 * Send an email.
 * @param {object} opts  { to, subject, html }
 */
export async function sendEmail({ to, subject, html }) {
  const t = getTransporter()
  if (!t) {
    console.log(`[Email] Would have sent to ${to}: ${subject}`)
    return { skipped: true }
  }

  try {
    const info = await t.sendMail({
      from: process.env.SMTP_FROM || 'RupeeWise <noreply@RupeeWise.app>',
      to,
      subject,
      html,
    })
    console.log(`[Email] Sent to ${to}: ${info.messageId}`)
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err.message)
    return { sent: false, error: err.message }
  }
}
