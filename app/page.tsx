"use client";

import { Button } from "@/components/ui/button";
import BlogGenerateForm from "@/features/blog-generate/components/blog-generate-form";
import BlogGenerateResult from "@/features/blog-generate/components/blog-generate-result";
import { BlogGenerateFormValues } from "@/features/blog-generate/schema/blog-generate-schema";
import { GenerateBlogResponse } from "@/features/blog-generate/types/api";
import { client, type RequestError } from "@/lib/request";
import { Check, Loader2, RefreshCw, XIcon } from "lucide-react";
import { useState } from "react";

type generateStatus = "idle" | "pending" | "success" | "error";

export default function Home() {
  const [generateBlogStatus, setGenerateBlogStatus] =
    useState<generateStatus>("idle");
  const [generateImageStatus, setGenerateImageStatus] =
    useState<generateStatus>("idle");

  const [generateBlogError, setGenerateBlogError] = useState<string | null>(
    null,
  );
  const [generateImageError, setGenerateImageError] = useState<string | null>(
    null,
  );

  const [generateBlogResult, setGenerateBlogResult] =
    useState<GenerateBlogResponse | null>(null);
  const [generateImageResult, setGenerateImageResult] = useState<{
    imageUrl: string;
  } | null>(null);

  const handleSubmitBlogGenerateForm = async (
    formData: BlogGenerateFormValues,
  ) => {
    setGenerateBlogResult(null);
    setGenerateImageResult(null);

    setGenerateBlogError(null);
    setGenerateImageError(null);

    setGenerateBlogStatus("idle");
    setGenerateImageStatus("idle");

    try {
      setGenerateBlogStatus("pending");
      const generateBlogRes = await client.post<GenerateBlogResponse>(
        "/api/generate-blog",
        formData,
      );

      setGenerateBlogStatus("success");
      setGenerateBlogResult(generateBlogRes);

      try {
        setGenerateImageStatus("pending");
        const generateBlogImageRes = await client.post<{ imageUrl: string }>(
          "/api/generate-image",
          { prompt: generateBlogRes.imagePrompt },
        );

        setGenerateImageStatus("success");
        setGenerateImageResult(generateBlogImageRes);
      } catch (error) {
        const requestError = error as RequestError;

        setGenerateImageStatus("error");
        setGenerateImageError(requestError.message);
      }
    } catch (error) {
      const requestError = error as RequestError;
      setGenerateBlogStatus("error");
      setGenerateBlogError(requestError.message);
    }
  };

  return (
    <section className="flex min-h-svh items-center justify-center">
      {generateBlogStatus !== "pending" &&
        (generateBlogStatus === "idle" || generateBlogStatus === "error") && (
          <div className="w-full max-w-150 space-y-4">
            {generateBlogStatus === "error" && (
              <div className="border-primary-800 flex items-center justify-between rounded-xl border bg-white/2 p-4">
                <div className="text-primary-foreground space-y-1">
                  <p className="text-primary-300 font-semibold">
                    블로그 컨텐츠 변환 실패
                  </p>

                  <p className="text-sm">
                    {generateBlogError || "잠시 후 다시 시도해주세요"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setGenerateBlogStatus("idle");
                    setGenerateBlogError(null);
                  }}
                  className="bg-primary/10 text-primary flex aspect-square items-center justify-center rounded-full p-2"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            )}

            <div>
              <div className="mb-4">
                <h3 className="mb-2 text-lg font-bold text-white">
                  블로그 포스팅 자동화
                </h3>
                <p className="text-sm text-gray-400">
                  브랜드 정보를 입력하면 AI가 SEO 최적화된 블로그 포스팅을
                  자동으로 생성합니다.
                </p>
              </div>

              <BlogGenerateForm onSubmit={handleSubmitBlogGenerateForm} />
            </div>
          </div>
        )}

      {generateBlogStatus === "pending" && (
        <div className="text-primary">
          <Loader2 className="mx-auto mb-3 size-10 animate-spin" />
          <p className="text-lg">블로그 컨텐츠를 생성하고 있습니다 ...</p>
        </div>
      )}

      {generateBlogStatus === "success" && generateBlogResult && (
        <div className="min-w-150 space-y-4 py-10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold text-white">
                블로그 컨텐츠 생성 완료
              </h3>
              <div className="inline-flex items-center justify-center gap-0.5 rounded-full border border-green-500 bg-green-500/20 px-2.5 py-1 text-xs text-green-500">
                <Check className="size-4" />
                <span>성공</span>
              </div>
            </div>

            <Button
              onClick={() => {
                setGenerateBlogStatus("idle");
                setGenerateBlogResult(null);
              }}
            >
              <RefreshCw />
              <span className="font-semibold">재생성</span>
            </Button>
          </div>

          <BlogGenerateResult
            blogGenerateReulst={generateBlogResult}
            imageGenerateResult={{
              status: generateImageStatus,
              imageUrl: generateImageResult?.imageUrl ?? null,
              generateImageErrorMessage: generateImageError,
            }}
          />
        </div>
      )}
    </section>
  );
}
