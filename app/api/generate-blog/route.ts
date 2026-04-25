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
    twitter: string;
    instagram: string;
    threads: string;
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
    twitter: string;
    instagram: string;
    threads: string;
  };
  imagePrompt: string;
};

const MODEL = "gpt-4.1-mini";
const MIN_KEYWORDS = 8;
const MAX_KEYWORDS = 10;

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
        twitter: z.string().min(1).max(1200),
        instagram: z.string().min(1).max(1200),
        threads: z.string().min(1).max(1500),
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
        twitter: z.string().min(1).max(1200),
        instagram: z.string().min(1).max(1200),
        threads: z.string().min(1).max(1500),
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
        required: ["twitter", "instagram", "threads"],
        properties: {
          twitter: {
            type: "string",
            minLength: 80,
            maxLength: 1200,
          },
          instagram: {
            type: "string",
            minLength: 80,
            maxLength: 1200,
          },
          threads: {
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
    ["socialContents.twitter", data.socialContents.twitter],
    ["socialContents.instagram", data.socialContents.instagram],
    ["socialContents.threads", data.socialContents.threads],
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
    "당신은 한국 시장에 강한 시니어 마케팅 카피라이터이자 SEO 전략가이며, 실제 전환을 만드는 롱폼 블로그를 자주 집필하는 숙련된 한국어 콘텐츠 디렉터다.",
    "구조화된 사업 정보를 바탕으로 검색 유입, 신뢰 형성, 구매 검토를 동시에 고려한 고품질 한국어 블로그 콘텐츠, 추천 키워드, 소셜 콘텐츠, 이미지 프롬프트를 만든다.",
    "반드시 한국어로만 작성하되 브랜드명과 상품명은 입력된 원문 표기를 유지할 수 있다.",
    "반드시 JSON만 반환하고, 마크다운 코드 펜스나 설명 문장, 사족, 메모를 포함하지 마라.",
    "출력은 제공된 JSON 스키마와 정확히 일치해야 하며 추가 필드를 만들지 마라.",
    "핵심 목표는 짧은 요약이 아니라 실제 블로그처럼 읽히는 깊이 있는 장문 콘텐츠다.",
    "문체는 자연스럽고 설득력 있어야 하며, 과장 광고, 번역투, 상투적 문장, 반복 패턴, AI 티 나는 표현을 피해야 한다.",
    "문장을 매번 비슷하게 시작하지 말고 리듬을 바꿔라. 짧은 문장과 긴 문장을 적절히 섞고, 현실적인 상황 묘사와 구체적인 예시를 넣어라.",
    "다음과 같은 얕고 단조로운 표현은 피하라: '이 제품은...', '많은 사람들이...', '효율적입니다', '도움이 됩니다' 같은 빈 문장.",
    "독자가 실제로 겪는 상황, 망설이는 이유, 기존 방식의 피로감, 도입 후 기대되는 변화가 선명하게 느껴지도록 써라.",
    "도입부는 문제 제기 → 공감 → 현실적인 상황 설명 → 해결책 예고 흐름으로 작성하라.",
    "본문 섹션은 서로 역할이 겹치지 않게 전개하고, 문제 정의, 기존 대안의 한계, 상품 소개, 차별점, 기대 변화, 신뢰 또는 이벤트 중 적절한 흐름으로 구성하라.",
    "각 섹션은 설명만 하지 말고 왜 중요한지, 어떤 장면에서 체감되는지, 어떤 선택 기준으로 이어지는지까지 풀어 써라.",
    "결론은 핵심 가치를 다시 묶고 신뢰를 보강하며, 부담스럽지 않은 소프트 CTA로 마무리하라.",
    "키워드는 실시간 검색량 데이터가 아니라 실무적 추천 키워드다. 중복 없이 다양하게 제시하라.",
    "socialContents는 채널별 톤을 분명히 구분하라. 절대 한 줄 요약처럼 쓰지 말고, 그대로 복사해 게시할 수 있는 완성형 SNS 문안으로 작성하라.",
    "Instagram은 실제 프로모션 캡션처럼 보여야 한다. 첫 줄은 자연스러운 이모지 훅으로 시작하고, 이어서 짧은 효익 중심 본문을 쓴 뒤, 이모지가 포함된 3~5개의 신뢰 또는 효익 포인트를 줄바꿈으로 정리하고, 부드러운 CTA와 5~10개의 해시태그로 마무리하라.",
    "Instagram은 반드시 여러 줄로 작성하고, trustElements가 있으면 자연스럽게 녹이며, event가 있을 때만 혜택 문구를 포함하라. event가 없으면 존재하지 않는 이벤트를 만들지 마라.",
    "Twitter는 배열이 아니라 하나의 멀티라인 게시글 문자열로 작성하라. 첫 줄은 이모지가 포함된 짧은 훅, 이어지는 2~3줄은 짧은 본문, 필요 시 1~2개의 효익 줄을 추가하고, 부드러운 CTA와 2~5개의 해시태그로 마무리하라.",
    "Twitter는 반드시 여러 줄이어야 하며, 친구에게 추천하듯 친근하고 대화하듯 써라. 한 문장으로 끝내지 말고 실제 입력값을 반영하라.",
    "Threads는 Twitter보다 조금 더 길고, 광고 문구보다 대화에 가까운 흐름으로 작성하라. 공감되는 도입, 문제나 맥락, 해결책 소개, 기대되는 변화, 부드러운 CTA를 자연스럽게 이어라.",
    "Threads는 지나치게 판촉적이면 안 된다. 스토리텔링 느낌을 유지하고, 필요하면 2~5개의 해시태그를 덧붙여도 된다.",
    "imagePrompt는 별도 이미지 생성 API용 한국어 프롬프트이며 텍스트 삽입 지시는 포함하지 마라.",
    "절대 요약하지 마라. 절대 불필요하게 압축하지 마라. 가능한 한 스키마의 길이 상한에 가깝게 풍부하게 작성하라.",
    "초안을 만든 뒤 스스로 점검하라. 내용이 짧거나 섹션 수가 부족하거나 설명 밀도가 낮다면 내부적으로 더 확장한 후 최종 JSON만 반환하라.",
    "특히 socialContents는 짧은 한 문장으로 끝내지 마라. 준비되지 않은 초안이 아니라 즉시 사용할 수 있는 게시글 품질로 완성하라.",
  ].join(" ");
}

function createUserPrompt(input: GenerateBlogRequest) {
  const lines = [
    "다음 사업 정보를 기반으로 실제 블로그에 게시해도 어색하지 않은 수준의 한국어 롱폼 마케팅 콘텐츠를 생성하라.",
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
    "1. blog.title은 SEO를 고려한 자연스러운 한국어 제목으로 작성하라.",
    "브랜드명, 상품명, 핵심 효익이 자연스럽게 드러나야 하며 과도한 낚시 표현은 피하라.",
    "2. blog.introduction은 150~250단어에 가깝게 충분히 길고 밀도 있게 작성하라.",
    "문제 제기 → 공감 → 현실적인 상황 설명 → 해결책 예고 흐름을 지키고, 블로그 서론처럼 읽혀야 한다.",
    "3. blog.sections는 반드시 4~5개로 작성하라.",
    "각 섹션은 heading이 분명해야 하며, content는 150~300단어에 가깝게 충분히 길게 작성하라.",
    "각 섹션에는 실제 업무나 일상에서 마주치는 장면, 구체적 설명, 독자가 체감할 이점이 함께 들어가야 한다.",
    "섹션 전개는 다음 순서를 우선 참고하되 입력 정보에 맞게 자연스럽게 조정하라.",
    "문제의 본질 → 기존 방식이 실패하는 이유 → 상품/서비스 소개 → 차별점의 실제 의미 → 도입 후 기대 변화 → 신뢰 요소 또는 이벤트.",
    "4. 모든 본문은 문장 길이와 호흡을 다양하게 조절하라.",
    "같은 구조를 반복하지 말고, 현실적인 사례, 망설임, 비교 포인트, 선택 이유를 섞어서 진짜 블로그처럼 써라.",
    "5. conclusion은 120~200단어에 가깝게 작성하라.",
    "핵심 가치를 다시 정리하고 신뢰를 강화하며, 부담스럽지 않은 CTA로 마무리하라.",
    "6. keywords는 10개로 작성하라.",
    "브랜드, 상품, 문제해결, 차별성, 신뢰, 이벤트 범주를 고르게 활용하고 중복 없이 현실적인 검색 의도를 반영하라.",
    "7. socialContents 작성 기준:",
    "twitter는 string 하나로 작성하라. 배열이 아니다.",
    "twitter는 반드시 여러 줄의 완성형 게시글이어야 하며, 이모지가 포함된 훅 1줄, 짧은 본문 2~3줄, 필요 시 효익 줄 1~2개, 부드러운 CTA, 2~5개의 해시태그를 포함하라.",
    "twitter는 친근하고 대화하듯 써야 하며, 한 줄 요약처럼 끝내지 마라.",
    "instagram은 짧은 문장 하나가 아니라 실제 복붙 가능한 완성형 캡션으로 작성하라.",
    "첫 줄은 이모지가 포함된 훅으로 시작하고, 이어서 효익 중심의 짧은 본문을 2~3줄 내외로 작성하라.",
    "그 다음 줄바꿈 후, 이모지가 포함된 3~5개의 불릿형 포인트를 작성하라. 각 줄은 신뢰 요소, 차별점, 효익, 이벤트 중 실제 입력값에 맞는 내용을 반영하라.",
    "trustElements가 있으면 불릿이나 본문에 자연스럽게 녹여라.",
    "event가 있으면 불릿 또는 CTA 앞부분에 자연스럽게 녹여라. event가 없으면 혜택을 지어내지 마라.",
    "마지막에는 부드러운 CTA 1~2문장을 넣고, 5~10개의 관련 해시태그를 별도 줄에 작성하라.",
    "instagram은 반드시 여러 줄이어야 하며, 문맥 없이 짧게 끝내지 마라.",
    "threads는 string 하나로 작성하라.",
    "threads는 twitter보다 조금 더 길고, 대화형이며 자연스럽게 흐르는 멀티라인 게시글이어야 한다.",
    "공감되는 시작 → 문제/맥락 → 해결책 소개 → 기대 효과 → 부드러운 CTA 순으로 자연스럽게 이어라.",
    "threads는 광고 문구처럼 몰아붙이지 말고, 스토리텔링 느낌과 편안한 말투를 유지하라.",
    "필요하면 마지막에 2~5개의 해시태그를 붙여도 되지만, 전체 톤을 해치지 않게 작성하라.",
    "8. 모든 설명성 문장은 반드시 한국어로 작성하라.",
    "9. 각 플랫폼에서 같은 문장을 재사용하지 마라. 구조와 톤을 플랫폼 특성에 맞게 분리하라.",
    "10. socialContents는 요약본처럼 쓰지 마라. 한 줄 문구처럼 축약하지 마라. 그대로 게시 가능한 문장 완성도를 유지하라.",
    "11. 최종 JSON을 반환하기 전, instagram, twitter, threads가 모두 여러 줄인지 스스로 다시 확인하라.",
    "12. 각 socialContents 항목은 실제 입력값을 반영해야 하며, 입력되지 않은 신뢰 요소나 이벤트를 임의로 추가하지 마라.",
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

function createFallbackTwitterPost(
  request: GenerateBlogRequest,
  blogTitle: string,
) {
  return [
    `✨ ${request.productName}, 지금 필요한 선택일까요?`,
    "",
    `${request.oneLineDescription}`,
    `${request.industry}에서 더 분명한 기준이 필요할 때 참고할 포인트를 담았습니다.`,
    "",
    `💫 ${request.differentiation}`,
    request.event ? `🎁 ${request.event}` : `✅ ${request.brandName}의 핵심 강점을 한 번에 확인해보세요.`,
    "",
    `${blogTitle} 지금 확인해보세요 👇`,
    `#${request.brandName.replace(/\s+/g, "")} #${request.productName.replace(/\s+/g, "")} #${request.industry.replace(/\s+/g, "")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1200);
}

function createFallbackThreadsPost(
  request: GenerateBlogRequest,
) {
  return [
    `${request.industry} 관련해서 이것저것 비교해보다 보면, 결국 중요한 건 설명이 아니라 실제로 어떤 문제를 풀어주는지더라고요.`,
    "",
    `${request.productName}는 ${request.oneLineDescription}에 초점을 둔 선택지입니다.`,
    `특히 ${request.differentiation} 같은 포인트는 검토 단계에서 꽤 크게 다가옵니다.`,
    request.trustElements
      ? `${request.trustElements} 같은 요소가 있다면 더 안심하고 살펴볼 이유가 생기고요.`
      : `${request.brandName}가 어떤 기준으로 차별화를 만드는지 천천히 확인해볼 만합니다.`,
    "",
    `${request.productName}가 내 상황에 맞는지 부담 없이 살펴보는 것부터 시작해보세요.`,
    `#${request.brandName.replace(/\s+/g, "")} #${request.productName.replace(/\s+/g, "")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 1500);
}

function normalizeSocialPost(
  value: string,
  fallback: string,
  maxLength: number,
) {
  const normalized = value.trim();

  if (!normalized) {
    return fallback.slice(0, maxLength);
  }

  return normalized.slice(0, maxLength);
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
      twitter: normalizeSocialPost(
        raw.socialContents.twitter,
        createFallbackTwitterPost(request, raw.blog.title.trim()),
        1200,
      ),
      instagram: raw.socialContents.instagram.trim(),
      threads: normalizeSocialPost(
        raw.socialContents.threads,
        createFallbackThreadsPost(request),
        1500,
      ),
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
      max_completion_tokens: 8_000,
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
