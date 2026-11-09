import { Module } from '@nestjs/common';
import { HostModule } from '../host/host.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PublicPropertiesController } from './public-properties.controller';
import { PublicPropertiesService } from './public-properties.service';
import { PropertyImageService } from './services/property-image.service';

@Module({
  imports: [HostModule],
  controllers: [PublicPropertiesController, PropertiesController],
  providers: [PropertiesService, PropertyImageService, PublicPropertiesService],
  exports: [PropertiesService, PropertyImageService, PublicPropertiesService],
})
export class PropertiesModule {}
