import { Module, BadRequestException } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { MulterModule } from '@nestjs/platform-express';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    MulterModule.register({
      storage: multer.diskStorage({
        destination: (_req, _file, cb) => {
          try {
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
            cb(null, uploadDir);
          } catch (err: any) {
            cb(err, uploadDir);
          }
        },
        filename: (_req, file, cb) => {
          const ts = Date.now();
          const original = file.originalname || 'file';
          const safe = original.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${ts}-${safe || 'file'}`);
        },
      }),
      limits: {
        fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        // Chỉ cho phép PDF / DOCX / XLSX / PPTX (ponytail: block ở trust boundary, không thêm lib)
        const ext = (file.originalname.split('.').pop() || '').toLowerCase();
        const allowed = ['pdf', 'docx', 'xlsx', 'pptx', 'xls', 'doc', 'ppt'];
        // xls/doc/ppt là legacy của xlsx/docx/pptx — vẫn chấp nhận để không gãy file cũ
        const ok = allowed.includes(ext);
        if (!ok) return cb(new BadRequestException(`Định dạng .${ext || '?'} không được phép. Chỉ chấp nhận PDF, DOCX, EXCEL (XLS/XLSX), PPTX.` ) as any, false);
        cb(null, true);
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [JwtAuthGuard],
})
export class UploadsModule {}
