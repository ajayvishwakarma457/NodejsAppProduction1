import { logger } from '../config/logger';

export interface CompensatingStep<T = unknown> {
  name: string;
  execute: () => Promise<T>;
  compensate: (result: T) => Promise<void>;
}

export interface CompensatingResult {
  success: boolean;
  completedSteps: string[];
  failedStep?: string;
  error?: Error;
  compensationErrors: { step: string; error: Error }[];
}

/**
 * Execute a sequence of steps where each step has a compensating rollback.
 * If any step fails, all previously completed steps have their compensate()
 * callbacks invoked in reverse order.
 *
 * Use this pattern when an operation spans multiple systems (e.g. database +
 * Redis + external API) and a pure MongoDB transaction is not enough.
 */
export const compensatingTransaction = async (
  steps: CompensatingStep[]
): Promise<CompensatingResult> => {
  const completed: { step: CompensatingStep; result: unknown }[] = [];

  for (const step of steps) {
    try {
      const result = await step.execute();
      completed.push({ step, result });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Step failed: ${step.name}`, { error: err });

      const compensationErrors: { step: string; error: Error }[] = [];

      // Rollback previously completed steps in reverse order.
      for (let i = completed.length - 1; i >= 0; i--) {
        const { step: completedStep, result } = completed[i];
        try {
          await completedStep.compensate(result);
          logger.info(`Compensated step: ${completedStep.name}`);
        } catch (compensationError) {
          const compErr =
            compensationError instanceof Error
              ? compensationError
              : new Error(String(compensationError));
          logger.error(`Compensation failed for step: ${completedStep.name}`, {
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
