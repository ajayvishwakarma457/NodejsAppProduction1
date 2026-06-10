import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { commentService } from "./comment.service";
import { ApiResponse } from "../../utils/ApiResponse";

export const commentController = {
  async list(req: Request, res: Response) {
    const { data, meta } = await commentService.list(
      req.query as Record<string, unknown>
    );
    ApiResponse.paginated(data, meta).send(res);
  },

  async getById(req: Request, res: Response) {
    const comment = await commentService.getById(req.params.id as string);

    if (!comment) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Comment not found"
      });
      return;
    }

    ApiResponse.ok(comment).send(res);
  },

  async create(req: Request, res: Response) {
    const userId = req.user!.id;
    const comment = await commentService.create(req.body, userId);
    ApiResponse.created(comment, "Comment created").send(res);
  },

  async update(req: Request, res: Response) {
    const userId = req.user!.id;
    const comment = await commentService.update(req.params.id as string, req.body, userId);

    if (!comment) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Comment not found"
      });
      return;
    }

    ApiResponse.ok(comment, "Comment updated").send(res);
  },

  async remove(req: Request, res: Response) {
    const userId = req.user!.id;
    const deleted = await commentService.remove(req.params.id as string, userId);

    if (!deleted) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Comment not found"
      });
      return;
    }

    ApiResponse.noContent("Comment deleted").send(res);
  }
};
