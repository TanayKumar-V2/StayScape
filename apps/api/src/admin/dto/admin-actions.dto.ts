import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportReason, ReportStatus } from '@prisma/client';

export class SuspendActionDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason must be provided for suspension.' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long.' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters.' })
  reason!: string;
}

export class ActivateActionDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason or note must be provided for reactivation.' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long.' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters.' })
  reason!: string;
}

export class ModerationActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Moderation note cannot exceed 1000 characters.' })
  reason?: string;
}

export class RequiredModerationActionDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason must be provided for this moderation action.' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long.' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters.' })
  reason!: string;
}

export class AssignReportDto {
  @IsUUID('4', { message: 'assignedAdminId must be a valid UUID.' })
  assignedAdminId!: string;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus, { message: 'Invalid report status.' })
  status!: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Resolution note cannot exceed 1000 characters.' })
  resolutionNote?: string;
}

export class CreateReportDto {
  @IsEnum(['PROPERTY', 'REVIEW', 'USER', 'MESSAGE'], {
    message: 'targetType must be one of PROPERTY, REVIEW, USER, MESSAGE.',
  })
  targetType!: 'PROPERTY' | 'REVIEW' | 'USER' | 'MESSAGE';

  @IsUUID('4', { message: 'targetId must be a valid UUID.' })
  targetId!: string;

  @IsEnum(ReportReason, { message: 'Invalid report reason.' })
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters.' })
  description?: string;
}

