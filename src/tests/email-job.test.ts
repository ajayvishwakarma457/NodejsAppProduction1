import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { emailJob, EmailQueuePayload } from "../jobs/email.job";
import { redisService } from "../services/redis.service";

describe("emailJob", () => {
  const sampleEmail: EmailQueuePayload = {
    to: "test@example.com",
    subject: "Test Subject",
    text: "Hello world"
  };

  beforeAll(async () => {
    await redisService.connect();
  });

  beforeEach(async () => {
    await emailJob.clearQueue();
    await emailJob.clearDLQ();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  it("should enqueue an email", async () => {
    await emailJob.enqueue(sampleEmail);
    const stats = await emailJob.stats();
    expect(stats.queueSize).toBe(1);
  });

  it("should process a batch and succeed", async () => {
    await emailJob.enqueue(sampleEmail);
    const result = await emailJob.processBatch();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);

    const stats = await emailJob.stats();
    expect(stats.queueSize).toBe(0);
  });

  it("should retry failed emails up to max retries", async () => {
    // Queue an email with invalid recipient to force failure
    await emailJob.enqueue({ to: "", subject: "Bad", text: "test" });

    // First attempt fails and requeues (retries: 0 -> 1)
    const r1 = await emailJob.processBatch();
    expect(r1.failed).toBe(1);
    expect(r1.movedToDLQ).toBe(0);

    // Second attempt fails and requeues (retries: 1 -> 2)
    const r2 = await emailJob.processBatch();
    expect(r2.failed).toBe(1);
    expect(r2.movedToDLQ).toBe(0);

    // Third attempt fails and requeues (retries: 2 -> 3)
    const r3 = await emailJob.processBatch();
    expect(r3.failed).toBe(1);
    expect(r3.movedToDLQ).toBe(0);

    // Fourth attempt fails and moves to DLQ (retries: 3 -> 4 > maxRetries 3)
    const r4 = await emailJob.processBatch();
    expect(r4.failed).toBe(1);
    expect(r4.movedToDLQ).toBe(1);

    const stats = await emailJob.stats();
    expect(stats.queueSize).toBe(0);
    expect(stats.dlqSize).toBe(1);
  });

  it("should process multiple emails in a batch", async () => {
    await emailJob.enqueue({ to: "a@example.com", subject: "A", text: "a" });
    await emailJob.enqueue({ to: "b@example.com", subject: "B", text: "b" });
    await emailJob.enqueue({ to: "c@example.com", subject: "C", text: "c" });

    const result = await emailJob.processBatch();
    expect(result.processed).toBe(3);
    expect(result.succeeded).toBe(3);
  });

  it("should peek at the next email without removing it", async () => {
    await emailJob.enqueue(sampleEmail);
    const peeked = await emailJob.peek();

    expect(peeked).not.toBeNull();
    expect(peeked?.payload.subject).toBe("Test Subject");

    const stats = await emailJob.stats();
    expect(stats.queueSize).toBe(1);
  });

  it("should clear queue and dlq", async () => {
    // Use invalid email to force DLQ
    await emailJob.enqueue({ to: "", subject: "F", text: "t" });
    await emailJob.processBatch(); // fail -> retry 1
    await emailJob.processBatch(); // fail -> retry 2
    await emailJob.processBatch(); // fail -> retry 3
    await emailJob.processBatch(); // fail -> DLQ

    let stats = await emailJob.stats();
    expect(stats.dlqSize).toBe(1);

    await emailJob.clearQueue();
    await emailJob.clearDLQ();

    stats = await emailJob.stats();
    expect(stats.queueSize).toBe(0);
    expect(stats.dlqSize).toBe(0);
  });
});
