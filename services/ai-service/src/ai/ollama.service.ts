import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeneratedAiContent {
  summary: string;
  insights: string[];
  recommendations: string[];
  generatedBy: 'ollama' | 'deterministic-fallback';
}

export interface GeneratedSimulationContent {
  tradeOffs: string[];
  recommendations: string[];
  generatedBy: 'ollama' | 'deterministic-fallback';
}

export interface GeneratedBriefContent {
  executiveSummary: string;
  whatIsGoingWell: string[];
  whatNeedsAttention: string[];
  criticalBottlenecks: string[];
  topDeliveryRisks: string[];
  actionPlan: string[];
  generatedBy: 'ollama' | 'deterministic-fallback';
}

export interface GeneratedQueryContent {
  answer: string;
  suggestedQuestions: string[];
  generatedBy: 'ollama' | 'deterministic-fallback';
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    const rawUrl =
      this.configService.get<string>('ollama.url') ??
      process.env.OLLAMA_URL ??
      'http://localhost:11434';
    this.ollamaUrl = rawUrl.replace(/\/+$/, '');
    this.model =
      this.configService.get<string>('ollama.model') ??
      process.env.OLLAMA_MODEL ??
      'llama3.2';
    this.timeoutMs =
      this.configService.get<number>('ollama.timeoutMs') ?? 30000;
  }

  async generateStructuredAnalysis(
    systemInstructions: string,
    userContext: string,
    fallbackGenerator: () => Omit<GeneratedAiContent, 'generatedBy'>,
  ): Promise<GeneratedAiContent> {
    const systemPrompt = `You are a software project-management analyst.
Use ONLY the supplied project data.
Do not invent people, dates, metrics, risks, or project facts.
Return strictly valid JSON only matching this schema:
{
  "summary": "Concise executive assessment",
  "insights": ["Finding 1", "Finding 2"],
  "recommendations": ["Action 1", "Action 2", "Action 3"]
}

Guidelines:
${systemInstructions}

Respond ONLY with valid JSON. No backticks, no markdown codeblocks, no surrounding text.`;

    const raw = await this.callOllama(systemPrompt, userContext);
    if (!raw) {
      const fallback = fallbackGenerator();
      return { ...fallback, generatedBy: 'deterministic-fallback' };
    }

    const parsed = this.cleanAndParseJson(raw);
    if (
      parsed &&
      typeof parsed.summary === 'string' &&
      Array.isArray(parsed.insights) &&
      Array.isArray(parsed.recommendations)
    ) {
      return {
        summary: parsed.summary,
        insights: parsed.insights.map(String),
        recommendations: parsed.recommendations.map(String),
        generatedBy: 'ollama',
      };
    }

    this.logger.warn('Ollama response was not in expected analysis JSON schema. Using fallback.');
    const fallback = fallbackGenerator();
    return { ...fallback, generatedBy: 'deterministic-fallback' };
  }

  async generateSimulationSynthesis(
    scenarioDescription: string,
    userContext: string,
    fallbackGenerator: () => Omit<GeneratedSimulationContent, 'generatedBy'>,
  ): Promise<GeneratedSimulationContent> {
    const systemPrompt = `You are an expert software delivery strategist and simulation analyst.
Analyze the following hypothetical project simulation scenario: "${scenarioDescription}".
Based ONLY on the provided baseline and simulated metrics:
Evaluate the delivery trade-offs and suggest realistic recommendations.
Do NOT invent numbers or contradict the provided metrics.
Return strictly valid JSON only matching this schema:
{
  "tradeOffs": ["Trade-off 1", "Trade-off 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Respond ONLY with valid JSON. No backticks, no markdown codeblocks.`;

    const raw = await this.callOllama(systemPrompt, userContext);
    if (!raw) {
      const fallback = fallbackGenerator();
      return { ...fallback, generatedBy: 'deterministic-fallback' };
    }

    const parsed = this.cleanAndParseJson(raw);
    if (
      parsed &&
      Array.isArray(parsed.tradeOffs) &&
      Array.isArray(parsed.recommendations)
    ) {
      return {
        tradeOffs: parsed.tradeOffs.map(String),
        recommendations: parsed.recommendations.map(String),
        generatedBy: 'ollama',
      };
    }

    this.logger.warn('Ollama response was not in expected simulation JSON schema. Using fallback.');
    const fallback = fallbackGenerator();
    return { ...fallback, generatedBy: 'deterministic-fallback' };
  }

  async generateProjectBrief(
    userContext: string,
    fallbackGenerator: () => Omit<GeneratedBriefContent, 'generatedBy'>,
  ): Promise<GeneratedBriefContent> {
    const systemPrompt = `You are an executive software delivery director creating a concise project brief.
Based ONLY on the supplied deterministic project metrics, tasks, bottlenecks, and risks:
Formulate an executive brief.
Return strictly valid JSON only matching this schema:
{
  "executiveSummary": "High level status statement",
  "whatIsGoingWell": ["Item 1", "Item 2"],
  "whatNeedsAttention": ["Item 1", "Item 2"],
  "criticalBottlenecks": ["Bottleneck 1"],
  "topDeliveryRisks": ["Risk 1"],
  "actionPlan": ["Step 1", "Step 2", "Step 3"]
}

Respond ONLY with valid JSON. No backticks, no markdown codeblocks.`;

    const raw = await this.callOllama(systemPrompt, userContext);
    if (!raw) {
      const fallback = fallbackGenerator();
      return { ...fallback, generatedBy: 'deterministic-fallback' };
    }

    const parsed = this.cleanAndParseJson(raw);
    const fallback = fallbackGenerator();
    if (
      parsed &&
      typeof parsed.executiveSummary === 'string' &&
      Array.isArray(parsed.whatIsGoingWell) &&
      Array.isArray(parsed.whatNeedsAttention) &&
      Array.isArray(parsed.criticalBottlenecks) &&
      Array.isArray(parsed.topDeliveryRisks) &&
      Array.isArray(parsed.actionPlan)
    ) {
      return {
        executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
        whatIsGoingWell:
          parsed.whatIsGoingWell.length > 0
            ? parsed.whatIsGoingWell.map(String)
            : fallback.whatIsGoingWell,
        whatNeedsAttention:
          parsed.whatNeedsAttention.length > 0
            ? parsed.whatNeedsAttention.map(String)
            : fallback.whatNeedsAttention,
        criticalBottlenecks:
          parsed.criticalBottlenecks.length > 0
            ? parsed.criticalBottlenecks.map(String)
            : fallback.criticalBottlenecks,
        topDeliveryRisks:
          parsed.topDeliveryRisks.length > 0
            ? parsed.topDeliveryRisks.map(String)
            : fallback.topDeliveryRisks,
        actionPlan:
          parsed.actionPlan.length > 0
            ? parsed.actionPlan.map(String)
            : fallback.actionPlan,
        generatedBy: 'ollama',
      };
    }

    this.logger.warn('Ollama response was not in expected brief JSON schema. Using fallback.');
    return { ...fallback, generatedBy: 'deterministic-fallback' };
  }

  async generateQueryAnswer(
    query: string,
    intent: string,
    factsContext: string,
    fallbackGenerator: () => Omit<GeneratedQueryContent, 'generatedBy'>,
  ): Promise<GeneratedQueryContent> {
    const systemPrompt = `You are AIPMS Project Intelligence Assistant.
The user asked: "${query}"
The recognized intent is: "${intent}".
Answer the question accurately using ONLY the deterministic project facts provided below.
Do not hallucinate tasks, people, or metrics.
Provide a clear, concise answer and 2-3 follow-up question suggestions.
Return strictly valid JSON only matching this schema:
{
  "answer": "Direct evidence-backed answer paragraph",
  "suggestedQuestions": ["Question 1?", "Question 2?"]
}

Respond ONLY with valid JSON. No backticks, no markdown codeblocks.`;

    const raw = await this.callOllama(systemPrompt, factsContext);
    if (!raw) {
      const fallback = fallbackGenerator();
      return { ...fallback, generatedBy: 'deterministic-fallback' };
    }

    const parsed = this.cleanAndParseJson(raw);
    if (
      parsed &&
      typeof parsed.answer === 'string' &&
      Array.isArray(parsed.suggestedQuestions)
    ) {
      return {
        answer: parsed.answer,
        suggestedQuestions: parsed.suggestedQuestions.map(String),
        generatedBy: 'ollama',
      };
    }

    this.logger.warn('Ollama response was not in expected query JSON schema. Using fallback.');
    const fallback = fallbackGenerator();
    return { ...fallback, generatedBy: 'deterministic-fallback' };
  }

  private async callOllama(systemPrompt: string, userContext: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContext },
          ],
          keep_alive: '5m',
          options: {
            temperature: 0.2,
            num_ctx: 2048,
            num_predict: 384,
            num_thread: 4,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        this.logger.warn(
          `Ollama returned HTTP ${response.status} ${response.statusText}. Using deterministic fallback.`,
        );
        return null;
      }

      const data = (await response.json()) as {
        message?: { content?: string };
        response?: string;
      };

      const content = data?.message?.content ?? data?.response ?? '';
      if (!content || content.trim().length === 0) {
        this.logger.warn('Ollama returned empty response. Using deterministic fallback.');
        return null;
      }

      return content;
    } catch (err: any) {
      this.logger.warn(
        `Ollama unavailable or request timed out (${err?.message ?? 'error'}). Using deterministic fallback.`,
      );
      return null;
    }
  }

  private cleanAndParseJson(raw: string): any {
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();

    // 1. Direct parse attempt
    try {
      return JSON.parse(trimmed);
    } catch {
      // continue to fuzzy extraction
    }

    // 2. Markdown codeblock extraction
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {
        // continue
      }
    }

    // 3. Substring extraction from first '{' to last '}'
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
      } catch {
        // continue
      }
    }

    return null;
  }
}
