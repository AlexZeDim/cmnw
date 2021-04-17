import { Injectable } from '@nestjs/common';

@Injectable()
export class WarcraftlogsService {
  getHello(): string {
    return 'Hello World!';
  }
}
