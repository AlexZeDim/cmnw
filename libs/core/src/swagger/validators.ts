import { Injectable } from '@nestjs/common';
import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'AtSignExists', async: true })
@Injectable()
export class AtSignExists implements ValidatorConstraintInterface {
  async validate(param: string): Promise<boolean> {
    try {
      if (!param.includes('@')) return false;
      const [first, second] = param.split('@');
      return !!(first && second);
    } catch (e) {
      throw new Error('Validation Error')
    }
  }
}
