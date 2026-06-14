import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { register, authRequest } from './helpers';
import { storageService } from '../../services/storage.service';

describe('GET /api/v1/files/:key/stream', () => {
  it('streams an existing file', async () => {
    const { session } = await register({ email: 'file-stream@example.com' });
    const upload = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'integration-test.txt',
        mimetype: 'text/plain',
        encoding: '7bit',
        size: 12,
        buffer: Buffer.from('hello world!'),
      },
      'integration-tests'
    );

    const response = await authRequest(
      'get',
      `/api/v1/files/${encodeURIComponent(upload.key)}/stream`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers['content-type']).toBe('text/plain');
    expect(response.text).toBe('hello world!');

    await storageService.delete(upload.key);
  });

  it('supports HTTP Range requests', async () => {
    const { session } = await register({ email: 'file-stream-range@example.com' });
    const upload = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'integration-range.txt',
        mimetype: 'text/plain',
        encoding: '7bit',
        size: 12,
        buffer: Buffer.from('hello world!'),
      },
      'integration-tests'
    );

    const response = await authRequest(
      'get',
      `/api/v1/files/${encodeURIComponent(upload.key)}/stream`,
      session.accessToken
    ).set('Range', 'bytes=0-4');

    expect(response.status).toBe(StatusCodes.PARTIAL_CONTENT);
    expect(response.headers['content-range']).toMatch(/bytes 0-4\/12/);
    expect(response.text).toBe('hello');

    await storageService.delete(upload.key);
  });

  it('returns 404 for a missing file', async () => {
    const { session } = await register({ email: 'file-stream-missing@example.com' });

    const response = await authRequest(
      'get',
      `/api/v1/files/integration-tests/missing-file.txt/stream`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});

describe('POST /api/v1/files/multipart/*', () => {
  it('rejects multipart init when local provider is active', async () => {
    const { session } = await register({ email: 'file-multipart@example.com' });

    const response = await authRequest(
      'post',
      '/api/v1/files/multipart/init',
      session.accessToken
    ).send({
      fileName: 'large-file.zip',
    });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
