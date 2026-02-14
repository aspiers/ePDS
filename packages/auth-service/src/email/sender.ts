import * as nodemailer from 'nodemailer'
import { createLogger } from '@magic-pds/shared'
import type { Transporter } from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import type { EmailConfig } from '@magic-pds/shared'

const logger = createLogger('auth:email')

export class EmailSender {
  private transporter: Transporter<SMTPTransport.SentMessageInfo>

  constructor(private readonly config: EmailConfig) {
    this.transporter = this.createTransporter()
  }

  private createTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    switch (this.config.provider) {
      case 'smtp':
        return nodemailer.createTransport({
          host: this.config.smtpHost,
          port: this.config.smtpPort || 587,
          secure: (this.config.smtpPort || 587) === 465,
          auth: this.config.smtpUser
            ? { user: this.config.smtpUser, pass: this.config.smtpPass }
            : undefined,
        })

      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: this.config.smtpPass || process.env.SENDGRID_API_KEY || '',
          },
        })

      case 'ses':
        return nodemailer.createTransport({
          host: this.config.smtpHost || `email-smtp.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: this.config.smtpUser || process.env.AWS_SES_SMTP_USER || '',
            pass: this.config.smtpPass || process.env.AWS_SES_SMTP_PASS || '',
          },
        })

      case 'postmark':
        return nodemailer.createTransport({
          host: 'smtp.postmarkapp.com',
          port: 587,
          secure: false,
          auth: {
            user: this.config.smtpPass || process.env.POSTMARK_SERVER_TOKEN || '',
            pass: this.config.smtpPass || process.env.POSTMARK_SERVER_TOKEN || '',
          },
        })

      default:
        logger.warn('No email provider configured, using console logging')
        return nodemailer.createTransport({ jsonTransport: true })
    }
  }

  async sendOtpCode(opts: {
    to: string
    code: string
    clientAppName: string
    pdsName: string
    pdsDomain: string
    isNewUser?: boolean
  }): Promise<void> {
    const { to, code, clientAppName, pdsName, pdsDomain, isNewUser } = opts

    if (isNewUser) {
      await this.sendWelcomeCode({ to, code, pdsName, pdsDomain })
    } else {
      await this.sendSignInCode({ to, code, clientAppName, pdsName, pdsDomain })
    }
  }

  private async sendSignInCode(opts: {
    to: string
    code: string
    clientAppName: string
    pdsName: string
    pdsDomain: string
  }): Promise<void> {
    const { to, code, clientAppName, pdsName, pdsDomain } = opts

    const subject = `${code} is your sign-in code for ${pdsName}`

    const text = [
      `Your sign-in code for ${clientAppName}:`,
      '',
      code,
      '',
      `This code expires in 10 minutes.`,
      '',
      `If you didn't request this, you can safely ignore this email.`,
      '',
      `--`,
      `${pdsName} (${pdsDomain})`,
    ].join('\n')

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <p>Your sign-in code for <strong>${this.escapeHtml(clientAppName)}</strong>:</p>
  <p style="margin: 30px 0; text-align: center;">
    <span style="font-size: 36px; font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; letter-spacing: 8px; background: #f5f5f5; padding: 16px 24px; border-radius: 8px; display: inline-block; font-weight: 600; color: #0f1828;">
      ${this.escapeHtml(code)}
    </span>
  </p>
  <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
  <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">${this.escapeHtml(pdsName)} (${this.escapeHtml(pdsDomain)})</p>
</body>
</html>`

    await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.from}>`,
      to,
      subject,
      text,
      html,
    })
  }

  private async sendWelcomeCode(opts: {
    to: string
    code: string
    pdsName: string
    pdsDomain: string
  }): Promise<void> {
    const { to, code, pdsName, pdsDomain } = opts

    const subject = `${code} — Welcome to ${pdsName}`

    const text = [
      `Welcome to ${pdsName}!`,
      '',
      `Your verification code:`,
      '',
      code,
      '',
      `Enter this code to confirm your email and create your account.`,
      '',
      `This code expires in 10 minutes.`,
      '',
      `If you didn't sign up, you can safely ignore this email.`,
      '',
      `--`,
      `${pdsName} (${pdsDomain})`,
    ].join('\n')

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <h2 style="color: #0f1828; margin-bottom: 8px;">Welcome to ${this.escapeHtml(pdsName)}</h2>
  <p>Enter this code to confirm your email and create your account:</p>
  <p style="margin: 30px 0; text-align: center;">
    <span style="font-size: 36px; font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; letter-spacing: 8px; background: #f5f5f5; padding: 16px 24px; border-radius: 8px; display: inline-block; font-weight: 600; color: #0f1828;">
      ${this.escapeHtml(code)}
    </span>
  </p>
  <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
  <p style="color: #666; font-size: 14px;">If you didn't sign up, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #999; font-size: 12px;">${this.escapeHtml(pdsName)} (${this.escapeHtml(pdsDomain)})</p>
</body>
</html>`

    await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.from}>`,
      to,
      subject,
      text,
      html,
    })
  }

  async sendBackupEmailVerification(opts: {
    to: string
    verifyUrl: string
    pdsName: string
    pdsDomain: string
  }): Promise<void> {
    const { to, verifyUrl, pdsName, pdsDomain } = opts

    await this.transporter.sendMail({
      from: `"${this.config.fromName}" <${this.config.from}>`,
      to,
      subject: `Verify your backup email - ${pdsName}`,
      text: `Verify your backup email by clicking this link:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n--\n${pdsName} (${pdsDomain})`,
      html: `
<p>Verify your backup email by clicking the link below:</p>
<p style="margin: 20px 0;"><a href="${this.escapeHtml(verifyUrl)}" style="background-color: #0f1828; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Verify Email</a></p>
<p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
<hr style="border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">${this.escapeHtml(pdsName)} (${this.escapeHtml(pdsDomain)})</p>`,
    })
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
