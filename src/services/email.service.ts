import nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Attachment[];
}

let transporter: Transporter | null = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const createTransporter = (): Transporter | null => {
  if (!env.SMTP_HOST) {
    logger.warn('SMTP_HOST not configured. Emails will be logged only.');
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async (
  mailOptions: SendMailOptions,
  attempt = 1
): Promise<{ messageId: string }> => {
  if (!transporter) {
    logger.info('[EMAIL MOCK] Would send email', {
      to: mailOptions.to,
      subject: mailOptions.subject,
    });
    return { messageId: `mock-${Date.now()}` };
  }

  try {
    const result = await transporter.sendMail(mailOptions);
    logger.info('Email sent', {
      messageId: result.messageId,
      to: mailOptions.to,
    });
    return { messageId: result.messageId };
  } catch (error) {
    const isLastAttempt = attempt >= MAX_RETRIES;

    logger.warn(`Email send failed (attempt ${attempt})`, {
      to: mailOptions.to,
      subject: mailOptions.subject,
      error: error instanceof Error ? error.message : error,
      willRetry: !isLastAttempt,
    });

    if (isLastAttempt) {
      logger.error('Email sending failed after max retries', {
        to: mailOptions.to,
        subject: mailOptions.subject,
      });
      throw ApiError.internal('Failed to send email');
    }

    await delay(RETRY_DELAY_MS * attempt);
    return sendWithRetry(mailOptions, attempt + 1);
  }
};

const validateEmailOptions = (options: SendEmailOptions): void => {
  const { to, subject, text, html } = options;

  const toList = Array.isArray(to) ? to : [to];
  if (toList.length === 0 || toList.some((t) => !t || typeof t !== 'string')) {
    throw ApiError.badRequest("Valid recipient 'to' is required");
  }

  if (!subject || subject.trim().length === 0) {
    throw ApiError.badRequest('Email subject is required');
  }

  if (!text?.trim() && !html?.trim()) {
    throw ApiError.badRequest('Email body (text or html) is required');
  }
};

export const emailService = {
  /**
   * Initialise or return the existing SMTP transporter.
   */
  init(): Transporter | null {
    if (!transporter) {
      transporter = createTransporter();
    }
    return transporter;
  },

  /**
   * Close the SMTP connection pool.
   */
  async close(): Promise<void> {
    if (transporter) {
      await transporter.close();
      transporter = null;
    }
  },

  /**
   * Send a single email with automatic retry and logging.
   */
  async send(options: SendEmailOptions): Promise<{ messageId: string }> {
    validateEmailOptions(options);
    this.init();

    const { to, subject, text, html, cc, bcc, replyTo, attachments } = options;

    const from = env.SMTP_FROM || env.SMTP_USER || 'no-reply@example.com';

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject,
      text,
      html,
      cc,
      bcc,
      replyTo,
      attachments,
    };

    return sendWithRetry(mailOptions);
  },

  /**
   * Send an email to multiple recipients individually (isolates addresses).
   */
  async sendBulk(
    recipients: string[],
    subject: string,
    body: { text?: string; html?: string },
    options?: Omit<SendEmailOptions, 'to' | 'subject' | 'text' | 'html'>
  ): Promise<{ messageId: string; to: string }[]> {
    const results: { messageId: string; to: string }[] = [];

    for (const recipient of recipients) {
      try {
        const result = await this.send({
          to: recipient,
          subject,
          text: body.text,
          html: body.html,
          ...options,
        });
        results.push({ messageId: result.messageId, to: recipient });
      } catch (error) {
        logger.error('Bulk email failed for recipient', { to: recipient, error });
      }
    }

    return results;
  },
};
