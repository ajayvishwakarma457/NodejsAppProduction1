import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { apiKeyService } from './api-key.service';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiKeyScope } from './api-key.model';

export const apiKeyController = {
  async create(req: Request, res: Response) {
    const userId = req.user!.id;
    const { name, scopes, expiresInDays } = req.body as {
      name: string;
      scopes?: ApiKeyScope[];
      expiresInDays?: number;
    };

    const result = await apiKeyService.generateApiKey(userId, {
      name,
      role: req.user!.role ?? 'member',
      scopes,
      expiresInDays,
    });

    ApiResponse.created(
      {
        apiKey: result.apiKey,
        metadata: result.metadata,
      },
      'API key created successfully'
    ).send(res);
  },

  async list(req: Request, res: Response) {
    const keys = await apiKeyService.listApiKeys(req.user!.id);
    ApiResponse.ok(keys, 'API keys retrieved successfully').send(res);
  },

  async revoke(req: Request, res: Response) {
    const userId = req.user!.id;
    const { id } = req.params;

    await apiKeyService.revokeApiKey(userId, id as string);

    res.status(StatusCodes.NO_CONTENT).send();
  },
};
