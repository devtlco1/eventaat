import { IsIn, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { RestaurantEventStatus } from '@prisma/client';

export class ReviewRestaurantEventDto {
  @IsIn([RestaurantEventStatus.APPROVED, RestaurantEventStatus.REJECTED])
  status!: RestaurantEventStatus;

  @ValidateIf((o: ReviewRestaurantEventDto) => o.status === RestaurantEventStatus.REJECTED)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionReason?: string;
}
