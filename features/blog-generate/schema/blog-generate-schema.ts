import z from "zod";

export const blogGenerateFormSchema = z.object({
  brandName: z.string().trim().min(1, "브랜드 명을 입력해주세요"),
  industry: z.string().trim().min(1, "업종을 입력해주세요"),
  productName: z.string().trim().min(1, "상품 및 서비스 명을 입력해주세요."),
  price: z.string().optional(),
  oneLineDescription: z
    .string()
    .trim()
    .min(1, "상품 및 서비스에 대한 한줄 설명을 입력해주세요."),
  differentiation: z.string().trim().min(1, "타사와의 차별점을 입력해주세요"),
  trustElements: z.string().optional(),
  event: z.string().optional(),
});

export type BlogGenerateFormValues = z.infer<typeof blogGenerateFormSchema>;
