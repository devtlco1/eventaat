import { IsUUID } from 'class-validator';

export class AssignAdminDto {
  @IsUUID()
  userId!: string;
}
