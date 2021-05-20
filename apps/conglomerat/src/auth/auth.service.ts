import { Injectable } from '@nestjs/common';
import { GLOBAL_OSINT_KEY } from '@app/core';

@Injectable()
export class AuthService {
  private clearance: string = GLOBAL_OSINT_KEY

  constructor() {
  }

  async test(input: string): Promise<string> {
    return '1'
  }
}
