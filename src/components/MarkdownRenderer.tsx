"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import CodeBlock from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  return (
    <div className={`markdown-body ${className || ""}`} style={{ fontSize: "0.92rem", lineHeight: 1.7 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p: ({ children }) => (
            <p style={{ marginBottom: "0.85rem", lineHeight: 1.7, color: "var(--text-secondary)" }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic", color: "var(--text-primary)" }}>
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul style={{
              paddingLeft: "1.4rem",
              marginBottom: "0.85rem",
              listStyleType: "disc",
              color: "var(--text-secondary)",
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              paddingLeft: "1.4rem",
              marginBottom: "0.85rem",
              listStyleType: "decimal",
              color: "var(--text-secondary)",
            }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: "0.35rem", lineHeight: 1.65 }}>
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{
              margin: "0.85rem 0",
              padding: "0.6rem 1rem",
              borderLeft: "3px solid var(--accent-primary)",
              background: "rgba(99, 102, 241, 0.06)",
              borderRadius: "0 6px 6px 0",
              color: "#e0e7ff",
              fontSize: "0.9rem",
            }}>
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div style={{ overflowX: "auto", margin: "1rem 0", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: "rgba(255, 255, 255, 0.04)" }}>
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th style={{
              textAlign: "left",
              padding: "0.65rem 0.9rem",
              borderBottom: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontWeight: 700,
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding: "0.55rem 0.9rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
              color: "var(--text-secondary)",
            }}>
              {children}
            </td>
          ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const isCodeBlock = match || String(children).includes("\n");

            if (isCodeBlock) {
              return (
                <CodeBlock
                  code={String(children).replace(/\n$/, "")}
                  language={match ? match[1] : "javascript"}
                />
              );
            }

            return (
              <code
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#f8fafc",
                  padding: "0.15rem 0.4rem",
                  borderRadius: "4px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85em",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--accent-primary)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
