import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

type GenerateImageRequest = {
  prompt: string;
};

type GenerateImageResponse = {
  imageUrl: string;
};

type EnhancedPromptResponse = {
  enhancedPrompt: string;
};

type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_PAYLOAD"
  | "CONFIGURATION_ERROR"
  | "PROMPT_ENHANCEMENT_FAILED"
  | "INVALID_ENHANCED_PROMPT"
  | "IMAGE_GENERATION_FAILED"
  | "IMAGE_UPLOAD_FAILED"
  | "INTERNAL_SERVER_ERROR";

type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

const MODEL = "gpt-4.1-mini";
const IMAGE_MODEL = "gpt-image-1";
const IMAGE_SIZE = "1024x1024";
const IMAGE_QUALITY = "high";

const generateImageRequestSchema: z.ZodType<GenerateImageRequest> = z
  .object({
    prompt: z.preprocess(
      (value) => (typeof value === "string" ? value.trim() : value),
      z.string().min(1, "prompt는 필수 입력값입니다."),
    ),
  })
  .strict();

const enhancedPromptSchema: z.ZodType<EnhancedPromptResponse> = z
  .object({
    enhancedPrompt: z.string().min(40).max(1200),
  })
  .strict();

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60_000,
      maxRetries: 2,
    });
  }

  return openaiClient;
}

function getBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  }

  return process.env.BLOB_READ_WRITE_TOKEN;
}

function createErrorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return NextResponse.json(body, { status });
}

function flattenZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function buildEnhancementSystemPrompt() {
  return [
    "You are an expert AI image prompt engineer for performance marketing creatives.",
    "Your task is to convert a Korean marketing image brief into one strong English prompt for image generation.",
    "The result must be optimized for blog thumbnails or hero images.",
    "Always write in English.",
    "Include subject, scene description, lighting, composition, background, mood, and style.",
    "The visual style must feel modern, clean, minimal, premium, and suitable for marketing.",
    "Avoid text-heavy scenes, typography, watermark, signature, logo, and UI mockups unless explicitly requested.",
    "Prefer clear product or brand storytelling with strong visual focus.",
    "Return only JSON matching the provided schema.",
  ].join(" ");
}

function buildEnhancementUserPrompt(prompt: string) {
  return [
    "Transform the following Korean image prompt into a polished English marketing image prompt.",
    "",
    "[Original Korean Prompt]",
    prompt,
    "",
    "[Requirements]",
    "- Optimize for blog thumbnail or hero section usage.",
    "- Make the subject visually clear.",
    "- Include scene, lighting, composition, background, mood, and style.",
    "- Keep it concise but detailed enough for high-quality image generation.",
    "- Explicitly include: no text, no watermark, no logo.",
  ].join("\n");
}

async function enhancePrompt(openai: OpenAI, prompt: string) {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_completion_tokens: 500,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "enhanced_image_prompt",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["enhancedPrompt"],
          properties: {
            enhancedPrompt: {
              type: "string",
              minLength: 40,
              maxLength: 1200,
              description:
                "A single English image generation prompt for a premium marketing visual. Include subject, scene, lighting, composition, mood, style, and explicit exclusions such as no text, no watermark, no logo.",
            },
          },
        },
      },
    },
    messages: [
      {
        role: "system",
        content: buildEnhancementSystemPrompt(),
      },
      {
        role: "user",
        content: buildEnhancementUserPrompt(prompt),
      },
    ],
  });

  const message = completion.choices[0]?.message;

  if (!message) {
    throw new Error("PROMPT_ENHANCEMENT_FAILED");
  }

  if ("refusal" in message && typeof message.refusal === "string") {
    throw new Error("PROMPT_ENHANCEMENT_FAILED");
  }

  if (typeof message.content !== "string" || message.content.trim() === "") {
    throw new Error("PROMPT_ENHANCEMENT_FAILED");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(message.content);
  } catch {
    throw new Error("INVALID_ENHANCED_PROMPT");
  }

  const validated = enhancedPromptSchema.safeParse(parsed);

  if (!validated.success) {
    const error = new Error("INVALID_ENHANCED_PROMPT");
    (error as Error & { details?: unknown }).details = flattenZodIssues(
      validated.error,
    );
    throw error;
  }

  return validated.data.enhancedPrompt.trim();
}

async function saveGeneratedImage(
  imageBase64: string,
): Promise<GenerateImageResponse> {
  let buffer: Buffer;

  try {
    buffer = Buffer.from(imageBase64, "base64");
  } catch {
    throw new Error("IMAGE_UPLOAD_FAILED");
  }

  if (!buffer.length) {
    throw new Error("IMAGE_UPLOAD_FAILED");
  }

  const blob = await put(
    `generated/${Date.now()}-${randomUUID()}.png`,
    buffer,
    {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/png",
      token: getBlobToken(),
    },
  );

  return {
    imageUrl: blob.url,
  };
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return createErrorResponse(
      400,
      "INVALID_JSON",
      "요청 본문이 유효한 JSON 형식이 아닙니다.",
    );
  }

  const parsedInput = generateImageRequestSchema.safeParse(payload);

  if (!parsedInput.success) {
    return createErrorResponse(
      400,
      "INVALID_PAYLOAD",
      "요청 데이터가 유효하지 않습니다.",
      flattenZodIssues(parsedInput.error),
    );
  }

  try {
    const openai = getOpenAIClient();
    const enhancedPrompt = await enhancePrompt(openai, parsedInput.data.prompt);

    const imageResponse = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt: enhancedPrompt,
      size: IMAGE_SIZE,
      quality: IMAGE_QUALITY,
    });

    const imageBase64 = imageResponse.data?.[0]?.b64_json;

    if (!imageBase64) {
      return createErrorResponse(
        502,
        "IMAGE_GENERATION_FAILED",
        "이미지 생성 결과를 받지 못했습니다.",
      );
    }

    const result = await saveGeneratedImage(imageBase64);

    return NextResponse.json<GenerateImageResponse>(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "OPENAI_API_KEY is not configured."
    ) {
      return createErrorResponse(
        500,
        "CONFIGURATION_ERROR",
        "OPENAI_API_KEY 환경 변수가 설정되어 있지 않습니다.",
      );
    }

    if (
      error instanceof Error &&
      error.message === "BLOB_READ_WRITE_TOKEN is not configured."
    ) {
      return createErrorResponse(
        500,
        "CONFIGURATION_ERROR",
        "BLOB_READ_WRITE_TOKEN 환경 변수가 설정되어 있지 않습니다.",
      );
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401 || error.status === 403) {
        return createErrorResponse(
          500,
          "CONFIGURATION_ERROR",
          "OpenAI 인증 또는 권한 설정을 확인해 주세요.",
        );
      }

      if (error.status === 429) {
        return createErrorResponse(
          429,
          "IMAGE_GENERATION_FAILED",
          "요청이 많아 이미지를 생성할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      return createErrorResponse(
        502,
        "IMAGE_GENERATION_FAILED",
        "OpenAI 이미지 생성 호출에 실패했습니다.",
      );
    }

    if (error instanceof Error) {
      if (error.message === "PROMPT_ENHANCEMENT_FAILED") {
        return createErrorResponse(
          502,
          "PROMPT_ENHANCEMENT_FAILED",
          "이미지 프롬프트 보강에 실패했습니다.",
        );
      }

      if (error.message === "INVALID_ENHANCED_PROMPT") {
        return createErrorResponse(
          502,
          "INVALID_ENHANCED_PROMPT",
          "보강된 이미지 프롬프트가 유효하지 않습니다.",
          (error as Error & { details?: unknown }).details,
        );
      }

      if (error.message === "IMAGE_UPLOAD_FAILED") {
        return createErrorResponse(
          500,
          "IMAGE_UPLOAD_FAILED",
          "생성된 이미지를 저장하지 못했습니다.",
        );
      }
    }

    return createErrorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "이미지 생성 중 예기치 않은 오류가 발생했습니다.",
    );
  }
}
