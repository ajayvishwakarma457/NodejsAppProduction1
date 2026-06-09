import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service";

export const authController = {
  async login(req: Request, res: Response) {
    const user = await authService.login(req.body.email);
    res.status(StatusCodes.OK).json({ success: true, data: user });
  }
};

