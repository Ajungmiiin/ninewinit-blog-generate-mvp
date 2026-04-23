"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  ChevronRight,
  DollarSign,
  FileText,
  Gift,
  Image,
  LucideIcon,
  MessageSquare,
  Shield,
  Sparkle,
  Sparkles,
  Tag,
  Upload,
} from "lucide-react";
import React from "react";
import {
  Controller,
  FieldPath,
  FieldValues,
  UseControllerProps,
  useForm,
} from "react-hook-form";
import {
  BlogGenerateFormValues,
  blogGenerateFormSchema,
} from "./schema/blog-generate-schema";

function BlogGenerateForm() {
  const form = useForm<BlogGenerateFormValues>({
    resolver: zodResolver(blogGenerateFormSchema),
    defaultValues: {
      brandName: "",
      industry: "",
      productName: "",
      price: "",
      oneLineDescription: "",
      differentiation: "",
      trustElements: "",
      event: "",
    },
  });

  const handleSubmit = (formData: BlogGenerateFormValues) => {
    console.log(formData);
  };

  const brandInfoError = getSectionErrorMessage(form.formState.errors, [
    "brandName",
    "industry",
  ]);
  const productInfoError = getSectionErrorMessage(form.formState.errors, [
    "productName",
    "price",
    "oneLineDescription",
  ]);
  const marketingInfoError = getSectionErrorMessage(form.formState.errors, [
    "differentiation",
    "trustElements",
    "event",
  ]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <BlogGenerateFormFieldWrapper
        error={Boolean(brandInfoError)}
        errorMessage={brandInfoError}
      >
        <BlogGenerateFormFieldTitle index={1} title="브랜드 기본 정보" />
        <div className="grid grid-cols-2 gap-4">
          <BlogGenerateControlledField
            control={form.control}
            name="brandName"
            label="브랜드명"
            htmlFor="brandName"
            icon={Building2}
            required
            placeholder="예: 나이키"
          />

          <BlogGenerateControlledField
            control={form.control}
            name="industry"
            label="업종"
            htmlFor="industry"
            icon={FileText}
            required
            placeholder="예: 헬스케어, 뷰티, 교육"
          />
        </div>
      </BlogGenerateFormFieldWrapper>

      <BlogGenerateFormFieldWrapper
        error={Boolean(productInfoError)}
        errorMessage={productInfoError}
      >
        <BlogGenerateFormFieldTitle index={2} title="상품 / 서비스 정보" />

        <div className="mb-4 grid grid-cols-2 gap-4">
          <BlogGenerateControlledField
            control={form.control}
            name="productName"
            label="상품/서비스명"
            htmlFor="productName"
            icon={Tag}
            required
            placeholder="예: 온라인 PT 서비스"
          />

          <BlogGenerateControlledField
            control={form.control}
            name="price"
            label="가격"
            htmlFor="price"
            icon={DollarSign}
            placeholder="예: 50,000원 / 1개월"
          />
        </div>

        <div className="mb-4 space-y-2">
          <BlogGenerageFormFieldLabel
            icon={MessageSquare}
            label="한 줄 설명"
            required
            htmlFor="oneLineDescription"
          />
          <Controller
            control={form.control}
            name="oneLineDescription"
            render={({ field, fieldState }) => (
              <Input
                {...field}
                id="oneLineDescription"
                value={field.value ?? ""}
                aria-invalid={fieldState.invalid}
                placeholder="예: 식단과 운동 습관 개선을 돕는 온라인 PT 서비스"
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <BlogGenerageFormFieldLabel
            icon={Image}
            label="대표 사진"
            htmlFor="image"
          />
          <label className="hover:bg-primary-900/30 border-primary flex-items-center bg-primary-900/20 flex cursor-pointer justify-center rounded-lg border-2 border-dashed p-5 transition-colors">
            <div className="flex flex-col gap-2">
              <div className="bg-primary/50 text-primary-300 mx-auto flex aspect-square size-10 items-center justify-center rounded-full">
                <Upload className="size-4" />
                <input className="hidden" type="file" multiple />
              </div>

              <div className="text-center">
                <p className="text-primary-foreground font-semibold">
                  이미지를 업로드해 주세요
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, WEBP / 프론트 미리보기 전용
                </p>
              </div>
            </div>
          </label>
        </div>
      </BlogGenerateFormFieldWrapper>

      <BlogGenerateFormFieldWrapper
        error={Boolean(marketingInfoError)}
        errorMessage={marketingInfoError}
      >
        <BlogGenerateFormFieldTitle index={3} title="마케팅 요소" />

        <BlogGenerateControlledField
          className="mb-2"
          control={form.control}
          name="differentiation"
          label="경쟁사 대비 차별점"
          htmlFor="differentiation"
          icon={Sparkle}
          required
          multiline
          placeholder="예: 국내 최초 AI 피부 분석 테스트 도입, 본사 직접 시술 보장"
        />

        <BlogGenerateControlledField
          className="mb-2"
          control={form.control}
          name="trustElements"
          label="신뢰 요소"
          htmlFor="trustElements"
          icon={Shield}
          multiline
          placeholder="예: 구글 리뷰 4.9점, 보건복지부 인증, 2024 소비자 만족도 수상"
        />

        <BlogGenerateControlledField
          control={form.control}
          name="event"
          label="이벤트"
          htmlFor="event"
          icon={Gift}
          placeholder="예: 신규 고객 첫 방문 30% 할인, 5월 한정 이벤트"
        />
      </BlogGenerateFormFieldWrapper>

      <Button
        type="submit"
        className="hover:bg-primary-400/90 flex h-12 w-full cursor-pointer items-center justify-center gap-2 shadow-2xl transition-colors"
      >
        <Sparkles />
        <span>AI 블로그 포스트 생성</span>
        <ChevronRight />
      </Button>
    </form>
  );
}

export default BlogGenerateForm;

function BlogGenerateControlledField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  className,
  control,
  name,
  label,
  htmlFor,
  icon,
  placeholder,
  required,
  multiline = false,
}: UseControllerProps<TFieldValues, TName> & {
  className?: string;
  label: string;
  htmlFor: string;
  icon?: LucideIcon;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <BlogGenerageFormFieldLabel
        icon={icon}
        label={label}
        htmlFor={htmlFor}
        required={required}
      />
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) =>
          multiline ? (
            <Textarea
              {...field}
              id={htmlFor}
              value={(field.value as string | undefined) ?? ""}
              aria-invalid={fieldState.invalid}
              className="resize-none"
              placeholder={placeholder}
            />
          ) : (
            <Input
              {...field}
              id={htmlFor}
              value={(field.value as string | undefined) ?? ""}
              placeholder={placeholder}
            />
          )
        }
      />
    </div>
  );
}

function getSectionErrorMessage(
  errors: Partial<Record<keyof BlogGenerateFormValues, { message?: string }>>,
  names: (keyof BlogGenerateFormValues)[],
) {
  for (const name of names) {
    const message = errors[name]?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return undefined;
}

function BlogGenerateFormFieldWrapper({
  children,
  error = false,
  errorMessage,
}: {
  children: React.ReactNode;
  error?: boolean;
  errorMessage?: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "rounded-xl border bg-white/2 p-5 backdrop-blur-sm",
          error ? "border-primary-800" : "border-white/10",
        )}
      >
        {children}
      </div>
      {errorMessage && (
        <p className="text-primary-800 pt-2 text-sm font-semibold">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function BlogGenerateFormFieldTitle({
  index,
  title,
}: {
  index: number;
  title: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-sm font-semibold">
        {index}
      </span>

      <p className="text-primary-foreground text-sm font-semibold">{title}</p>
    </div>
  );
}

function BlogGenerageFormFieldLabel({
  icon,
  label,
  htmlFor,
  required,
}: {
  icon?: LucideIcon;
  label: string;
  htmlFor: string;
  required?: boolean;
}) {
  const Icon = icon;

  return (
    <label
      htmlFor={htmlFor}
      className="text-primary flex items-center gap-1 text-sm font-bold"
    >
      {Icon && <Icon className="size-3" />}
      <span>{label}</span>
      {required && <span>*</span>}
    </label>
  );
}
