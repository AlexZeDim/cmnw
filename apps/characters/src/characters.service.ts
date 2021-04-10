import { Injectable } from '@nestjs/common';

@Injectable()
export class CharactersService {
  getHello(): string {
    return 'Hello World!';
  }
}
