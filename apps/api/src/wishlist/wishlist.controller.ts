import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUserPayload } from '../auth/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';
import { WishlistQueryDto } from './dto/wishlist-query.dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve saved properties for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Paginated wishlist items' })
  async getWishlist(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Query() query: WishlistQueryDto,
  ) {
    return this.wishlistService.getUserWishlist(user.id, query);
  }

  @Post(':propertyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save a published property to wishlist' })
  @ApiResponse({ status: 200, description: 'Property saved to wishlist' })
  @ApiResponse({ status: 404, description: 'Property not found or unavailable' })
  async addToWishlist(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('propertyId') propertyId: string,
  ) {
    return this.wishlistService.addToWishlist(user.id, propertyId);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove a property from wishlist' })
  @ApiResponse({ status: 200, description: 'Property removed from wishlist' })
  async removeFromWishlist(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('propertyId') propertyId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user.id, propertyId);
  }

  @Get(':propertyId/status')
  @ApiOperation({ summary: 'Check if a property is in the user wishlist' })
  @ApiResponse({ status: 200, description: 'Wishlist status returned' })
  async getStatus(
    @CurrentUser() user: AuthenticatedUserPayload,
    @Param('propertyId') propertyId: string,
  ) {
    return this.wishlistService.getStatus(user.id, propertyId);
  }
}
