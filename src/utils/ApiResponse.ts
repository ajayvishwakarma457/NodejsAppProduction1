import { Response } from "express";

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
  meta?: PaginationMeta;

  constructor(statusCode: number, message: string, data?: T, meta?: PaginationMeta) {
    this.success = true;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(res: Response): void {
    res.status(this.statusCode).json(this.toJSON());
  }

  toJSON() {
    const payload: Record<string, unknown> = {
      success: this.success,
      message: this.message
    };

    if (this.data !== undefined) {
      payload.data = this.data;
    }

    if (this.meta) {
      payload.meta = this.meta;
    }

    return payload;
  }

  static ok<T>(data?: T, message = "OK"): ApiResponse<T> {
    return new ApiResponse(200, message, data);
  }

  static created<T>(data?: T, message = "Created"): ApiResponse<T> {
    return new ApiResponse(201, message, data);
  }

  static noContent(message = "No content"): ApiResponse<never> {
    return new ApiResponse(204, message);
  }

  static paginated<T>(data: T, meta: PaginationMeta, message = "OK"): ApiResponse<T> {
    return new ApiResponse(200, message, data, meta);
  }
}
