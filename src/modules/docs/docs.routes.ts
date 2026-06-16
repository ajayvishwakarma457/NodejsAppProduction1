import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../../config/openapi';

const router = Router();

router.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(openApiDocument);
});

router.use('/', swaggerUi.serve, swaggerUi.setup(openApiDocument));

export const docsRouter = router;
