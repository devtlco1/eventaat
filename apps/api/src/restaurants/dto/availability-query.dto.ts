import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidYyyyMmDd', async: false })
class IsValidYyyyMmDd implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (typeof value !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [ys, ms, ds] = value.split('-');
    const y = Number(ys);
    const m = Number(ms);
    const d = Number(ds);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
      return false;
    }
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;

    const dt = new Date(y, m - 1, d);
    return (
      !isNaN(dt.getTime()) &&
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
    );
  }

  defaultMessage(): string {
    return 'date must be a valid YYYY-MM-DD';
  }
}

export class AvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @Validate(IsValidYyyyMmDd)
  date!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(240)
  durationMinutes?: number;
}

