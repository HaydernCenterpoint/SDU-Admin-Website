import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

@Module({
  imports: [
    MulterModule.register({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${ts}-${safe}`);
        },
      }),
      limits: {
        fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024,
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
