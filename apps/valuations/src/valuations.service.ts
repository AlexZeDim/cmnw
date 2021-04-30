import { Injectable } from '@nestjs/common';

@Injectable()
export class ValuationsService {
  getHello(): string {
    return 'Hello World!';
  }
}
