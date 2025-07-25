"use client"

import React, { useState } from "react"
import { Copy, Check } from "lucide-react"
import Highlight, { defaultProps } from "prism-react-renderer"
import vsDark from "prism-react-renderer/themes/vsDark"
import Prism from "prism-react-renderer/prism"

// 🧠 Register required languages manually
typeof global !== "undefined" && (global.Prism = Prism as any)
require("prismjs/components/prism-jsx")
require("prismjs/components/prism-tsx")
require("prismjs/components/prism-typescript")
require("prismjs/components/prism-python")
require("prismjs/components/prism-json")
require("prismjs/components/prism-bash")
// Add more as needed...

interface CodeBlockProps {
  children: string
  className?: string
}

function detectLanguage(className?: string): string {
  const defaultLang = "javascript"
  if (!className) return defaultLang

  const match = className.match(/language-(\w+)/)
  const lang = match?.[1] || defaultLang

  return lang
}

export function CodeBlock({ children, className = "language-text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const language = detectLanguage(className)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Copy failed:", err)
    }
  }

  return (
    <div className="relative rounded-md overflow-hidden bg-[#1e1e1e] text-sm font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-zinc-400 bg-[#111] uppercase">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check size={14} /> Copied
            </>
          ) : (
            <>
              <Copy size={14} /> Copy
            </>
          )}
        </button>
      </div>

      {/* Code block with syntax highlighting + line numbers */}
      <Highlight
        {...defaultProps}
        code={children.trim()}
        language={language as any}
        theme={vsDark}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} px-4 py-3 overflow-x-auto`}
            style={{ ...style, background: "transparent" }}
          >
            {tokens.map((line, i) => (
              <div
                key={i}
                {...getLineProps({ line, key: i })}
                className="flex"
              >
                <span className="w-8 pr-4 text-zinc-600 select-none text-right">
                  {i + 1}
                </span>
                <span className="flex-1">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token, key })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  )
}
