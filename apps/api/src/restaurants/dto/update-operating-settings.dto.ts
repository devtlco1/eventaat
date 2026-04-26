import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateOperatingSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(24 * 60)
  defaultReservationDurationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minPartySize?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPartySize?: number | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  manualApprovalRequired?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  acceptsReservations?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  advanceBookingDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  sameDayCutoffMinutes?: number;
}
