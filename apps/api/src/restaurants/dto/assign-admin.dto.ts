import { IsUUID } from 'class-validator';

export class AssignAdminDto {
  @IsUUID('4')
  userId!: string;
}
