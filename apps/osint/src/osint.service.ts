import { Injectable } from '@nestjs/common';

@Injectable()
export class OsintService {
  getHello(): string {
    return 'Hello World!';
  }
}
