"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobOrchestrator = void 0;
const logger_1 = require("../config/logger");
const email_job_1 = require("./email.job");
const notification_job_1 = require("./notification.job");
const reminder_job_1 = require("./reminder.job");
__exportStar(require("./email.job"), exports);
__exportStar(require("./notification.job"), exports);
__exportStar(require("./reminder.job"), exports);
const jobs = [
    { name: 'email', start: () => email_job_1.emailJob.start(), stop: () => email_job_1.emailJob.stop() },
    {
        name: 'notification',
        start: () => notification_job_1.notificationJob.start(),
        stop: () => notification_job_1.notificationJob.stop(),
    },
    { name: 'reminder', start: () => reminder_job_1.reminderJob.start(), stop: () => reminder_job_1.reminderJob.stop() },
];
exports.jobOrchestrator = {
    /** Start all registered background jobs. */
    startAll() {
        logger_1.logger.info('Starting background jobs...', { count: jobs.length });
        for (const job of jobs) {
            try {
                job.start();
            }
            catch (error) {
                logger_1.logger.error(`Failed to start job: ${job.name}`, {
                    error: error instanceof Error ? error.message : error,
                });
            }
        }
    },
    /** Stop all registered background jobs. */
    stopAll() {
        logger_1.logger.info('Stopping background jobs...', { count: jobs.length });
        for (const job of jobs) {
            try {
                job.stop();
            }
            catch (error) {
                logger_1.logger.error(`Failed to stop job: ${job.name}`, {
                    error: error instanceof Error ? error.message : error,
                });
            }
        }
    },
    /** Get health/status of each job. */
    async health() {
        return Promise.all([
            { name: 'email', stats: () => email_job_1.emailJob.stats() },
            { name: 'notification', stats: () => notification_job_1.notificationJob.stats() },
            { name: 'reminder', stats: () => reminder_job_1.reminderJob.stats() },
        ].map(async (entry) => {
            const stats = await entry.stats();
            return { name: entry.name, ...stats };
        }));
    },
};
//# sourceMappingURL=index.js.map