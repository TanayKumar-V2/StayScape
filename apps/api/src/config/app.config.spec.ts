import { validationSchema } from './app.config';

describe('production configuration validation', () => {
  const base = {
    NODE_ENV: 'production',
    WEB_ORIGIN: 'https://stayscape.example',
    HSTS_ENABLED: 'true',
    DATABASE_URL: 'postgresql://runtime@ep-test-pooler.us-west-2.aws.neon.tech/db?sslmode=require',
    DIRECT_URL: 'postgresql://runtime@ep-test.us-west-2.aws.neon.tech/db?sslmode=require',
    REDIS_URL: 'rediss://cache.example:6380',
    ACCESS_TOKEN_SECRET: 'a'.repeat(48),
    REFRESH_TOKEN_SECRET: 'b'.repeat(48),
    RAZORPAY_KEY_ID: 'rzp_live_configured',
    RAZORPAY_KEY_SECRET: 'c'.repeat(48),
    RAZORPAY_WEBHOOK_SECRET: 'd'.repeat(48),
    CLOUDINARY_CLOUD_NAME: 'stayscape-test',
    CLOUDINARY_API_KEY: '1234567890',
    CLOUDINARY_API_SECRET: 'e'.repeat(48),
  };

  it('rejects placeholder Razorpay credentials and local-only production defaults', () => {
    const { error } = validationSchema.validate({
      ...base,
      RAZORPAY_KEY_ID: 'rzp_test_placeholder',
    });

    expect(error).toBeDefined();
  });

  it('accepts explicit HTTPS, TLS Redis, and configured live credentials', () => {
    const { error } = validationSchema.validate(base);

    expect(error).toBeUndefined();
  });

  it('rejects unpooled runtime Neon URLs and HTTP preview origins', () => {
    const { error } = validationSchema.validate({
      ...base,
      DATABASE_URL: 'postgresql://runtime@ep-test.us-west-2.aws.neon.tech/db',
      WEB_ORIGINS: 'http://preview.stayscape.example',
    });

    expect(error).toBeDefined();
  });
});
