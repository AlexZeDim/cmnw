import { Injectable } from '@nestjs/common';

@Injectable()
export class GuildsService {
  getHello(): string {
    return 'Hello World!';
  }
}
