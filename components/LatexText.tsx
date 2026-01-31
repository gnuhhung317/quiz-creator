
import React from 'react';
import katex from 'katex';

interface LatexTextProps {
  text: string;
  className?: string;
}

const LatexText: React.FC<LatexTextProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Regex to split the text into parts:
  // 1. Block math: $$ ... $$
  // 2. Block math: \[ ... \]
  // 3. Inline math: $ ... $ (excluding escaped \$)
  // 4. Inline math: \( ... \)
  const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?:\$[^$]+?\$))/g;

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        // Check if the part is a math expression
        if (
          part.startsWith('$$') ||
          part.startsWith('\\[') ||
          part.startsWith('\\(') ||
          part.startsWith('$')
        ) {
          try {
            let expression = part;
            let displayMode = false;

            // Strip delimiters and determine display mode
            if (part.startsWith('$$')) {
              expression = part.slice(2, -2);
              displayMode = true;
            } else if (part.startsWith('\\[')) {
              expression = part.slice(2, -2);
              displayMode = true;
            } else if (part.startsWith('\\(')) {
              expression = part.slice(2, -2);
              displayMode = false;
            } else if (part.startsWith('$')) {
              expression = part.slice(1, -1);
              displayMode = false;
            }

            const html = katex.renderToString(expression, {
              throwOnError: false,
              displayMode: displayMode,
            });

            return (
              <span
                key={index}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch (e) {
            console.error("KaTeX rendering error:", e);
            return <span key={index}>{part}</span>;
          }
        } else {
          // Regular text (preserves line breaks if needed)
          return <span key={index}>{part}</span>;
        }
      })}
    </span>
  );
};

export default LatexText;
