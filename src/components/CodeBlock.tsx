"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

/**
 * Tokenizes a single line of JavaScript into colored spans
 */
function highlightJsLine(line: string): React.ReactNode[] {
  // Regex to split line into tokens: comments, strings, keywords, booleans/numbers, functions
  const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|while|for|class|new|async|await|import|export|from|typeof|instanceof|try|catch|finally|throw|this|prototype|default|case|switch|break|continue|void)\b|\b(?:true|false|null|undefined)\b|\b\d+(?:n)?\b|\b[A-Za-z_$][A-Za-z0-9_$]*(?=\s*\()|[^\s\w]+|\w+|\s+)/g;

  const elements: React.ReactNode[] = [];
  let match;
  let index = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const token = match[0];
    const key = `${index++}_${token.slice(0, 5)}`;

    if (token.startsWith("//") || token.startsWith("/*")) {
      // Comment
      elements.push(
        <span key={key} style={{ color: "#71717a", fontStyle: "italic" }}>
          {token}
        </span>
      );
    } else if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'")) ||
      (token.startsWith("`") && token.endsWith("`"))
    ) {
      // String
      elements.push(
        <span key={key} style={{ color: "#4ade80" }}>
          {token}
        </span>
      );
    } else if (
      /^(?:const|let|var|function|return|if|else|while|for|class|new|async|await|import|export|from|typeof|instanceof|try|catch|finally|throw|this|prototype|default|case|switch|break|continue|void)$/.test(
        token
      )
    ) {
      // Keyword
      elements.push(
        <span key={key} style={{ color: "#f472b6", fontWeight: 600 }}>
          {token}
        </span>
      );
    } else if (/^(?:true|false|null|undefined)$/.test(token)) {
      // Booleans & Nullish
      elements.push(
        <span key={key} style={{ color: "#38bdf8", fontWeight: 600 }}>
          {token}
        </span>
      );
    } else if (/^\d+(?:n)?$/.test(token)) {
      // Number / BigInt
      elements.push(
        <span key={key} style={{ color: "#fb923c" }}>
          {token}
        </span>
      );
    } else if (line.indexOf(token + "(") !== -1 || line.indexOf(token + " (") !== -1) {
      // Function Call
      elements.push(
        <span key={key} style={{ color: "#60a5fa" }}>
          {token}
        </span>
      );
    } else {
      // Default identifier / punctuation
      elements.push(
        <span key={key} style={{ color: "#e2e8f0" }}>
          {token}
        </span>
      );
    }
  }

  return elements.length > 0 ? elements : [line];
}

export default function CodeBlock({ code, language = "javascript", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div
      style={{
        borderRadius: "var(--radius-sm)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        background: "#060910",
        overflow: "hidden",
        maxWidth: "100%",
        marginTop: "0.85rem",
        marginBottom: "1rem",
      }}
    >
      {/* Code Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.45rem 0.85rem",
          background: "rgba(255, 255, 255, 0.03)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span>{title || language}</span>
        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            background: "none",
            border: "none",
            color: copied ? "#34d399" : "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.75rem",
            padding: "0.15rem 0.4rem",
            borderRadius: "3px",
          }}
          title="Copy code to clipboard"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Code Editor Body with Syntax Highlighting */}
      <div
        style={{
          padding: "0.85rem 1rem",
          overflowX: "auto",
          fontFamily: "var(--font-mono)",
          fontSize: "0.86rem",
          lineHeight: 1.6,
        }}
      >
        <pre style={{ margin: 0 }}>
          <code>
            {lines.map((line, idx) => (
              <div key={idx} style={{ display: "flex" }}>
                <span
                  style={{
                    width: "2.5rem",
                    userSelect: "none",
                    color: "rgba(255, 255, 255, 0.2)",
                    textAlign: "right",
                    paddingRight: "1rem",
                    flexShrink: 0,
                    fontSize: "0.78rem",
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ flex: 1, whiteSpace: "pre" }}>{highlightJsLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
