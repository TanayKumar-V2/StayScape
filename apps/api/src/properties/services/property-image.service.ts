import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PropertyImage } from '@prisma/client';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export function detectImageFormat(buffer: Buffer): { format: string; valid: boolean } {
  if (buffer.length < 12) {
    return { format: 'unknown', valid: false };
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { format: 'jpeg', valid: true };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { format: 'png', valid: true };
  }
  // WebP: RIFF .... WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { format: 'webp', valid: true };
  }
  // AVIF: check for ftyp box
  const box = buffer.subarray(4, 12).toString('latin1');
  if (box.includes('ftyp')) {
    const ftyp = buffer.subarray(4, 16).toString('latin1');
    if (ftyp.includes('avif') || ftyp.includes('mif1')) {
      return { format: 'avif', valid: true };
    }
  }

  return { format: 'unknown', valid: false };
}

@Injectable()
export class PropertyImageService {
  private readonly logger = new Logger(PropertyImageService.name);
  private readonly isCloudinaryConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly redisService?: RedisService,
  ) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

    if (this.isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log('Cloudinary initialized for property image uploads');
    } else {
      this.logger.warn(
        'Cloudinary credentials not provided. Using fallback placeholder storage for development/testing.',
      );
    }
  }

  private async invalidatePublicCache(): Promise<void> {
    try {
      const client = this.redisService?.getClient();
      if (client) {
        await client.incr('cache:properties:version');
      }
    } catch {
      // Graceful fallback if Redis is offline
    }
  }

  async uploadImages(
    propertyId: string,
    files: UploadedFile[],
    altText?: string,
  ): Promise<PropertyImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one image file must be provided');
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      if (file.size > maxFileSize) {
        throw new BadRequestException(
          `File ${file.originalname} exceeds maximum allowed size of 10MB`,
        );
      }
      const { valid } = detectImageFormat(file.buffer);
      if (!valid) {
        throw new BadRequestException(
          `File ${file.originalname} has invalid format. Only JPEG, PNG, WebP, and AVIF are permitted.`,
        );
      }
    }

    // Existing images count for sortOrder and cover status
    const existingCount = await this.prisma.propertyImage.count({
      where: { propertyId },
    });
    const hasExistingCover = Boolean(
      await this.prisma.propertyImage.findFirst({
        where: { propertyId, isCover: true },
      }),
    );

    const uploadedImages: PropertyImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const { format } = detectImageFormat(file.buffer);
      const isCover = !hasExistingCover && existingCount === 0 && i === 0;
      const sortOrder = existingCount + i;

      let publicId: string;
      let secureUrl: string;
      let width = 1200;
      let height = 800;
      let bytes = file.size;
      let finalFormat = format;

      if (this.isCloudinaryConfigured) {
        try {
          const result = await new Promise<UploadApiResponse>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: `stayscape/properties/${propertyId}`,
                resource_type: 'image',
              },
              (error, res) => {
                if (error || !res) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : typeof error === 'object' && error !== null && 'message' in error
                        ? String((error as { message: unknown }).message)
                        : 'Cloudinary upload stream returned undefined result';
                  const rejectionError = error instanceof Error ? error : new Error(message);
                  reject(rejectionError);
                } else {
                  resolve(res);
                }
              },
            );
            uploadStream.end(file.buffer);
          });

          publicId = result.public_id;
          secureUrl = result.secure_url;
          width = result.width;
          height = result.height;
          bytes = result.bytes;
          finalFormat = result.format;
        } catch (uploadErr) {
          this.logger.error('Cloudinary upload error:', uploadErr);
          throw new BadRequestException('Failed to upload image to cloud storage');
        }
      } else {
        // Fallback for development/testing when Cloudinary is not configured
        const id = randomUUID();
        publicId = `local_mock_${propertyId}_${id}`;
        // Premium default mock images for tests and preview
        const mockPicks = [
          'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
        ];
        secureUrl = mockPicks[(existingCount + i) % mockPicks.length] ?? mockPicks[0];
      }

      const image = await this.prisma.propertyImage.create({
        data: {
          propertyId,
          publicId,
          secureUrl,
          altText: altText ?? file.originalname,
          width,
          height,
          format: finalFormat,
          bytes,
          sortOrder,
          isCover,
        },
      });

      uploadedImages.push(image);
    }

    await this.invalidatePublicCache();
    return uploadedImages;
  }

  async deleteImage(propertyId: string, imageId: string): Promise<void> {
    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });

    if (!image) {
      throw new NotFoundException('Image not found for this property');
    }

    if (this.isCloudinaryConfigured && !image.publicId.startsWith('local_mock_')) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (err) {
        this.logger.warn(`Failed to destroy Cloudinary image ${image.publicId}:`, err);
      }
    }

    const wasCover = image.isCover;
    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    // If deleted image was cover, promote the first remaining image
    if (wasCover) {
      const nextImage = await this.prisma.propertyImage.findFirst({
        where: { propertyId },
        orderBy: { sortOrder: 'asc' },
      });

      if (nextImage) {
        await this.prisma.propertyImage.update({
          where: { id: nextImage.id },
          data: { isCover: true },
        });
      }
    }

    await this.invalidatePublicCache();
  }

  async setCover(propertyId: string, imageId: string): Promise<PropertyImage> {
    const target = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });

    if (!target) {
      throw new NotFoundException('Image not found for this property');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.propertyImage.updateMany({
        where: { propertyId },
        data: { isCover: false },
      });

      return tx.propertyImage.update({
        where: { id: imageId },
        data: { isCover: true },
      });
    });

    await this.invalidatePublicCache();
    return updated;
  }

  async reorderImages(propertyId: string, imageIds: string[]): Promise<PropertyImage[]> {
    const existingImages = await this.prisma.propertyImage.findMany({
      where: { propertyId },
    });

    const existingMap = new Map(existingImages.map((img) => [img.id, img]));

    for (const id of imageIds) {
      if (!existingMap.has(id)) {
        throw new BadRequestException(`Image id ${id} does not belong to this property`);
      }
    }

    await this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.propertyImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    await this.invalidatePublicCache();

    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
