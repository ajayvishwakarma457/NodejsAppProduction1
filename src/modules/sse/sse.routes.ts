import { Router } from 'express';
import { streamEvents } from './sse.controller';

const router = Router();

router.get('/stream', (req, res, next) => {
  try {
    streamEvents(req, res);
  } catch (err) {
    next(err);
  }
});

export const sseRouter = router;
