import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" className="underline" />,
          p: ({ ...props }) => <p {...props} className="mb-3 last:mb-0" />,
          ul: ({ ...props }) => <ul {...props} className="mb-3 list-disc pl-5 last:mb-0" />,
          ol: ({ ...props }) => <ol {...props} className="mb-3 list-decimal pl-5 last:mb-0" />,
          code: ({ ...props }) => <code {...props} className="rounded bg-muted px-1 py-0.5 text-xs" />,
          pre: ({ ...props }) => <pre {...props} className="mb-3 overflow-x-auto rounded-md bg-muted p-3 text-xs last:mb-0" />,
          blockquote: ({ ...props }) => <blockquote {...props} className="mb-3 border-l-2 pl-3 italic text-muted-foreground last:mb-0" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
