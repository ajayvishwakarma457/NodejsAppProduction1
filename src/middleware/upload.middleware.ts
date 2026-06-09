import multer from "multer";
import { env } from "../config/env";
import { storageService } from "../services/storage.service";

const storage = multer.memoryStorage();

const limits: multer.Options["limits"] = {
  fileSize: env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024,
  files: 5
};

export const upload = multer({
  storage,
  limits,
  fileFilter: storageService.multerFileFilter
});

export const uploadMiddleware = upload.single("file");
export const uploadMultipleMiddleware = upload.array("files", 5);
