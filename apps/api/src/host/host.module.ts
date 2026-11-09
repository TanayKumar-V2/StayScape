import { Module } from '@nestjs/common';
import { HostController } from './host.controller';
import { HostGuard } from './host.guard';
import { HostService } from './host.service';

@Module({
  controllers: [HostController],
  providers: [HostService, HostGuard],
  exports: [HostService, HostGuard],
})
export class HostModule {}
