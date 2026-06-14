import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emailService } from '../../services/email.service';
import { ApiError } from '../../utils/ApiError';

describe('emailService', () => {
  beforeEach(() => {
    emailService.init();
  });

  afterEach(async () => {
    await emailService.close();
    vi.restoreAllMocks();
  });

  it("should throw bad request when 'to' is missing", async () => {
    await expect(emailService.send({ to: '', subject: 'Test', text: 'Hello' })).rejects.toThrow(
      ApiError
    );
  });

  it('should throw bad request when subject is missing', async () => {
    await expect(
      emailService.send({ to: 'user@example.com', subject: '', text: 'Hello' })
    ).rejects.toThrow(ApiError);
  });

  it('should throw bad request when both text and html are missing', async () => {
    await expect(emailService.send({ to: 'user@example.com', subject: 'Test' })).rejects.toThrow(
      ApiError
    );
  });

  it('should return mock messageId when SMTP is not configured', async () => {
    const result = await emailService.send({
      to: 'user@example.com',
      subject: 'Test',
      text: 'Hello world',
    });

    expect(result.messageId).toMatch(/^mock-/);
  });

  it('should send bulk emails and return results', async () => {
    const results = await emailService.sendBulk(['a@example.com', 'b@example.com'], 'Bulk test', {
      text: 'Hello',
    });

    expect(results).toHaveLength(2);
    expect(results[0].to).toBe('a@example.com');
    expect(results[1].to).toBe('b@example.com');
  });
});
