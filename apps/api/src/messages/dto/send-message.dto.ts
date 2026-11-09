import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({
    description: 'Unique client-generated message ID to prevent duplicate submissions on retry',
    example: 'msg-uuid-12345',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64, { message: 'clientMessageId cannot exceed 64 characters.' })
  clientMessageId!: string;

  @ApiProperty({
    description: 'Plain text message content (1-2000 characters)',
    example: 'Hi, is early check-in around 1 PM possible?',
    minLength: 1,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(1, { message: 'Message content cannot be empty.' })
  @MaxLength(2000, { message: 'Message cannot exceed 2000 characters.' })
  content!: string;
}
