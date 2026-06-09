"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
let transporter = null;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const createTransporter = () => {
    if (!env_1.env.SMTP_HOST) {
        logger_1.logger.warn("SMTP_HOST not configured. Emails will be logged only.");
        return null;
    }
    return nodemailer_1.default.createTransport({
        host: env_1.env.SMTP_HOST,
        port: env_1.env.SMTP_PORT,
        secure: env_1.env.SMTP_SECURE,
        auth: {
            user: env_1.env.SMTP_USER,
            pass: env_1.env.SMTP_PASS
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100
    });
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sendWithRetry = async (mailOptions, attempt = 1) => {
    if (!transporter) {
        logger_1.logger.info("[EMAIL MOCK] Would send email", {
            to: mailOptions.to,
            subject: mailOptions.subject
        });
        return { messageId: `mock-${Date.now()}` };
    }
    try {
        const result = await transporter.sendMail(mailOptions);
        logger_1.logger.info("Email sent", {
            messageId: result.messageId,
            to: mailOptions.to
        });
        return { messageId: result.messageId };
    }
    catch (error) {
        const isLastAttempt = attempt >= MAX_RETRIES;
        logger_1.logger.warn(`Email send failed (attempt ${attempt})`, {
            to: mailOptions.to,
            subject: mailOptions.subject,
            error: error instanceof Error ? error.message : error,
            willRetry: !isLastAttempt
        });
        if (isLastAttempt) {
            logger_1.logger.error("Email sending failed after max retries", {
                to: mailOptions.to,
                subject: mailOptions.subject
            });
            throw ApiError_1.ApiError.internal("Failed to send email");
        }
        await delay(RETRY_DELAY_MS * attempt);
        return sendWithRetry(mailOptions, attempt + 1);
    }
};
const validateEmailOptions = (options) => {
    const { to, subject, text, html } = options;
    const toList = Array.isArray(to) ? to : [to];
    if (toList.length === 0 || toList.some((t) => !t || typeof t !== "string")) {
        throw ApiError_1.ApiError.badRequest("Valid recipient 'to' is required");
    }
    if (!subject || subject.trim().length === 0) {
        throw ApiError_1.ApiError.badRequest("Email subject is required");
    }
    if (!text?.trim() && !html?.trim()) {
        throw ApiError_1.ApiError.badRequest("Email body (text or html) is required");
    }
};
exports.emailService = {
    /**
     * Initialise or return the existing SMTP transporter.
     */
    init() {
        if (!transporter) {
            transporter = createTransporter();
        }
        return transporter;
    },
    /**
     * Close the SMTP connection pool.
     */
    async close() {
        if (transporter) {
            await transporter.close();
            transporter = null;
        }
    },
    /**
     * Send a single email with automatic retry and logging.
     */
    async send(options) {
        validateEmailOptions(options);
        this.init();
        const { to, subject, text, html, cc, bcc, replyTo, attachments } = options;
        const from = env_1.env.SMTP_FROM || env_1.env.SMTP_USER || "no-reply@example.com";
        const mailOptions = {
            from,
            to,
            subject,
            text,
            html,
            cc,
            bcc,
            replyTo,
            attachments
        };
        return sendWithRetry(mailOptions);
    },
    /**
     * Send an email to multiple recipients individually (isolates addresses).
     */
    async sendBulk(recipients, subject, body, options) {
        const results = [];
        for (const recipient of recipients) {
            try {
                const result = await this.send({
                    to: recipient,
                    subject,
                    text: body.text,
                    html: body.html,
                    ...options
                });
                results.push({ messageId: result.messageId, to: recipient });
            }
            catch (error) {
                logger_1.logger.error("Bulk email failed for recipient", { to: recipient, error });
            }
        }
        return results;
    }
};
