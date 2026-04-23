import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";

type KeywordCategory =
  | "브랜드"
  | "상품"
  | "문제해결"
  | "차별성"
  | "신뢰"
  | "이벤트";

type KeywordIntent = "정보탐색" | "비교검토" | "구매전환";
type KeywordLevel = "높음" | "중간" | "낮음";

export type GenerateBlogRequest = {
  brandName: string;
  productName: string;
  industry: string;
  oneLineDescription: string;
  price?: string;
  differentiation: string;
  trustElements?: string;
  event?: string;
};

export type GenerateBlogResponse = {
  blog: {
    title: string;
    introduction: string;
    sections: {
      heading: string;
      content: string;
    }[];
    conclusion: string;
  };
  keywords: {
    keyword: string;
    category: KeywordCategory;
    intent: KeywordIntent;
    trendLevel: KeywordLevel;
    competition: KeywordLevel;
    score: number;
    reason: string;
  }[];
  socialContents: {
    twitter: string[];
    instagram: string;
    linkedin: string;
  };
  imagePrompt: string;
};

type ApiErrorCode =
  | "INVALID_JSON"
  | "INVALID_PAYLOAD"
  | "CONFIGURATION_ERROR"
  | "EMPTY_MODEL_RESPONSE"
  | "MODEL_REFUSAL"
  | "INVALID_MODEL_JSON"
  | "INVALID_MODEL_SCHEMA"
  | "NON_KOREAN_OUTPUT"
  | "RATE_LIMITED"
  | "OPENAI_AUTH_ERROR"
  | "OPENAI_UPSTREAM_ERROR"
  | "INTERNAL_SERVER_ERROR";

type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

type RawGenerateBlogResponse = {
  blog: {
    title: string;
    introduction: string;
    sections: {
      heading: string;
      content: string;
    }[];
    conclusion: string;
  };
  keywords: {
    keyword: string;
    category: KeywordCategory;
    intent: KeywordIntent;
    trendLevel: KeywordLevel;
    competition: KeywordLevel;
    score: number;
    reason: string;
  }[];
  socialContents: {
    twitter: string[];
    instagram: string;
    linkedin: string;
  };
  imagePrompt: string;
};

const MODEL = "gpt-4.1-mini";
const MIN_KEYWORDS = 8;
const MAX_KEYWORDS = 10;
const TWITTER_POST_COUNT = 3;

const OPENAI_ERROR_MESSAGES: Record<
  Exclude<ApiErrorCode, "INVALID_JSON" | "INVALID_PAYLOAD" | "INTERNAL_SERVER_ERROR">,
  string
> = {
  CONFIGURATION_ERROR: "OpenAI 설정이 올바르지 않습니다.",
  EMPTY_MODEL_RESPONSE: "생성 결과가 비어 있습니다.",
  MODEL_REFUSAL: "AI가 요청을 처리하지 못했습니다.",
  INVALID_MODEL_JSON: "AI 응답 JSON 파싱에 실패했습니다.",
  INVALID_MODEL_SCHEMA: "AI 응답이 요구한 구조와 일치하지 않습니다.",
  NON_KOREAN_OUTPUT: "AI 응답이 한국어 전용 규칙을 충족하지 못했습니다.",
  RATE_LIMITED: "요청이 많아 일시적으로 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  OPENAI_AUTH_ERROR: "OpenAI 인증 또는 권한 설정을 확인해 주세요.",
  OPENAI_UPSTREAM_ERROR: "OpenAI 호출 중 오류가 발생했습니다.",
};

const normalizeRequiredString = (value: unknown) =>
  typeof value === "string" ? value.trim() : value;

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const requiredString = (label: string) =>
  z.preprocess(
    normalizeRequiredString,
    z.string().min(1, `${label}은(는) 필수 입력값입니다.`),
  );

const optionalString = () =>
  z.preprocess(normalizeOptionalString, z.string().min(1).optional());

const generateBlogRequestSchema: z.ZodType<GenerateBlogRequest> = z
  .object({
    brandName: requiredString("brandName"),
    productName: requiredString("productName"),
    industry: requiredString("industry"),
    oneLineDescription: requiredString("oneLineDescription"),
    price: optionalString(),
    differentiation: requiredString("differentiation"),
    trustElements: optionalString(),
    event: optionalString(),
  })
  .strict();

const keywordSchema = z.object({
  keyword: z.string().min(1).max(60),
  category: z.enum(["브랜드", "상품", "문제해결", "차별성", "신뢰", "이벤트"]),
  intent: z.enum(["정보탐색", "비교검토", "구매전환"]),
  trendLevel: z.enum(["높음", "중간", "낮음"]),
  competition: z.enum(["높음", "중간", "낮음"]),
  score: z.number().int().min(0).max(100),
  reason: z.string().min(1).max(200),
});

const rawGenerateBlogResponseSchema: z.ZodType<RawGenerateBlogResponse> = z
  .object({
    blog: z
      .object({
        title: z.string().min(1).max(140),
        introduction: z.string().min(1).max(1500),
        sections: z
          .array(
            z.object({
              heading: z.string().min(1).max(80),
              content: z.string().min(1).max(2000),
            }),
          )
          .min(3)
          .max(5),
        conclusion: z.string().min(1).max(1200),
      })
      .strict(),
    keywords: z.array(keywordSchema).min(1).max(MAX_KEYWORDS),
    socialContents: z
      .object({
        twitter: z.array(z.string().min(1).max(300)).max(TWITTER_POST_COUNT),
        instagram: z.string().min(1).max(1200),
        linkedin: z.string().min(1).max(1500),
      })
      .strict(),
    imagePrompt: z.string().min(1).max(600),
  })
  .strict();

const generateBlogResponseSchema: z.ZodType<GenerateBlogResponse> = z
  .object({
    blog: z
      .object({
        title: z.string().min(1).max(140),
        introduction: z.string().min(1).max(1500),
        sections: z
          .array(
            z.object({
              heading: z.string().min(1).max(80),
              content: z.string().min(1).max(2000),
            }),
          )
          .min(3)
          .max(5),
        conclusion: z.string().min(1).max(1200),
      })
      .strict(),
    keywords: z
      .array(keywordSchema)
      .min(MIN_KEYWORDS)
      .max(MAX_KEYWORDS)
      .superRefine((items, ctx) => {
        const seen = new Set<string>();

        items.forEach((item, index) => {
          const normalized = item.keyword.trim().toLowerCase();

          if (seen.has(normalized)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "keywords에는 중복 키워드를 포함할 수 없습니다.",
              path: [index, "keyword"],
            });
            return;
          }

          seen.add(normalized);
        });
      }),
    socialContents: z
      .object({
        twitter: z
          .array(z.string().min(1).max(300))
          .length(TWITTER_POST_COUNT)
          .superRefine((items, ctx) => {
            const seen = new Set<string>();

            items.forEach((item, index) => {
              const normalized = item.trim();

              if (seen.has(normalized)) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: "twitter 게시글은 서로 달라야 합니다.",
                  path: [index],
                });
                return;
              }

              seen.add(normalized);
            });
          }),
        instagram: z.string().min(1).max(1200),
        linkedin: z.string().min(1).max(1500),
      })
      .strict(),
    imagePrompt: z.string().min(1).max(600),
  })
  .strict();

const responseJsonSchema = {
  name: "generate_blog_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["blog", "keywords", "socialContents", "imagePrompt"],
    properties: {
      blog: {
        type: "object",
        additionalProperties: false,
        required: ["title", "introduction", "sections", "conclusion"],
        properties: {
          title: {
            type: "string",
            minLength: 10,
            maxLength: 140,
          },
          introduction: {
            type: "string",
            minLength: 120,
            maxLength: 1200,
          },
          sections: {
            type: "array",
            minItems: 3,
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["heading", "content"],
              properties: {
                heading: {
                  type: "string",
                  minLength: 6,
                  maxLength: 80,
                },
                content: {
                  type: "string",
                  minLength: 140,
                  maxLength: 1200,
                },
              },
            },
          },
          conclusion: {
            type: "string",
            minLength: 80,
            maxLength: 800,
          },
        },
      },
      keywords: {
        type: "array",
        minItems: 8,
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "keyword",
            "category",
            "intent",
            "trendLevel",
            "competition",
            "score",
            "reason",
          ],
          properties: {
            keyword: {
              type: "string",
              minLength: 2,
              maxLength: 60,
            },
            category: {
              type: "string",
              enum: ["브랜드", "상품", "문제해결", "차별성", "신뢰", "이벤트"],
            },
            intent: {
              type: "string",
              enum: ["정보탐색", "비교검토", "구매전환"],
            },
            trendLevel: {
              type: "string",
              enum: ["높음", "중간", "낮음"],
            },
            competition: {
              type: "string",
              enum: ["높음", "중간", "낮음"],
            },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
            reason: {
              type: "string",
              minLength: 20,
              maxLength: 200,
            },
          },
        },
      },
      socialContents: {
        type: "object",
        additionalProperties: false,
        required: ["twitter", "instagram", "linkedin"],
        properties: {
          twitter: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "string",
              minLength: 30,
              maxLength: 280,
            },
          },
          instagram: {
            type: "string",
            minLength: 80,
            maxLength: 1200,
          },
          linkedin: {
            type: "string",
            minLength: 120,
            maxLength: 1500,
          },
        },
      },
      imagePrompt: {
        type: "string",
        minLength: 40,
        maxLength: 600,
      },
    },
  },
} as const;

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45_000,
      maxRetries: 2,
    });
  }

  return openaiClient;
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

function createStandardOpenAIError(
  status: number,
  code: Exclude<
    ApiErrorCode,
    "INVALID_JSON" | "INVALID_PAYLOAD" | "INTERNAL_SERVER_ERROR"
  >,
  details?: unknown,
) {
  return createErrorResponse(status, code, OPENAI_ERROR_MESSAGES[code], details);
}

function flattenZodIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function containsHangul(value: string) {
  return /[가-힣]/.test(value);
}

function validateKoreanContent(data: GenerateBlogResponse) {
  const proseFields: Array<[path: string, value: string]> = [
    ["blog.title", data.blog.title],
    ["blog.introduction", data.blog.introduction],
    ["blog.conclusion", data.blog.conclusion],
    ["socialContents.instagram", data.socialContents.instagram],
    ["socialContents.linkedin", data.socialContents.linkedin],
    ["imagePrompt", data.imagePrompt],
  ];

  data.blog.sections.forEach((section, index) => {
    proseFields.push(
      [`blog.sections.${index}.heading`, section.heading],
      [`blog.sections.${index}.content`, section.content],
    );
  });

  data.keywords.forEach((keyword, index) => {
    proseFields.push(
      [`keywords.${index}.keyword`, keyword.keyword],
      [`keywords.${index}.reason`, keyword.reason],
    );
  });

  data.socialContents.twitter.forEach((post, index) => {
    proseFields.push([`socialContents.twitter.${index}`, post]);
  });

  const invalidPaths = proseFields
    .filter(([, value]) => !containsHangul(value))
    .map(([path]) => path);

  if (invalidPaths.length > 0) {
    throw new Error(
      `Generated content must be Korean. Invalid fields: ${invalidPaths.join(", ")}`,
    );
  }
}

function createSystemPrompt() {
  return [
    "당신은 한국 SaaS 기업을 위한 퍼포먼스 마케팅 콘텐츠 전략가이자 숙련된 한국어 카피라이터다.",
    "구조화된 사업 정보를 바탕으로 실제 서비스에 바로 활용 가능한 수준의 한국어 마케팅 블로그, 키워드 추천, 소셜 콘텐츠, 이미지 프롬프트를 만든다.",
    "반드시 한국어로만 작성하되 브랜드명과 상품명은 입력된 원문 표기를 유지할 수 있다.",
    "반드시 JSON만 반환하고, 마크다운 코드 펜스나 설명 문장을 포함하지 마라.",
    "출력은 제공된 JSON 스키마와 정확히 일치해야 하며 추가 필드를 만들지 마라.",
    "문체는 자연스럽고 설득력 있어야 하며, 과장 광고, 번역투, 반복 패턴, AI 티 나는 문장을 피해야 한다.",
    "도입부는 문제 제기 → 공감 → 해결책 흐름으로 작성하라.",
    "결론은 CTA를 포함하되 과장되지 않게 작성하라.",
    "키워드는 실시간 검색량 데이터가 아니라 실무적 추천 키워드다.",
    "socialContents는 채널별 톤을 구분해서 작성하라.",
    "imagePrompt는 별도 이미지 생성 API용 한국어 프롬프트이며 텍스트 삽입 지시는 포함하지 마라.",
  ].join(" ");
}

function createUserPrompt(input: GenerateBlogRequest) {
  const lines = [
    "다음 사업 정보를 기반으로 한국어 마케팅 블로그 콘텐츠를 생성하라.",
    "",
    "[사업 정보]",
    `브랜드명: ${input.brandName}`,
    `상품명: ${input.productName}`,
    `산업군: ${input.industry}`,
    `한 줄 설명: ${input.oneLineDescription}`,
    `차별점: ${input.differentiation}`,
    `가격 정보: ${input.price ?? "미입력"}`,
    `신뢰 요소: ${input.trustElements ?? "미입력"}`,
    `이벤트/프로모션: ${input.event ?? "미입력"}`,
    "",
    "[생성 기준]",
    "1. blog.title은 SEO를 고려한 자연스러운 한국어 제목이어야 한다.",
    "2. blog.introduction은 문제 제기 → 공감 → 해결책 흐름을 따라야 한다.",
    "3. blog.sections는 3~5개이며 서로 중복 없이 논리적으로 전개해야 한다.",
    "4. keywords는 실무형 추천 키워드로 작성하라.",
    "5. twitter는 서로 다른 3개의 짧은 홍보 문구로 작성하라.",
    "6. 모든 설명성 문장은 한국어로 작성하라.",
  ];

  return lines.join("\n");
}

function createFallbackKeyword(
  request: GenerateBlogRequest,
  seed: number,
): GenerateBlogResponse["keywords"][number] {
  const candidates: Array<{
    keyword: string;
    category: KeywordCategory;
    intent: KeywordIntent;
    trendLevel: KeywordLevel;
    competition: KeywordLevel;
    score: number;
    reason: string;
  }> = [
    {
      keyword: `${request.brandName} ${request.productName}`,
      category: "브랜드",
      intent: "비교검토",
      trendLevel: "중간",
      competition: "중간",
      score: 86,
      reason: "브랜드와 상품명을 함께 찾는 사용자는 실제 비교나 도입 검토 단계일 가능성이 높습니다.",
    },
    {
      keyword: `${request.productName} 추천`,
      category: "상품",
      intent: "비교검토",
      trendLevel: "높음",
      competition: "높음",
      score: 83,
      reason: "추천 키워드는 구매 전 후보를 좁히는 탐색 상황과 잘 맞아 전환 가능성이 높습니다.",
    },
    {
      keyword: `${request.industry} 문제 해결`,
      category: "문제해결",
      intent: "정보탐색",
      trendLevel: "중간",
      competition: "중간",
      score: 80,
      reason: "문제 해결형 키워드는 검색 초기 단계 유입을 확보하고 콘텐츠 신뢰도를 높이는 데 유리합니다.",
    },
    {
      keyword: `${request.productName} 차별점`,
      category: "차별성",
      intent: "비교검토",
      trendLevel: "중간",
      competition: "낮음",
      score: 82,
      reason: "차별점 중심 검색은 대안을 비교하는 사용자에게 핵심 선택 기준을 빠르게 제시합니다.",
    },
    {
      keyword: `${request.brandName} 후기`,
      category: "신뢰",
      intent: "비교검토",
      trendLevel: "높음",
      competition: "중간",
      score: 78,
      reason: "후기 계열 키워드는 구매 직전의 신뢰 검증 수요와 자연스럽게 연결됩니다.",
    },
    {
      keyword: `${request.productName} 이벤트`,
      category: "이벤트",
      intent: "구매전환",
      trendLevel: "중간",
      competition: "낮음",
      score: 76,
      reason: "이벤트 키워드는 즉시 행동을 유도하기 쉬워 전환 마감 장치로 활용하기 좋습니다.",
    },
    {
      keyword: `${request.oneLineDescription.split(" ").slice(0, 3).join(" ")} 솔루션`,
      category: "상품",
      intent: "정보탐색",
      trendLevel: "중간",
      competition: "낮음",
      score: 74,
      reason: "핵심 설명 문구를 반영한 키워드는 문제 인식 단계의 검색 맥락과 맞물리기 좋습니다.",
    },
    {
      keyword: `${request.industry} ${request.productName}`,
      category: "상품",
      intent: "비교검토",
      trendLevel: "중간",
      competition: "중간",
      score: 81,
      reason: "산업군과 상품명을 함께 넣으면 더 구체적인 비교 검색 수요를 잡기 쉽습니다.",
    },
    {
      keyword: `${request.brandName} 도입`,
      category: "브랜드",
      intent: "구매전환",
      trendLevel: "낮음",
      competition: "낮음",
      score: 75,
      reason: "도입 키워드는 실제 전환 직전 단계에서 검토하는 사용자의 니즈를 반영합니다.",
    },
    {
      keyword: `${request.productName} 가격`,
      category: "상품",
      intent: "구매전환",
      trendLevel: "높음",
      competition: "높음",
      score: 79,
      reason: "가격 키워드는 구매 결정 직전 단계에서 높은 의도를 가진 사용자를 모읍니다.",
    },
  ];

  return candidates[seed % candidates.length];
}

function normalizeKeywords(
  rawKeywords: RawGenerateBlogResponse["keywords"],
  request: GenerateBlogRequest,
) {
  const result: GenerateBlogResponse["keywords"] = [];
  const seen = new Set<string>();

  for (const item of rawKeywords) {
    const normalizedKeyword = item.keyword.trim();
    const key = normalizedKeyword.toLowerCase();

    if (!normalizedKeyword || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      ...item,
      keyword: normalizedKeyword,
      reason: item.reason.trim(),
      score: Math.max(0, Math.min(100, Math.round(item.score))),
    });
  }

  let seed = 0;
  while (result.length < MIN_KEYWORDS) {
    const candidate = createFallbackKeyword(request, seed);
    const key = candidate.keyword.trim().toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      result.push(candidate);
    }

    seed += 1;
  }

  return result.slice(0, MAX_KEYWORDS);
}

function createFallbackTwitterPosts(
  request: GenerateBlogRequest,
  blogTitle: string,
) {
  return [
    `${request.brandName}의 ${request.productName}, ${request.oneLineDescription}이 필요한 이유를 블로그로 정리했습니다. ${blogTitle}`,
    `${request.industry}에서 더 분명한 선택 기준이 필요하다면 ${request.productName}의 차별점과 활용 포인트를 확인해 보세요.`,
    `${request.productName} 도입을 고민 중이라면 기능 설명보다 중요한 건 실제 문제 해결력입니다. 핵심 내용을 한 번에 정리했습니다.`,
  ].map((post) => post.slice(0, 280));
}

function normalizeTwitterPosts(
  twitter: string[],
  request: GenerateBlogRequest,
  blogTitle: string,
) {
  const uniquePosts: string[] = [];
  const seen = new Set<string>();

  for (const post of twitter) {
    const normalized = post.trim();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    uniquePosts.push(normalized.slice(0, 280));
  }

  if (uniquePosts.length < TWITTER_POST_COUNT) {
    for (const fallback of createFallbackTwitterPosts(request, blogTitle)) {
      if (uniquePosts.length >= TWITTER_POST_COUNT) {
        break;
      }

      if (seen.has(fallback)) {
        continue;
      }

      seen.add(fallback);
      uniquePosts.push(fallback);
    }
  }

  return uniquePosts.slice(0, TWITTER_POST_COUNT);
}

function normalizeModelOutput(
  raw: RawGenerateBlogResponse,
  request: GenerateBlogRequest,
): GenerateBlogResponse {
  const normalized: GenerateBlogResponse = {
    blog: {
      title: raw.blog.title.trim(),
      introduction: raw.blog.introduction.trim(),
      sections: raw.blog.sections.map((section) => ({
        heading: section.heading.trim(),
        content: section.content.trim(),
      })),
      conclusion: raw.blog.conclusion.trim(),
    },
    keywords: normalizeKeywords(raw.keywords, request),
    socialContents: {
      twitter: normalizeTwitterPosts(
        raw.socialContents.twitter,
        request,
        raw.blog.title.trim(),
      ),
      instagram: raw.socialContents.instagram.trim(),
      linkedin: raw.socialContents.linkedin.trim(),
    },
    imagePrompt: raw.imagePrompt.trim(),
  };

  return generateBlogResponseSchema.parse(normalized);
}

function parseModelOutput(
  content: string,
  request: GenerateBlogRequest,
): GenerateBlogResponse {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("INVALID_MODEL_JSON");
  }

  const rawResult = rawGenerateBlogResponseSchema.safeParse(parsedJson);

  if (!rawResult.success) {
    const error = new Error("INVALID_MODEL_SCHEMA");
    (error as Error & { details?: unknown }).details = flattenZodIssues(
      rawResult.error,
    );
    throw error;
  }

  try {
    return normalizeModelOutput(rawResult.data, request);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const schemaError = new Error("INVALID_MODEL_SCHEMA");
      (schemaError as Error & { details?: unknown }).details = flattenZodIssues(
        error,
      );
      throw schemaError;
    }

    throw error;
  }
}

// Example request body:
// {
//   "brandName": "나인위닛",
//   "productName": "블로그 자동 생성기",
//   "industry": "마케팅 SaaS",
//   "oneLineDescription": "브랜드 정보를 기반으로 마케팅용 블로그 콘텐츠를 자동 생성하는 서비스",
//   "price": "월 49,000원",
//   "differentiation": "광고 문구가 아니라 실제 검색 유입과 전환을 고려한 한국어 콘텐츠 품질",
//   "trustElements": "도입 기업 사례, 운영팀 콘텐츠 검수 프로세스",
//   "event": "첫 결제 20% 할인"
// }
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

  const parsedInput = generateBlogRequestSchema.safeParse(payload);

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
    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.8,
      max_completion_tokens: 4_000,
      response_format: {
        type: "json_schema",
        json_schema: responseJsonSchema,
      },
      messages: [
        {
          role: "system",
          content: createSystemPrompt(),
        },
        {
          role: "user",
          content: createUserPrompt(parsedInput.data),
        },
      ],
    });

    const message = completion.choices[0]?.message;

    if (!message) {
      return createStandardOpenAIError(502, "EMPTY_MODEL_RESPONSE");
    }

    if ("refusal" in message && typeof message.refusal === "string") {
      return createStandardOpenAIError(502, "MODEL_REFUSAL", {
        refusal: message.refusal,
      });
    }

    if (typeof message.content !== "string" || message.content.trim() === "") {
      return createStandardOpenAIError(502, "EMPTY_MODEL_RESPONSE");
    }

    const normalizedResult = parseModelOutput(message.content, parsedInput.data);
    validateKoreanContent(normalizedResult);

    return NextResponse.json(normalizedResult);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "OPENAI_API_KEY is not configured."
    ) {
      return createStandardOpenAIError(500, "CONFIGURATION_ERROR");
    }

    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API error", {
        status: error.status,
        requestId: error.requestID,
        name: error.name,
        message: error.message,
      });

      if (error.status === 429) {
        return createStandardOpenAIError(429, "RATE_LIMITED");
      }

      if (error.status === 401 || error.status === 403) {
        return createStandardOpenAIError(500, "OPENAI_AUTH_ERROR");
      }

      return createStandardOpenAIError(502, "OPENAI_UPSTREAM_ERROR", {
        requestId: error.requestID,
      });
    }

    if (error instanceof Error) {
      console.error("Generate blog route error", error);

      if (error.message === "INVALID_MODEL_JSON") {
        return createStandardOpenAIError(502, "INVALID_MODEL_JSON");
      }

      if (error.message === "INVALID_MODEL_SCHEMA") {
        return createStandardOpenAIError(
          502,
          "INVALID_MODEL_SCHEMA",
          (error as Error & { details?: unknown }).details,
        );
      }

      if (error.message.startsWith("Generated content must be Korean.")) {
        return createStandardOpenAIError(502, "NON_KOREAN_OUTPUT");
      }
    }

    console.error("Unexpected generate blog route error", error);

    return createErrorResponse(
      500,
      "INTERNAL_SERVER_ERROR",
      "블로그 콘텐츠 생성 중 예기치 않은 오류가 발생했습니다.",
    );
  }
}
