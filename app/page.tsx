import BlogGenerateForm from "@/features/blog-generate/blog-generate-form";

export default function Home() {
  return (
    <section className="flex min-h-[calc(100vh-var(--header-height))] items-center justify-center">
      <div className="min-w-150 space-y-4 py-10">
        <div>
          <h3 className="font-lg mb-2 font-bold text-white">
            블로그 포스팅 자동화
          </h3>
          <p className="text-sm text-gray-400">
            브랜드 정보를 입력하면 AI가 SEO 최적화된 블로그 포스팅을 자동으로
            생성합니다.
          </p>
        </div>

        <BlogGenerateForm />
      </div>
    </section>
  );
}
