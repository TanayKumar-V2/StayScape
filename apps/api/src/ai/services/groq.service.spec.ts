import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GroqService } from './groq.service';

describe('GroqService', () => {
  let service: GroqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroqService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: unknown) => {
              if (key === 'app.groq.apiKey') return 'mock-groq-key';
              if (key === 'app.groq.model') return 'openai/gpt-oss-20b';
              if (key === 'app.groq.enabled') return true;
              if (key === 'app.groq.timeoutMs') return 5000;
              if (key === 'app.groq.maxRetries') return 1;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GroqService>(GroqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should report availability correctly when initialized with key', () => {
    expect(service.isAvailable()).toBe(true);
    expect(service.getModel()).toBe('openai/gpt-oss-20b');
  });

  it('should clean markdown json code fences when parsing json completion', async () => {
    const rawFenced = '```json\n{"summary": "Test summary", "score": 90}\n```';
    jest.spyOn(service, 'createChatCompletion').mockResolvedValue(rawFenced);

    const result = await service.createJsonCompletion<{ summary: string; score: number }>({
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result).toEqual({ summary: 'Test summary', score: 90 });
  });

  it('should return null if raw completion is null', async () => {
    jest.spyOn(service, 'createChatCompletion').mockResolvedValue(null);

    const result = await service.createJsonCompletion({
      messages: [{ role: 'user', content: 'test' }],
    });

    expect(result).toBeNull();
  });
});

