/**
 * File upload REST controller (simple multipart, no tRPC needed for binary).
 * After upload, the FE gets back the path and embeds it in the plan/avatar payload.
 */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Req,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    try {
      if (!file) {
        this.logger.warn('Upload rejected: missing multipart field "file"');
        throw new BadRequestException('Không có file được upload (field name phải là "file")');
      }

      const host = req.headers?.host || 'localhost';
      const protoHeader = req.headers?.['x-forwarded-proto'];
      const proto = Array.isArray(protoHeader)
        ? protoHeader[0]
        : protoHeader || (req as any).protocol || 'http';

      this.logger.log(`Upload ok: ${file.originalname} -> ${file.filename} (${file.size} bytes)`);

      return {
        name: file.originalname,
        path: file.filename,
        url: `${proto}://${host}/api/uploads/${file.filename}`,
        size: file.size,
        mimetype: file.mimetype,
      };
    } catch (err: any) {
      if (err?.getStatus || err?.status || err?.statusCode) throw err;
      this.logger.error(`Upload failed: ${err?.message || err}`, err?.stack);
      throw new InternalServerErrorException(err?.message || 'Upload thất bại');
    }
  }
}
