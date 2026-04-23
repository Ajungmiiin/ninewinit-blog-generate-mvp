# API 문서

## Overview

이 프로젝트의 API는 두 단계로 구성됩니다.

1. `POST /api/generate-blog`
   브랜드/상품 정보를 기반으로 블로그 콘텐츠, 키워드, 소셜 문구, 이미지 생성용 `imagePrompt`를 생성합니다.
2. `POST /api/generate-image`
   `imagePrompt`를 기반으로 이미지를 생성하고 `imageUrl`을 반환합니다.

### 권장 호출 흐름

```txt
POST /api/generate-blog
-> imagePrompt 추출
-> POST /api/generate-image
-> imageUrl 사용
```

---

## POST /api/generate-blog

### 설명

브랜드 및 상품 정보를 입력받아 아래 데이터를 생성합니다.

- 블로그 제목/도입부/본문/결론
- 추천 키워드
- 소셜 콘텐츠
- 이미지 생성용 프롬프트

### Endpoint

```txt
POST /api/generate-blog
```

### Request Schema

```ts
type GenerateBlogRequest = {
  brandName: string;
  productName: string;
  industry: string;
  oneLineDescription: string;
  price?: string;
  differentiation: string;
  trustElements?: string;
  event?: string;
};
```

### 필수 필드

- `brandName`
- `productName`
- `industry`
- `oneLineDescription`
- `differentiation`

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `brandName` | `string` | O | 브랜드명 |
| `productName` | `string` | O | 상품/서비스명 |
| `industry` | `string` | O | 산업군 |
| `oneLineDescription` | `string` | O | 한 줄 설명 |
| `price` | `string` | X | 가격 정보 |
| `differentiation` | `string` | O | 차별점 |
| `trustElements` | `string` | X | 신뢰 요소 |
| `event` | `string` | X | 이벤트/프로모션 정보 |

### 요청 규칙

- 모든 문자열은 서버에서 `trim` 처리됩니다.

### Fetch 예시

```ts
const response = await fetch("/api/generate-blog", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    brandName: "나인위닛",
    productName: "블로그 자동 생성기",
    industry: "마케팅 SaaS",
    oneLineDescription: "브랜드 정보를 기반으로 마케팅용 블로그 콘텐츠를 자동 생성하는 서비스",
    price: "월 49,000원",
    differentiation: "실제 검색 유입과 전환을 고려한 한국어 콘텐츠 품질",
    trustElements: "도입 기업 사례, 운영팀 검수 프로세스",
    event: "첫 결제 20% 할인"
  })
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error?.message ?? "블로그 생성에 실패했습니다.");
}
```

### Response Schema

```ts
type GenerateBlogResponse = {
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
    category:
      | "브랜드"
      | "상품"
      | "문제해결"
      | "차별성"
      | "신뢰"
      | "이벤트";
    intent: "정보탐색" | "비교검토" | "구매전환";
    trendLevel: "높음" | "중간" | "낮음";
    competition: "높음" | "중간" | "낮음";
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
```

### 응답 필드 설명

| 필드 | 타입 | 설명 |
|---|---|---|
| `blog` | `object` | 블로그 본문 데이터 |
| `blog.title` | `string` | 블로그 제목 |
| `blog.introduction` | `string` | 도입부 |
| `blog.sections` | `Array<{ heading: string; content: string }>` | 본문 섹션 목록 |
| `blog.conclusion` | `string` | 결론 및 CTA |
| `keywords` | `array` | 추천 키워드 목록 |
| `socialContents.twitter` | `string[]` | X/Twitter 문구 3개 |
| `socialContents.instagram` | `string` | 인스타그램 캡션 |
| `socialContents.linkedin` | `string` | 링크드인 게시글 |
| `imagePrompt` | `string` | 이미지 생성 API에 전달할 프롬프트 |

### 응답 예시

```json
{
  "blog": {
    "title": "마케팅 SaaS 도입 전, 블로그 자동 생성기가 필요한 이유",
    "introduction": "콘텐츠 마케팅은 꾸준함이 중요하지만 실제 운영에서는 기획과 작성에 많은 시간이 들어갑니다. 특히 검색 유입까지 고려한 글을 안정적으로 발행하는 일은 더 어렵습니다. 이런 문제를 줄이기 위해 브랜드 정보만으로 실무형 콘텐츠를 빠르게 만드는 방식이 필요합니다.",
    "sections": [
      {
        "heading": "콘텐츠 제작이 느려지는 가장 큰 이유",
        "content": "대부분의 팀은 아이디어 수집, 초안 작성, SEO 반영까지 여러 단계를 수작업으로 처리합니다. 이 과정에서 일정이 밀리고 발행 주기가 끊기기 쉽습니다."
      },
      {
        "heading": "브랜드 톤을 유지하면서 생산성을 높이는 방법",
        "content": "브랜드 정보와 핵심 차별점을 구조화해 입력하면 반복 작업을 줄이면서도 일관된 톤의 콘텐츠를 만들 수 있습니다."
      },
      {
        "heading": "검색 유입과 전환까지 고려한 활용 포인트",
        "content": "단순한 문장 생성보다 중요한 것은 검색 의도에 맞는 구조와 전환을 유도하는 메시지 설계입니다. 이를 기준으로 콘텐츠를 운영하면 성과 연결성이 높아집니다."
      }
    ],
    "conclusion": "콘텐츠 운영 속도와 품질을 함께 잡고 싶다면, 반복적인 작성 과정을 줄이는 방식부터 점검해 보세요. 지금 필요한 입력 정보부터 정리해 실제 운영에 맞는 흐름을 만들어보는 것이 좋습니다."
  },
  "keywords": [
    {
      "keyword": "나인위닛 블로그 자동 생성기",
      "category": "브랜드",
      "intent": "비교검토",
      "trendLevel": "중간",
      "competition": "중간",
      "score": 86,
      "reason": "브랜드와 상품명을 함께 찾는 사용자는 실제 도입 검토 단계일 가능성이 높습니다."
    }
  ],
  "socialContents": {
    "twitter": [
      "브랜드 정보만 입력하면 실무형 블로그 초안을 빠르게 정리할 수 있습니다.",
      "검색 유입과 전환까지 고려한 콘텐츠 운영, 더 단순하게 시작해 보세요.",
      "반복적인 글쓰기 작업을 줄이고 발행 속도를 높이는 방법을 정리했습니다."
    ],
    "instagram": "콘텐츠 운영이 늘 밀린다면, 중요한 건 더 많이 쓰는 것이 아니라 더 빠르게 정리할 수 있는 흐름입니다. 브랜드 정보 기반으로 실무형 블로그 초안을 만드는 방법을 확인해 보세요.",
    "linkedin": "콘텐츠 마케팅 운영에서 가장 큰 병목은 작성 자체보다 구조화되지 않은 기획과 반복 작업입니다. 브랜드 정보 기반의 자동화 흐름을 활용하면 발행 속도와 일관성을 함께 관리할 수 있습니다."
  },
  "imagePrompt": "프리미엄 마케팅 SaaS 브랜드를 위한 현대적인 블로그 히어로 이미지, 미니멀한 작업 공간, 깔끔한 화면 구성, 부드러운 자연광, 세련된 블루 그레이 톤, 정돈된 데스크와 디지털 워크플로우, 프리미엄하고 모던한 분위기, 텍스트 없음, 워터마크 없음"
}
```

### Error Handling

#### 400 예시

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "요청 데이터가 유효하지 않습니다.",
    "details": [
      {
        "path": "brandName",
        "message": "brandName은(는) 필수 입력값입니다."
      }
    ]
  }
}
```

#### 500 예시

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "블로그 콘텐츠 생성 중 예기치 않은 오류가 발생했습니다."
  }
}
```

#### 자주 사용하는 에러 코드

| Status | Code | 설명 |
|---|---|---|
| `400` | `INVALID_JSON` | JSON 형식 오류 |
| `400` | `INVALID_PAYLOAD` | 필수값 누락 또는 형식 오류 |
| `429` | `RATE_LIMITED` | 요청 과다 |
| `500` | `CONFIGURATION_ERROR` | 서버 설정 오류 |
| `502` | `EMPTY_MODEL_RESPONSE` | 생성 결과 없음 |
| `502` | `INVALID_MODEL_JSON` | 응답 JSON 파싱 실패 |
| `502` | `INVALID_MODEL_SCHEMA` | 응답 구조 불일치 |
| `502` | `NON_KOREAN_OUTPUT` | 응답 규칙 미충족 |
| `502` | `OPENAI_AUTH_ERROR` | 인증/권한 오류 |
| `502` | `OPENAI_UPSTREAM_ERROR` | 외부 API 호출 오류 |

---

## POST /api/generate-image

### 설명

이미지 생성용 프롬프트를 받아 이미지를 생성하고 최종 이미지 URL을 반환합니다.

### Endpoint

```txt
POST /api/generate-image
```

### Request Schema

```ts
type GenerateImageRequest = {
  prompt: string;
};
```

### 필수 필드

- `prompt`

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `prompt` | `string` | O | 이미지 생성용 프롬프트 |

### Fetch 예시

```ts
const response = await fetch("/api/generate-image", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: "프리미엄 마케팅 SaaS 브랜드를 위한 현대적인 블로그 히어로 이미지, 미니멀한 작업 공간, 깔끔한 화면 구성, 부드러운 자연광, 세련된 블루 그레이 톤, 정돈된 데스크와 디지털 워크플로우, 프리미엄하고 모던한 분위기, 텍스트 없음, 워터마크 없음"
  })
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.error?.message ?? "이미지 생성에 실패했습니다.");
}
```

### Response Schema

```ts
type GenerateImageResponse = {
  imageUrl: string;
};
```

### 응답 필드 설명

| 필드 | 타입 | 설명 |
|---|---|---|
| `imageUrl` | `string` | 생성된 이미지 URL |

### 응답 예시

```json
{
  "imageUrl": "https://your-domain.com/generated/1719999999999-550e8400-e29b-41d4-a716-446655440000.png"
}
```

### Error Handling

#### 400 예시

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "요청 데이터가 유효하지 않습니다.",
    "details": [
      {
        "path": "prompt",
        "message": "prompt는 필수 입력값입니다."
      }
    ]
  }
}
```

#### 500 예시

```json
{
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "이미지 생성 중 예기치 않은 오류가 발생했습니다."
  }
}
```

#### 자주 사용하는 에러 코드

| Status | Code | 설명 |
|---|---|---|
| `400` | `INVALID_JSON` | JSON 형식 오류 |
| `400` | `INVALID_PAYLOAD` | `prompt` 누락 또는 빈 값 |
| `500` | `CONFIGURATION_ERROR` | 서버 설정 오류 |
| `502` | `PROMPT_ENHANCEMENT_FAILED` | 프롬프트 보강 실패 |
| `502` | `INVALID_ENHANCED_PROMPT` | 보강된 프롬프트 구조 오류 |
| `502` | `IMAGE_GENERATION_FAILED` | 이미지 생성 실패 |
| `500` | `IMAGE_UPLOAD_FAILED` | 이미지 저장 실패 |

---

## Frontend Usage Notes

### 1. 기본 연동 흐름

```ts
const blogResponse = await fetch("/api/generate-blog", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    brandName: "나인위닛",
    productName: "블로그 자동 생성기",
    industry: "마케팅 SaaS",
    oneLineDescription: "브랜드 정보를 기반으로 마케팅용 블로그 콘텐츠를 자동 생성하는 서비스",
    differentiation: "실제 검색 유입과 전환을 고려한 한국어 콘텐츠 품질"
  })
});

const blogData = await blogResponse.json();

if (!blogResponse.ok) {
  throw new Error(blogData.error?.message ?? "블로그 생성 실패");
}

const imageResponse = await fetch("/api/generate-image", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    prompt: blogData.imagePrompt
  })
});

const imageData = await imageResponse.json();

if (!imageResponse.ok) {
  throw new Error(imageData.error?.message ?? "이미지 생성 실패");
}
```

### 2. 로딩 상태 분리 권장

```ts
const [isGeneratingBlog, setIsGeneratingBlog] = useState(false);
const [isGeneratingImage, setIsGeneratingImage] = useState(false);
```

### 3. 에러 메시지 처리

```ts
const data = await response.json();

if (!response.ok) {
  throw new Error(data.error?.message ?? "요청 처리 중 오류가 발생했습니다.");
}
```

### 4. 이미지 렌더링

```tsx
<img src={imageUrl} alt="생성 이미지" />
```

```tsx
<Image src={imageUrl} alt="생성 이미지" width={1024} height={1024} />
```
