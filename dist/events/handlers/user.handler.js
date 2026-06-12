"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserEventHandlers = void 0;
const event_bus_1 = require("../../utils/event-bus");
const email_job_1 = require("../../jobs/email.job");
const logger_1 = require("../../config/logger");
const registerUserEventHandlers = () => {
    event_bus_1.eventBus.on('user.created', async ({ userId, email, firstName }) => {
        logger_1.logger.info('Event received: user.created', { userId, email });
        await email_job_1.emailJob.enqueue({
            to: email,
            subject: 'Welcome to the platform!',
            text: `Hi ${firstName}, welcome aboard! We're excited to have you.`,
        });
    });
    event_bus_1.eventBus.on('user.updated', ({ userId, changes }) => {
        logger_1.logger.info('Event received: user.updated', { userId, changes });
    });
    event_bus_1.eventBus.on('user.deleted', ({ userId }) => {
        logger_1.logger.info('Event received: user.deleted', { userId });
    });
};
exports.registerUserEventHandlers = registerUserEventHandlers;
//# sourceMappingURL=user.handler.js.map