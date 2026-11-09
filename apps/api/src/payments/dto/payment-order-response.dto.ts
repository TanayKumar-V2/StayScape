import { ApiProperty } from '@nestjs/swagger';

export class PaymentOrderUserDto {
  @ApiProperty({ example: 'Ananya Sharma' })
  name!: string;

  @ApiProperty({ example: 'ananya@example.com' })
  email!: string;

  @ApiProperty({ example: '+919876543210', required: false })
  contact?: string;
}

export class CreatePaymentOrderResponseDto {
  @ApiProperty({ description: 'Razorpay unique order ID', example: 'order_EKwxwAgItmmMnv' })
  orderId!: string;

  @ApiProperty({ description: 'Order amount in integer paise', example: 1250000 })
  amount!: number;

  @ApiProperty({ description: 'Currency code', example: 'INR' })
  currency!: string;

  @ApiProperty({
    description: 'Razorpay key ID for client SDK initialization',
    example: 'rzp_test_...',
  })
  keyId!: string;

  @ApiProperty({ description: 'Human-readable booking reference', example: 'BK-20261109-1234' })
  bookingReference!: string;

  @ApiProperty({ description: 'Property title snapshot', example: 'Tranquil Bamboo Villa' })
  propertyTitle!: string;

  @ApiProperty({ description: 'Prefilled guest contact details' })
  user!: PaymentOrderUserDto;
}
