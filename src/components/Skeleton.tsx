import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  variant?: "text" | "rectangular" | "circular";
  style?: React.CSSProperties;
}

export default function Skeleton({
  className = "",
  width,
  height,
  borderRadius,
  variant = "rectangular",
  style = {},
}: SkeletonProps) {
  const defaultRadius =
    variant === "circular"
      ? "50%"
      : variant === "text"
      ? "4px"
      : "var(--radius-sm, 6px)";

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      aria-hidden="true"
      style={{
        width: width ?? "100%",
        height: height ?? (variant === "text" ? "1em" : "100%"),
        borderRadius: borderRadius ?? defaultRadius,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
