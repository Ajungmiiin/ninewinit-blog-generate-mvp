import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  BookOpen,
  Copy,
  CopyCheck,
  Flame,
  Image as ImageIcon,
  Loader2,
  LucideIcon,
  Share2,
} from "lucide-react";
import {
  BlogContent,
  GenerateBlogResponse,
  KeywordItem,
  SocialContents,
} from "../types/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from "next/image";
const BlogGenerateTabs = [
  {
    value: "blog",
    label: "블로그 컨텐츠",
    icon: BookOpen as LucideIcon,
  },
  {
    value: "keyword",
    label: "트렌드 키워드",
    icon: Flame as LucideIcon,
  },
  {
    value: "social",
    label: "소셜 미디어",
    icon: Share2 as LucideIcon,
  },
  {
    value: "image",
    label: "이미지",
    icon: ImageIcon as LucideIcon,
  },
];

function BlogGenerateResult({
  blogGenerateReulst,
  imageGenerateResult,
}: {
  blogGenerateReulst: GenerateBlogResponse;
  imageGenerateResult: {
    status: "idle" | "pending" | "success" | "error";
    imageUrl: string | null;
    generateImageErrorMessage: string | null;
  };
}) {
  return (
    <>
      <Tabs defaultValue="blog">
        <TabsList className="min-h-10 w-full justify-start gap-2 border border-white/10 bg-white/2">
          {BlogGenerateTabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <TabsTrigger
                key={tab.value}
                className="flex-0 px-3 text-xs"
                value={tab.value}
              >
                <Icon className="size-3" />
                <span>{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="blog">
          <BlogGenerateResultBlogContent blog={blogGenerateReulst.blog} />
        </TabsContent>

        <TabsContent value="keyword">
          <BlogGenerateResultTrendKeywords
            keywords={blogGenerateReulst.keywords}
          />
        </TabsContent>

        <TabsContent value="social">
          <BlogGenerateResultSocialContent
            socialContents={blogGenerateReulst.socialContents}
          />
        </TabsContent>

        <TabsContent value="image">
          <BlogGenerateResultImageContent
            imageGenerateResult={imageGenerateResult}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default BlogGenerateResult;

function BlogGenerateResultContentWapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "text-primary-foreground max-w-150 rounded-xl border border-white/10 bg-white/2 p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

function BlogGenerateResultBlogContent({ blog }: { blog: BlogContent }) {
  const blogContent = [
    blog.title,
    blog.introduction,
    ...blog.sections.flatMap((section) => [section.heading, section.content]),
    blog.conclusion,
  ].join("\n\n");

  return (
    <BlogGenerateResultContentWapper className="space-y-2">
      <h1 className="mb-4 text-2xl font-bold">{blog.title}</h1>
      <p>{blog.introduction}</p>

      {blog.sections.map((section) => (
        <div key={section.heading}>
          <h4 className="text-primary mb-2 text-lg font-bold">
            {section.heading}
          </h4>
          <p>{section.content}</p>
        </div>
      ))}

      <p className="mb-4">{blog.conclusion}</p>
      <CopyContentButton content={blogContent} />
    </BlogGenerateResultContentWapper>
  );
}

function BlogGenerateResultTrendKeywords({
  keywords,
}: {
  keywords: KeywordItem[];
}) {
  console.log(keywords[0]);
  return (
    <BlogGenerateResultContentWapper>
      <p className="text-primary mb-4 flex items-center gap-2 text-xs font-semibold">
        <Flame className="size-3" />
        <span>{`마케팅 트렌드 키워드 TOP ${keywords.length}`}</span>
      </p>

      <ul className="space-y-4">
        {keywords.map((keyword, idx) => (
          <li key={`${keyword.keyword}-${idx}`}>
            <BlogGenerateResultTrendKeywordCard
              keyword={keyword}
              keywordNum={idx + 1}
            />
          </li>
        ))}
      </ul>
    </BlogGenerateResultContentWapper>
  );
}

function BlogGenerateResultTrendKeywordCard({
  keyword,
  keywordNum,
}: {
  keyword: KeywordItem;
  keywordNum: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex aspect-square items-center justify-center rounded-full text-sm font-semibold",
              keywordNum < 4
                ? "bg-primary text-primary-foreground px-2.5"
                : "bg-primary/10 text-primary border-primary border px-2",
            )}
          >
            {keywordNum}
          </span>
          <h4 className="text-primary-foreground font-semibold">
            {keyword.keyword}
          </h4>
        </div>
        <span className="border-pirmary bg-primary/5 border-primary text-primary rounded-full border px-2 py-0.5 text-xs font-bold">
          {keyword.category}
        </span>
      </div>

      <div className="mb-1 flex items-center gap-1 text-xs">
        <span
          className={cn(
            "font-semibold",
            keyword.trendLevel === "높음" && "text-primary-800",
            keyword.trendLevel === "중간" && "text-orange-500",
            keyword.trendLevel === "낮음" && "text-yellow-400",
          )}
        >
          영향력 {keyword.trendLevel}
        </span>

        <span className="text-gray-400">·</span>

        <span
          className={cn(
            "font-semibold",
            keyword.competition === "높음" && "text-primary-800",
            keyword.competition === "중간" && "text-yellow-500",
            keyword.competition === "낮음" && "text-green-400",
          )}
        >{`경쟁력 ${keyword.competition}`}</span>

        <span className="text-gray-400">·</span>

        <span className="text-gray-400">{keyword.intent}</span>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <div className="bg-primary/20 relative h-2 flex-1 overflow-hidden rounded-full">
          <div
            style={{ width: `${keyword.score}%` }}
            className="bg-primary absolute top-0 left-0 h-full rounded-full"
          ></div>
        </div>
        <span className="text-primary">{keyword.score}점</span>
      </div>

      <span className="text-xs text-gray-400">{keyword.reason}</span>
    </div>
  );
}

function BlogGenerateResultSocialContent({
  socialContents,
}: {
  socialContents: SocialContents;
}) {
  return (
    <BlogGenerateResultContentWapper>
      <p className="text-primary mb-4 flex items-center gap-2 text-xs font-semibold">
        <Share2 className="size-3" />
        <span>소셜 미디어 콘텐츠</span>
      </p>

      <ul>
        <li>
          <BlogGenerateResultSocialContentCard
            socialContent={socialContents.twitter}
            socialContentPlatform="X (twitter)"
          />
        </li>
        <li>
          <BlogGenerateResultSocialContentCard
            socialContent={socialContents.instagram}
            socialContentPlatform="인스타그램 (instagram)"
          />
        </li>
        <li>
          <BlogGenerateResultSocialContentCard
            socialContent={socialContents.threads}
            socialContentPlatform="스레드 (thread)"
          />
        </li>
      </ul>
    </BlogGenerateResultContentWapper>
  );
}

function BlogGenerateResultSocialContentCard({
  socialContent,
  socialContentPlatform,
}: {
  socialContent: string;
  socialContentPlatform: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/2 p-4">
      <p className="text-primary-foreground text-sm font-semibold">
        {socialContentPlatform}
      </p>

      <p className="whitespace-pre-line">{socialContent}</p>

      <CopyContentButton content={socialContent} />
    </div>
  );
}

function CopyContentButton({ content }: { content: string }) {
  const [copyComplete, setCopyComplete] = useState<boolean>(false);

  const handleCopyContent = async () => {
    setCopyComplete(false);
    await navigator.clipboard.writeText(content);
    setCopyComplete(true);
  };

  useEffect(() => {
    if (!copyComplete) return;

    const timer = setTimeout(() => {
      setCopyComplete(false);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [copyComplete]);

  return (
    <Button
      onClick={() => {
        if (copyComplete) return;
        handleCopyContent();
      }}
      className={cn(
        "h-10 w-full cursor-pointer border transition-colors",
        copyComplete
          ? "border-green-500 bg-green-500/10 text-green-500"
          : "bg-primary/10 border-primary text-primary",
      )}
    >
      {copyComplete ? <CopyCheck /> : <Copy />}
      <span>{copyComplete ? "복사됨" : "복사"}</span>
    </Button>
  );
}

function BlogGenerateResultImageContent({
  imageGenerateResult,
}: {
  imageGenerateResult: {
    status: "idle" | "pending" | "success" | "error";
    imageUrl: string | null;
    generateImageErrorMessage: string | null;
  };
}) {
  return (
    <BlogGenerateResultContentWapper>
      {imageGenerateResult.status === "pending" && (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-white/2 text-gray-400">
          <Loader2 className="animate-spin" />
          <span>이미지를 생성 중입니다 ...</span>{" "}
        </div>
      )}

      {imageGenerateResult.status === "success" &&
        imageGenerateResult.imageUrl && (
          <img
            src={imageGenerateResult.imageUrl}
            alt="AI가 생성한 블로그 컨텐츠 이미지"
            className="rounded-xl"
          />
        )}

      {imageGenerateResult.status === "error" && (
        <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl bg-white/2 text-gray-400">
          <AlertTriangle className="text-primary" />
          <span>
            {imageGenerateResult.generateImageErrorMessage ||
              "이미지 생성 중 오류가 발생했습니다"}
          </span>
        </div>
      )}
    </BlogGenerateResultContentWapper>
  );
}
