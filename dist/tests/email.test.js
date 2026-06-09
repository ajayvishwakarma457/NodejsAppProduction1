"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const email_service_1 = require("../services/email.service");
const ApiError_1 = require("../utils/ApiError");
(0, vitest_1.describe)("emailService", () => {
    (0, vitest_1.beforeEach)(() => {
        email_service_1.emailService.init();
    });
    (0, vitest_1.afterEach)(async () => {
        await email_service_1.emailService.close();
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)("should throw bad request when 'to' is missing", async () => {
        await (0, vitest_1.expect)(email_service_1.emailService.send({ to: "", subject: "Test", text: "Hello" })).rejects.toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)("should throw bad request when subject is missing", async () => {
        await (0, vitest_1.expect)(email_service_1.emailService.send({ to: "user@example.com", subject: "", text: "Hello" })).rejects.toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)("should throw bad request when both text and html are missing", async () => {
        await (0, vitest_1.expect)(email_service_1.emailService.send({ to: "user@example.com", subject: "Test" })).rejects.toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)("should return mock messageId when SMTP is not configured", async () => {
        const result = await email_service_1.emailService.send({
            to: "user@example.com",
            subject: "Test",
            text: "Hello world"
        });
        (0, vitest_1.expect)(result.messageId).toMatch(/^mock-/);
    });
    (0, vitest_1.it)("should send bulk emails and return results", async () => {
        const results = await email_service_1.emailService.sendBulk(["a@example.com", "b@example.com"], "Bulk test", { text: "Hello" });
        (0, vitest_1.expect)(results).toHaveLength(2);
        (0, vitest_1.expect)(results[0].to).toBe("a@example.com");
        (0, vitest_1.expect)(results[1].to).toBe("b@example.com");
    });
});
