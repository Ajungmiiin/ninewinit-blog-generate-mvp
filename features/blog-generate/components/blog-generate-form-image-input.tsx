"use client";

import { cn } from "@/lib/utils";
import { Image as ImageIcon, Upload, X } from "lucide-react";
import React from "react";

const MAX_IMAGE_COUNT = 5;

interface BlogGenerateFormImageInputProps {
  className?: string;
  id?: string;
}

interface PreviewImage {
  id: string;
  fileName: string;
  previewUrl: string;
}

function BlogGenerateFormImageInput({
  className,
  id = "image",
}: BlogGenerateFormImageInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [previewImages, setPreviewImages] = React.useState<PreviewImage[]>([]);
  const previewImagesRef = React.useRef<PreviewImage[]>([]);

  React.useEffect(() => {
    previewImagesRef.current = previewImages;
  }, [previewImages]);

  React.useEffect(() => {
    return () => {
      previewImagesRef.current.forEach((previewImage) => {
        URL.revokeObjectURL(previewImage.previewUrl);
      });
    };
  }, []);

  const handleChangeImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const imageFiles = Array.from(event.target.files ?? []);

    if (imageFiles.length === 0) {
      return;
    }

    setPreviewImages((prevPreviewImages) => {
      const availableImageCount = MAX_IMAGE_COUNT - prevPreviewImages.length;

      if (availableImageCount <= 0) {
        return prevPreviewImages;
      }

      const nextPreviewImages = imageFiles
        .slice(0, availableImageCount)
        .map((imageFile) => {
          return {
            id: `${imageFile.name}-${imageFile.lastModified}-${Math.random().toString(36).slice(2)}`,
            fileName: imageFile.name,
            previewUrl: URL.createObjectURL(imageFile),
          };
        });

      return [...prevPreviewImages, ...nextPreviewImages];
    });

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemoveImage = (previewImageId: string) => {
    setPreviewImages((prevPreviewImages) => {
      const previewImage = prevPreviewImages.find(
        (item) => item.id === previewImageId,
      );

      if (previewImage) {
        URL.revokeObjectURL(previewImage.previewUrl);
      }

      return prevPreviewImages.filter((item) => item.id !== previewImageId);
    });
  };

  const isMaxImageCountReached = previewImages.length >= MAX_IMAGE_COUNT;

  const handleResetAllImages = () => {
    previewImages.forEach((previewImage) => {
      URL.revokeObjectURL(previewImage.previewUrl);
    });
    setPreviewImages([]);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("w-full max-w-full min-w-0 space-y-2", className)}>
      <label
        htmlFor={id}
        className="text-primary flex items-center gap-1 text-sm font-bold"
      >
        <ImageIcon className="size-3" />
        <span>대표 사진</span>
      </label>

      <label
        htmlFor={id}
        className={cn(
          "border-primary bg-primary-900/20 relative flex w-full max-w-full min-w-0 justify-center rounded-lg border-2 border-dashed p-5 transition-colors",
          isMaxImageCountReached
            ? "cursor-default"
            : "hover:bg-primary-900/30 cursor-pointer",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          className="hidden"
          type="file"
          multiple
          disabled={isMaxImageCountReached}
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChangeImage}
        />

        {previewImages.length > 0 ? (
          <div className="w-full max-w-full min-w-0 space-y-3">
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-primary-foreground text-sm font-semibold">
                  이미지 {previewImages.length}/{MAX_IMAGE_COUNT}
                </p>
              </div>

              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  handleResetAllImages();
                }}
                className="bg-primary/10 text-primary inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold"
              >
                전체 제거
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {previewImages.map((previewImage) => (
                <div
                  key={previewImage.id}
                  className="relative overflow-hidden rounded-xl border border-white/10 bg-black/20"
                >
                  <img
                    src={previewImage.previewUrl}
                    alt={`${previewImage.fileName} 미리보기`}
                    className="h-36 w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      handleRemoveImage(previewImage.id);
                    }}
                    className="text-primary-foreground absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-black/60 transition-colors hover:bg-black/80"
                    aria-label={`${previewImage.fileName} 제거`}
                  >
                    <X className="size-4" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                    <p className="text-primary-foreground truncate text-xs font-medium">
                      {previewImage.fileName}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full min-w-0 text-center">
              <p className="text-primary-foreground text-sm font-semibold">
                {isMaxImageCountReached
                  ? "최대 5장까지 선택했어요"
                  : "이미지를 추가로 업로드해 주세요"}
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP / 최대 5장</p>
            </div>
          </div>
        ) : (
          <div className="flex w-full min-w-0 flex-col gap-2">
            <div className="bg-primary/50 text-primary-300 mx-auto flex aspect-square size-10 items-center justify-center rounded-full">
              <Upload className="size-4" />
            </div>

            <div className="text-center">
              <p className="text-primary-foreground font-semibold">
                이미지를 업로드해 주세요
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
            </div>
          </div>
        )}
      </label>
    </div>
  );
}

export default BlogGenerateFormImageInput;
