"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = void 0;
class ApiResponse {
    success;
    statusCode;
    message;
    data;
    meta;
    constructor(statusCode, message, data, meta) {
        this.success = true;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.meta = meta;
    }
    send(res) {
        res.status(this.statusCode).json(this.toJSON());
    }
    toJSON() {
        const payload = {
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
    static ok(data, message = "OK") {
        return new ApiResponse(200, message, data);
    }
    static created(data, message = "Created") {
        return new ApiResponse(201, message, data);
    }
    static noContent(message = "No content") {
        return new ApiResponse(204, message);
    }
    static paginated(data, meta, message = "OK") {
        return new ApiResponse(200, message, data, meta);
    }
}
exports.ApiResponse = ApiResponse;
