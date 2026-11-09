import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../../prisma/prisma.service';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqCompletionOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  endpoint?: string;
  userId?: string;
}

@Injectable()
export class GroqService {
  private readonly logger = new Logger(GroqService.name);
  private client: Groq | null = null;
  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('app.groq.apiKey', '');
    this.defaultModel = this.configService.get<string>('app.groq.model', 'openai/gpt-oss-20b');
    this.enabled = this.configService.get<boolean>('app.groq.enabled', true);
    this.timeoutMs = this.configService.get<number>('app.groq.timeoutMs', 15000);
    this.maxRetries = this.configService.get<number>('app.groq.maxRetries', 1);

    if (this.enabled && this.apiKey && this.apiKey.trim().length > 0) {
      try {
        this.client = new Groq({
          apiKey: this.apiKey,
          timeout: this.timeoutMs,
        });
        this.logger.log(`Groq AI service initialized with model ${this.defaultModel}`);
      } catch (err: unknown) {
        this.logger.warn(
          `Failed to initialize Groq client: ${err instanceof Error ? err.message : String(err)}`,
        );
        this.client = null;
      }
    } else {
      this.logger.log(
        'Groq AI service is unconfigured or disabled. Deterministic fallbacks will be used.',
      );
    }
  }

  isAvailable(): boolean {
    return Boolean(this.enabled && this.client && this.apiKey && this.apiKey.trim().length > 0);
  }

  getModel(): string {
    return this.defaultModel;
  }

  private async recordUsage(data: {
    endpoint: string;
    model: string;
    userId?: string;
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
    success: boolean;
    errorCategory?: string;
  }): Promise<void> {
    if (!this.prisma) return;
    try {
      await this.prisma.aiUsageLog.create({
        data: {
          endpoint: data.endpoint,
          model: data.model,
          userId: data.userId ?? null,
          inputTokens: data.inputTokens ?? null,
          outputTokens: data.outputTokens ?? null,
          durationMs: data.durationMs,
          success: data.success,
          errorCategory: data.errorCategory ?? null,
        },
      });
    } catch (err: unknown) {
      this.logger.debug(
        `Failed to record AI usage log: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async createChatCompletion(options: GroqCompletionOptions): Promise<string | null> {
    if (!this.isAvailable() || !this.client) {
      return null;
    }

    const model = options.model || this.defaultModel;
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.maxTokens ?? 2048;
    const startTime = Date.now();

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Groq request timed out after ${this.timeoutMs}ms`)),
            this.timeoutMs,
          ),
        );

        const requestPromise = this.client.chat.completions.create({
          model,
          messages: options.messages,
          temperature,
          max_tokens: maxTokens,
          response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        });

        const response = await Promise.race([requestPromise, timeoutPromise]);
        const content = response.choices?.[0]?.message?.content ?? null;

        void this.recordUsage({
          endpoint: options.endpoint ?? 'chat-completion',
          model,
          userId: options.userId,
          inputTokens: response.usage?.prompt_tokens,
          outputTokens: response.usage?.completion_tokens,
          durationMs: Date.now() - startTime,
          success: true,
        });

        return content;
      } catch (error: unknown) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Groq request attempt ${attempt} failed: ${errorMessage}`);

        if (attempt > this.maxRetries) {
          this.logger.error(`Groq completion failed after ${attempt} attempts: ${errorMessage}`);
          void this.recordUsage({
            endpoint: options.endpoint ?? 'chat-completion',
            model,
            userId: options.userId,
            durationMs: Date.now() - startTime,
            success: false,
            errorCategory: errorMessage.slice(0, 100),
          });
          return null;
        }

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }

    return null;
  }

  async createJsonCompletion<T>(options: GroqCompletionOptions): Promise<T | null> {
    const raw = await this.createChatCompletion({
      ...options,
      jsonMode: true,
    });

    if (!raw) {
      return null;
    }

    try {
      // Find json in raw string in case model wrapped it in markdown code fences
      let clean = raw.trim();
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      return JSON.parse(clean) as T;
    } catch (parseError: unknown) {
      this.logger.warn(
        `Failed to parse JSON response from Groq: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      return null;
    }
  }
}
