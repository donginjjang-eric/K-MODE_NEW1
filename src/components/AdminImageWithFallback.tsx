"use client";

import Image from "next/image";
import { useState } from "react";

export default function AdminImageWithFallback({
  src,
  alt,
  width,
  height,
  className = "st-card-media",
  eager = false,
}: {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = !src || failedSrc === src;

  if (failed || !src) {
    return (
      <div className={`admin-image-fallback ${className}`} role="img" aria-label={`${alt} 없음`}>
        <span aria-hidden="true">◇</span>
        <small>이미지 없음</small>
      </div>
    );
  }

  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={eager ? "eager" : "lazy"}
      unoptimized
      onError={() => setFailedSrc(src)}
    />
  );
}
