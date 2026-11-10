import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AppConfig {
  nodeEnv: string;
  appEnv: string;
  port: number;
  webOrigin: string;
  /** Extra browser origins allowed with credentials (comma-separated WEB_CORS_ORIGINS). */
  corsOrigins: string[];
  /** Client IPs trusted to set X-Forwarded-For (comma-separated TRUSTED_PROXIES: loopback | ip | cidr). */
  trustedProxies: string[];
  cookieDomain?: string;
  cookieSecure: boolean;
  enableWorkers: boolean;
  databaseUrl: string;
  directUrl: string;
  redisUrl: string;
  auth: {
    accessTokenSecret: string;
    refreshTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
    webhookSecretPrevious: string;
  };
  groq: {
    apiKey: string;
    model: string;
    enabled: boolean;
    timeoutMs: number;
    maxRetries: number;
  };
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    appEnv: process.env['APP_ENV'] ?? process.env['NODE_ENV'] ?? 'development',
    port: parseInt(process.env['PORT'] ?? '4000', 10),
    webOrigin: process.env['WEB_ORIGIN'] ?? 'http://localhost:3000',
    corsOrigins: process.env['WEB_ORIGINS']
      ? process.env['WEB_ORIGINS']
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : [process.env['WEB_ORIGIN'] ?? 'http://localhost:3000'],
    trustedProxies: (process.env['TRUSTED_PROXIES'] ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    cookieDomain: process.env['COOKIE_DOMAIN'] || undefined,
    cookieSecure: process.env['COOKIE_SECURE'] === 'true' || process.env['NODE_ENV'] === 'production',
    enableWorkers: process.env['ENABLE_WORKERS'] !== 'false',
    databaseUrl: process.env['DATABASE_URL'] ?? '',
    directUrl: process.env['DIRECT_URL'] ?? '',
    redisUrl: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    auth: {
      accessTokenSecret: process.env['ACCESS_TOKEN_SECRET'] ?? '',
      refreshTokenSecret: process.env['REFRESH_TOKEN_SECRET'] ?? '',
      accessTokenExpiresIn: process.env['ACCESS_TOKEN_EXPIRES_IN'] ?? '15m',
      refreshTokenExpiresIn: process.env['REFRESH_TOKEN_EXPIRES_IN'] ?? '7d',
    },
    cloudinary: {
      cloudName: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
      apiKey: process.env['CLOUDINARY_API_KEY'] ?? '',
      apiSecret: process.env['CLOUDINARY_API_SECRET'] ?? '',
    },
    razorpay: {
      keyId: process.env['RAZORPAY_KEY_ID'] ?? 'rzp_test_placeholder',
      keySecret: process.env['RAZORPAY_KEY_SECRET'] ?? 'rzp_test_secret_placeholder',
      webhookSecret: process.env['RAZORPAY_WEBHOOK_SECRET'] ?? 'rzp_whsec_placeholder',
      webhookSecretPrevious: process.env['RAZORPAY_WEBHOOK_SECRET_PREVIOUS'] ?? '',
    },
    groq: {
      apiKey: process.env['GROQ_API_KEY'] ?? '',
      model: process.env['GROQ_MODEL'] ?? 'openai/gpt-oss-20b',
      enabled: process.env['GROQ_ENABLED'] !== 'false',
      timeoutMs: parseInt(process.env['GROQ_TIMEOUT_MS'] ?? '15000', 10),
      maxRetries: parseInt(process.env['GROQ_MAX_RETRIES'] ?? '1', 10),
    },
  }),
);

/** Joi schema that validates required environment variables at startup. */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  APP_ENV: Joi.string().valid('production', 'staging', 'development', 'test').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(4000),
  COOKIE_DOMAIN: Joi.string().allow('').optional(),
  COOKIE_SECURE: Joi.string().valid('true', 'false').optional(),
  ENABLE_WORKERS: Joi.string().valid('true', 'false').optional(),
  WEB_ORIGIN: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .uri({ scheme: ['https'] })
      .required(),
    otherwise: Joi.string().uri().default('http://localhost:3000'),
  }),
  /**
   * Additional browser origins (comma-separated) allowed to call the API with
   * credentials, e.g. preview deployments. Must be full absolute origins.
   */
  WEB_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .allow('')
      .optional()
      .custom((value: string | undefined, helpers) => {
        if (!value) return value;
        const origins = value.split(',').map((origin) => origin.trim());
        const isValid = origins.every((origin) => {
          try {
            const parsed = new URL(origin);
            return parsed.protocol === 'https:' && parsed.origin === origin;
          } catch {
            return false;
          }
        });
        return isValid ? value : helpers.error('string.uri');
      }),
    otherwise: Joi.string().allow('').optional(),
  }),
  /**
   * X-Forwarded-For sources to trust, comma-separated: `loopback`, an exact IP
   * (10.0.0.5, fd00::9) or an IPv4 CIDR (192.168.0.0/16). Default: trust
   * nothing, X-Forwarded-For is ignored unless the socket peer is listed.
   */
  TRUSTED_PROXIES: Joi.string().allow('').optional(),
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .uri({ scheme: ['postgresql', 'postgres'] })
      .required()
      .custom((value: string, helpers) =>
        new URL(value).hostname.includes('-pooler.')
          ? value
          : helpers.error('any.custom', { message: 'Expected a Neon pooled hostname (-pooler).' }),
      ),
    otherwise: Joi.string().required(),
  }).messages({
    'any.required': 'DATABASE_URL is required. Set the Neon pooled connection string.',
    'string.empty': 'DATABASE_URL must not be empty. Set the Neon pooled connection string.',
  }),
  DIRECT_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .uri({ scheme: ['postgresql', 'postgres'] })
      .required()
      .custom((value: string, helpers) =>
        !new URL(value).hostname.includes('-pooler.')
          ? value
          : helpers.error('any.custom', {
              message: 'Expected a direct Neon hostname without -pooler.',
            }),
      ),
    otherwise: Joi.string().required(),
  }).messages({
    'any.required': 'DIRECT_URL is required. Set the Neon direct connection string.',
    'string.empty': 'DIRECT_URL must not be empty. Set the Neon direct connection string.',
  }),
  REDIS_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .uri({ scheme: ['redis', 'rediss'] })
      .required()
      .invalid('redis://localhost:6379'),
    otherwise: Joi.string().default('redis://localhost:6379'),
  }),
  HSTS_ENABLED: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().valid('true').required(),
    otherwise: Joi.string().valid('true', 'false').default('false'),
  }),
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'ACCESS_TOKEN_SECRET must be at least 32 characters long.',
    'any.required': 'ACCESS_TOKEN_SECRET is required.',
  }),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'REFRESH_TOKEN_SECRET must be at least 32 characters long.',
    'any.required': 'REFRESH_TOKEN_SECRET is required.',
  }),
  ACCESS_TOKEN_EXPIRES_IN: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),
  CLOUDINARY_CLOUD_NAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  RAZORPAY_KEY_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('APP_ENV', {
      is: 'staging',
      then: Joi.string()
        .pattern(/^rzp_test_/)
        .required(),
      otherwise: Joi.string()
        .pattern(/^rzp_live_/)
        .required(),
    }),
    otherwise: Joi.string().default('rzp_test_placeholder'),
  }),
  RAZORPAY_KEY_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().default('rzp_test_secret_placeholder'),
  }),
  RAZORPAY_WEBHOOK_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().default('rzp_whsec_placeholder'),
  }),
  RAZORPAY_WEBHOOK_SECRET_PREVIOUS: Joi.string().allow('').optional(),
  GROQ_API_KEY: Joi.string().allow('').optional(),
  GROQ_MODEL: Joi.string().default('openai/gpt-oss-20b'),
  GROQ_ENABLED: Joi.string().valid('true', 'false').default('true'),
  GROQ_TIMEOUT_MS: Joi.number().integer().min(1000).max(60000).default(15000),
  GROQ_MAX_RETRIES: Joi.number().integer().min(0).max(5).default(1),
});
