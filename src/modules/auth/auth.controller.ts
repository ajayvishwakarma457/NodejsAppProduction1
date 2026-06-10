import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "./auth.service";
import { ApiResponse } from "../../utils/ApiResponse";

const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== "string") return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
};

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    ApiResponse.created(result, "User registered successfully").send(res);
  },

  async login(req: Request, res: Response) {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);
    ApiResponse.ok(result, "Login successful").send(res);
  },

  async logout(req: Request, res: Response) {
    const accessToken = extractBearerToken(req);
    const { refreshToken } = req.body as { refreshToken?: string };

    if (!accessToken) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "Access token required"
      });
      return;
    }

    await authService.logout(accessToken, refreshToken);
    ApiResponse.ok(null, "Logout successful").send(res);
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);
    ApiResponse.ok(tokens, "Token refreshed").send(res);
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found"
      });
      return;
    }

    ApiResponse.ok(user).send(res);
  },

  async changePassword(req: Request, res: Response) {
    const userId = req.user!.id;
    const { oldPassword, newPassword } = req.body as {
      oldPassword: string;
      newPassword: string;
    };

    await authService.changePassword(userId, oldPassword, newPassword);
    ApiResponse.ok(null, "Password changed successfully").send(res);
  }
};
