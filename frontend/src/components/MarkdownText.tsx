import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';

/**
 * The only text transformation permitted before handing source to ReactMarkdown.
 * Do NOT add heuristic LaTeX rewriting here (auto-wrapping words in $, converting
 * `/` to \frac, `*` to \times, etc.) — that was the bug in the old LatexText
 * component: those heuristics corrupted valid markdown/LaTeX as often as they
 * fixed anything.
 */
const normalize = (source: string): string => {
  if (!source) return '';
  // Literal "\n" (backslash-n) can arrive from JSON-escaped strings that were
  // never re-parsed into real newlines.
  let s = source.replace(/\\n/g, '\n');
  // Ensure a $$...$$ block sits on its own line so remark-math parses it as
  // display math rather than inline text.
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_match, inner) => `\n\n$$${inner}$$\n\n`);
  return s;
};

const components: Components = {
  p: ({ children }) => <span className="inline">{children}</span>,
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  img: ({ ...props }) => <img {...props} style={{ maxWidth: '100%' }} />,
};

export const MarkdownText = ({ text, className = '' }: { text: string; className?: string }) => {
  if (!text) return null;

  return (
    <span className={`markdown-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: true }]]}
        components={components}
      >
        {normalize(text)}
      </ReactMarkdown>
    </span>
  );
};

export default MarkdownText;
