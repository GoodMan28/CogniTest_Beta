import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const autoWrapLatex = (str: string): string => {
  if (!str) return '';
  const normalized = str.replace(/\\n/g, '\n');
  const lines = normalized.split('\n');
  
  const isMathWord = (w: string) => {
    return /[_^\\]/.test(w) || /\b(sqrt|lambda|theta|alpha|beta|gamma|delta|pi|sigma|omega|mu|phi|psi)\b/.test(w);
  };

  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    if (
      (trimmed.startsWith('\\') && !trimmed.startsWith('\\text')) || 
      trimmed.includes('\\frac') || 
      trimmed.includes('\\left') || 
      isMathWord(trimmed) && !trimmed.includes(' ') // Single math block line
    ) {
      if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
        return line;
      }
      return `$${trimmed}$`;
    }

    // Process word by word
    return line.split(' ').map(word => {
      const trimmedWord = word.trim();
      if (!trimmedWord) return word;
      
      if (trimmedWord.startsWith('$') && trimmedWord.endsWith('$')) {
        return word;
      }

      if (isMathWord(trimmedWord)) {
        // Extract leading/trailing punctuation so it doesn't go inside math mode
        const match = trimmedWord.match(/^([([{"'-]*)(.*?)([\])}"',.:;?!-]*)$/);
        if (match) {
          const [_, leading, core, trailing] = match;
          if (isMathWord(core)) {
            return `${leading}$${core}$${trailing}`;
          }
        }
        return `$${trimmedWord}$`;
      }
      return word;
    }).join(' ');
  });
  return processedLines.join('\n');
};

const fixLatexSyntax = (latex: string): string => {
  let s = latex;
  // Prepend backslash to greek letters and math functions if missing
  s = s.replace(/(^|[^\\])\b(lambda|theta|alpha|beta|gamma|delta|pi|sigma|omega|mu|epsilon|phi|psi|sin|cos|tan|log|ln)\b/g, '$1\\$2');
  // Fix sqrt(xxx) -> \sqrt{xxx}
  s = s.replace(/(^|[^\\])sqrt\(([^)]+)\)/g, '$1\\sqrt{$2}');
  // Prepend backslash to sqrt if it's missing (and it wasn't caught by the regex above)
  s = s.replace(/(^|[^\\])\bsqrt\b/g, '$1\\sqrt');
  // Fix subscripts/superscripts that are multiple characters but lack braces
  // e.g. \lambda_photon -> \lambda_{photon}
  s = s.replace(/_([a-zA-Z0-9]{2,})/g, '_{$1}');
  s = s.replace(/\^([a-zA-Z0-9]{2,})/g, '^{$1}');
  // Fix F_A/F_B -> \frac{F_A}{F_B} (basic heuristic for single division in a word)
  // Only if it doesn't already contain \frac and has exactly one slash
  if (!s.includes('\\frac') && s.split('/').length === 2) {
    const parts = s.split('/');
    if (parts[0].length > 0 && parts[1].length > 0) {
      s = `\\frac{${parts[0]}}{${parts[1]}}`;
    }
  }
  // Convert * to \times for better rendering
  s = s.replace(/\*/g, '\\times ');
  return s;
};

export const LatexText = ({ text, className = '' }: { text: string; className?: string }) => {
  if (!text) return null;
  
  const processedText = autoWrapLatex(text);
  const parts = processedText.split(/(\$[^$]+\$)/g);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          let latexString = part.slice(1, -1);
          latexString = fixLatexSyntax(latexString);
          
          try {
            const html = katex.renderToString(latexString, { throwOnError: false });
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch (e) {
            return <span key={index}>{part}</span>;
          }
        }
        
        return (
          <span key={index}>
            {part.split('\n').map((line, i, arr) => (
              <React.Fragment key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </span>
  );
};

export default LatexText;
