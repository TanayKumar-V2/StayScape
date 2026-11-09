import { IsOptional, IsInt, Min, Max, IsString, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminPaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'asc', 'desc'])
  sort?: string = 'newest';

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;
}

export class AdminDashboardOverviewQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be in YYYY-MM-DD format' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be in YYYY-MM-DD format' })
  to?: string;
}

export class AdminAnalyticsQueryDto {
  @IsOptional()
  @IsIn(['7d', '30d', '90d', '12m'])
  period?: '7d' | '30d' | '90d' | '12m' = '30d';
}

export class AdminUserQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: string;
}

export class AdminPropertyQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  propertyType?: string;

  @IsOptional()
  @IsString()
  moderationStatus?: string;
}

export class AdminReportQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsIn(['PROPERTY', 'REVIEW', 'USER', 'MESSAGE'])
  targetType?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  assignedAdminId?: string;
}

export class AdminAuditLogQueryDto extends AdminPaginationQueryDto {
  @IsOptional()
  @IsString()
  adminUserId?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;
}

