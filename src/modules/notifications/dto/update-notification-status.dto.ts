import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { NotificationStatus } from '../enums/notification-status.enum';

export class UpdateNotificationStatusDto {
  @ApiProperty({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  @IsNotEmpty()
  status!: NotificationStatus;
}
