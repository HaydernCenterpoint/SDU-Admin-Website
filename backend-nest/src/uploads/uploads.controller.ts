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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File, req: Request) {
    if (!file) throw new BadRequestException('Không có file được upload');
    const host = req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    return {
      name: file.originalname,
      path: file.filename,
      url: `${proto}://${host}/api/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
