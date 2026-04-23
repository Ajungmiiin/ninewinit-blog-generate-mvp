"use client";

import { Input } from "@/components/ui/input";
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
import { useForm } from "react-hook-form";
import {
  blogGenerateFormSchema,
  BlogGenerateFormValues,
} from "./schema/blog-generate-schema";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function BlogGenerateForm() {
  const form = useForm({
    resolver: zodResolver(blogGenerateFormSchema),
  });

  const handleSubmit = (formData: BlogGenerateFormValues) => {
    console.log(formData);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <BlogGenerateFormFieldWrapper
        error
        errorMessage="브랜드 명을 입력해주세요."
      >
        <BlogGenerateFormFieldTitle index={1} title="브랜드 기본 정보" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <BlogGenerageFormFieldLabel
              icon={Building2}
              label="브랜드 명"
              required
              htmlFor="brandName"
            />
            <Input placeholder="예: 닥터스킨" />
          </div>

          <div className="space-y-2">
            <BlogGenerageFormFieldLabel
              icon={FileText}
              label="업종"
              required
              htmlFor="brandName"
            />
            <Input placeholder="예: 피부과, 입시 학원" />
          </div>
        </div>
      </BlogGenerateFormFieldWrapper>

      <BlogGenerateFormFieldWrapper>
        <BlogGenerateFormFieldTitle index={2} title="상품 / 서비스 정보" />
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <BlogGenerageFormFieldLabel
              icon={Tag}
              label="상품/서비스 명"
              required
              htmlFor="productName"
            />
            <Input placeholder="예: 레이저 토닝 시술" />
          </div>

          <div className="space-y-2">
            <BlogGenerageFormFieldLabel
              icon={DollarSign}
              label="가격"
              htmlFor="price"
            />
            <Input placeholder="예: 50,000원 / 1회" />
          </div>
        </div>

        <div className="mb-4 space-y-2">
          <BlogGenerageFormFieldLabel
            icon={MessageSquare}
            label="한 줄 설명"
            required
            htmlFor="oneLineDescription"
          />
          <Input placeholder="예: 피부 톤 개선과 잡티 제거를 한 번에 해결하는 레이저 시술" />
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
                <input className="hidden" multiple />
              </div>

              <div className="text-center">
                <p className="text-primary-foreground font-semibold">
                  이미지를 업로드 해주세요
                </p>
                <p className="text-xs text-gray-400">
                  PNG, JPG, WEBP · 최대 5장
                </p>
              </div>
            </div>
          </label>
        </div>
      </BlogGenerateFormFieldWrapper>

      <BlogGenerateFormFieldWrapper>
        <BlogGenerateFormFieldTitle index={3} title="마케팅 요소" />

        <div className="mb-2 space-y-2">
          <BlogGenerageFormFieldLabel
            icon={Sparkle}
            label="타사와의 차별점"
            htmlFor="differentiation"
            required
          />
          <Textarea
            className="resize-none"
            placeholder="예: 국내 최소 AI 피부 분석 시스템 도입, 의사 직접 시술 보장"
          />
        </div>

        <div className="mb-2 space-y-2">
          <BlogGenerageFormFieldLabel
            icon={Shield}
            label="신뢰 요소"
            htmlFor="trustElement"
          />
          <Textarea
            className="resize-none"
            placeholder="예: 구글 리뷰 4.9점, 보건복지부 인증, 2024 소비자 대상 수상"
          />
        </div>

        <BlogGenerageFormFieldLabel
          icon={Gift}
          label="이벤트"
          htmlFor="event"
        />
        <Input placeholder="예: 신규 고객 첫 방문 30% 할인, 5월 한정 이벤트" />
      </BlogGenerateFormFieldWrapper>

      <Button className="hover:bg-primary-400/90 flex h-12 w-full cursor-pointer items-center justify-center gap-2 shadow-2xl transition-colors">
        <Sparkles />
        <span>AI 블로그 포스팅 생성</span>
        <ChevronRight />
      </Button>
    </form>
  );
}

export default BlogGenerateForm;

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
