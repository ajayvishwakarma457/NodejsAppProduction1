import { Request, Response } from "express";
import { commentService } from "./comment.service";

export const commentController = {
  async list(_req: Request, res: Response) {
    const comments = await commentService.list();
    res.json({ success: true, data: comments });
  }
};

