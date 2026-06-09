import { Router } from "express";

type Entity = Record<string, unknown>;

export const createCrudModule = (name: string) => {
  const collection: Entity[] = [];

  const repository = {
    async findAll() {
      return collection;
    }
  };

  const service = {
    async list() {
      return repository.findAll();
    }
  };

  const controller = {
    async list(_req: unknown, res: { json: (body: unknown) => void }) {
      const items = await service.list();
      res.json({ success: true, module: name, data: items });
    }
  };

  const router = Router();
  router.get("/", (req, res, next) => {
    void controller.list(req, res).catch(next);
  });

  return {
    repository,
    service,
    controller,
    router
  };
};

