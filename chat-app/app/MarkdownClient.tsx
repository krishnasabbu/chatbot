'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { CodeBlock } from './CodeBlock'

export default function MarkdownClient({ content }: { content: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null // Prevent hydration mismatch

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-pre:p-0 prose-pre:shadow-none prose-pre:border-0 prose-pre:bg-transparent prose-pre:rounded-none">

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const isInline = inline ?? false
            const codeString = typeof children === 'string' ? children : String(children)

            return isInline ? (
              <code className="bg-zinc-800 text-zinc-100 px-1 py-0.5 rounded text-xs">
                {children}
              </code>
            ) : (
              <CodeBlock className={className}>{codeString}</CodeBlock>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}