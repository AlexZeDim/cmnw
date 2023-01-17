import { Injectable } from '@nestjs/common';

@Injectable()
export class TestsService {
  getHello(): string {
    return 'Hello World!';
  }
}
