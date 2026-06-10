import { Controller, Post, UseInterceptors, UploadedFile, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InterviewService } from './interview.service';

@Controller('api/v1/interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('process')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async processInterview(
    @UploadedFile() file?: Express.Multer.File,
    @Body('base64') base64String?: string,
  ) {
    let buffer: Buffer;
    let filename = 'interview.wav';

    if (file) {
      buffer = file.buffer;
      filename = file.originalname || 'interview.wav';
    } else if (base64String) {
      buffer = Buffer.from(base64String, 'base64');
    } else {
      // Return fallback translated testimony
      return this.interviewService.transcribeAndTranslate(Buffer.alloc(0), 'fallback.wav');
    }

    return this.interviewService.transcribeAndTranslate(buffer, filename);
  }
}
