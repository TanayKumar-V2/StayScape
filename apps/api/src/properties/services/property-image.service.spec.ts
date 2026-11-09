import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { detectImageFormat, PropertyImageService, UploadedFile } from './property-image.service';

describe('PropertyImageService', () => {
  let service: PropertyImageService;
  let mockPrisma: any;
  let mockConfigService: any;

  // Valid image magic byte buffers
  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  const invalidBuffer = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
  ]);

  beforeEach(() => {
    mockPrisma = {
      propertyImage: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callbackOrArray) => {
        if (typeof callbackOrArray === 'function') {
          return callbackOrArray(mockPrisma);
        }
        return Promise.all(callbackOrArray);
      }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(null), // no Cloudinary config -> fallback mock storage
    };

    service = new PropertyImageService(mockPrisma, mockConfigService as ConfigService);
  });

  describe('detectImageFormat', () => {
    it('should correctly detect JPEG', () => {
      expect(detectImageFormat(validJpegBuffer)).toEqual({ format: 'jpeg', valid: true });
    });

    it('should correctly detect PNG', () => {
      expect(detectImageFormat(validPngBuffer)).toEqual({ format: 'png', valid: true });
    });

    it('should reject invalid image format', () => {
      expect(detectImageFormat(invalidBuffer)).toEqual({ format: 'unknown', valid: false });
    });

    it('should reject short buffer', () => {
      expect(detectImageFormat(Buffer.from([0xff]))).toEqual({ format: 'unknown', valid: false });
    });
  });

  describe('uploadImages', () => {
    it('should reject empty files array', async () => {
      await expect(service.uploadImages('prop-1', [])).rejects.toThrow(BadRequestException);
    });

    it('should reject file with invalid magic bytes', async () => {
      const files: UploadedFile[] = [
        {
          originalname: 'bad.jpg',
          mimetype: 'image/jpeg',
          buffer: invalidBuffer,
          size: invalidBuffer.length,
        },
      ];
      await expect(service.uploadImages('prop-1', files)).rejects.toThrow(BadRequestException);
    });

    it('should successfully upload valid files and designate the first as cover when none exist', async () => {
      mockPrisma.propertyImage.count.mockResolvedValue(0);
      mockPrisma.propertyImage.findFirst.mockResolvedValue(null);
      mockPrisma.propertyImage.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'img-1', ...data }),
      );

      const files: UploadedFile[] = [
        {
          originalname: 'living-room.jpg',
          mimetype: 'image/jpeg',
          buffer: validJpegBuffer,
          size: validJpegBuffer.length,
        },
      ];

      const result = await service.uploadImages('prop-1', files);
      expect(result).toHaveLength(1);
      expect(result[0]?.isCover).toBe(true);
      expect(result[0]?.sortOrder).toBe(0);
    });
  });

  describe('deleteImage', () => {
    it('should throw NotFoundException if image does not exist', async () => {
      mockPrisma.propertyImage.findFirst.mockResolvedValue(null);
      await expect(service.deleteImage('prop-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should promote next image to cover if deleted image was cover', async () => {
      mockPrisma.propertyImage.findFirst
        .mockResolvedValueOnce({
          id: 'img-1',
          propertyId: 'prop-1',
          isCover: true,
          publicId: 'mock_1',
        })
        .mockResolvedValueOnce({ id: 'img-2', propertyId: 'prop-1', isCover: false, sortOrder: 1 });

      mockPrisma.propertyImage.delete.mockResolvedValue({ id: 'img-1' });
      mockPrisma.propertyImage.update.mockResolvedValue({ id: 'img-2', isCover: true });

      await service.deleteImage('prop-1', 'img-1');

      expect(mockPrisma.propertyImage.delete).toHaveBeenCalledWith({ where: { id: 'img-1' } });
      expect(mockPrisma.propertyImage.update).toHaveBeenCalledWith({
        where: { id: 'img-2' },
        data: { isCover: true },
      });
    });
  });

  describe('setCover', () => {
    it('should update target image to cover and unset others', async () => {
      mockPrisma.propertyImage.findFirst.mockResolvedValue({ id: 'img-2', propertyId: 'prop-1' });
      mockPrisma.propertyImage.update.mockResolvedValue({ id: 'img-2', isCover: true });

      await service.setCover('prop-1', 'img-2');

      expect(mockPrisma.propertyImage.updateMany).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1' },
        data: { isCover: false },
      });
      expect(mockPrisma.propertyImage.update).toHaveBeenCalledWith({
        where: { id: 'img-2' },
        data: { isCover: true },
      });
    });
  });
});
