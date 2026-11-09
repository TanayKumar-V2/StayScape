import { registerAs } from '@nestjs/config';

export interface GroqConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
  timeoutMs: number;
  maxRetries: number;
}

export default registerAs(
  'groq',
  (): GroqConfig => ({
    apiKey: process.env['GROQ_API_KEY'] ?? '',
    model: process.env['GROQ_MODEL'] ?? 'openai/gpt-oss-20b',
    enabled: process.env['GROQ_ENABLED'] !== 'false',
    timeoutMs: parseInt(process.env['GROQ_TIMEOUT_MS'] ?? '15000', 10),
    maxRetries: parseInt(process.env['GROQ_MAX_RETRIES'] ?? '1', 10),
  }),
);

