"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compensatingTransaction = void 0;
const logger_1 = require("../config/logger");
/**
 * Execute a sequence of steps where each step has a compensating rollback.
 * If any step fails, all previously completed steps have their compensate()
 * callbacks invoked in reverse order.
 *
 * Use this pattern when an operation spans multiple systems (e.g. database +
 * Redis + external API) and a pure MongoDB transaction is not enough.
 */
const compensatingTransaction = async (steps) => {
    const completed = [];
    for (const step of steps) {
        try {
            const result = await step.execute();
            completed.push({ step, result });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger_1.logger.error(`Step failed: ${step.name}`, { error: err });
            const compensationErrors = [];
            // Rollback previously completed steps in reverse order.
            for (let i = completed.length - 1; i >= 0; i--) {
                const { step: completedStep, result } = completed[i];
                try {
                    await completedStep.compensate(result);
                    logger_1.logger.info(`Compensated step: ${completedStep.name}`);
                }
                catch (compensationError) {
                    const compErr = compensationError instanceof Error
                        ? compensationError
                        : new Error(String(compensationError));
                    logger_1.logger.error(`Compensation failed for step: ${completedStep.name}`, {
                        error: compErr,
                    });
                    compensationErrors.push({ step: completedStep.name, error: compErr });
                }
            }
            return {
                success: false,
                completedSteps: completed.map((c) => c.step.name),
                failedStep: step.name,
                error: err,
                compensationErrors,
            };
        }
    }
    return {
        success: true,
        completedSteps: completed.map((c) => c.step.name),
        compensationErrors: [],
    };
};
exports.compensatingTransaction = compensatingTransaction;
//# sourceMappingURL=compensating-transaction.js.map