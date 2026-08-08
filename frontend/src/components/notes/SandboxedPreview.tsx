import React, { useMemo } from 'react';

interface SandboxedPreviewProps {
  htmlContent: string;
}

export const SandboxedPreview: React.FC<SandboxedPreviewProps> = ({ htmlContent }) => {
  const fullHtml = useMemo(() => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            :root {
              --color-obsidian: rgb(15, 14, 13);
              --color-bone: rgb(244, 237, 228);
              --surface-base: var(--color-obsidian);
              --text-primary: var(--color-bone);
              --text-secondary: rgba(244, 237, 228, 0.64);
              --border-subtle: rgba(244, 237, 228, 0.08);
            }
            body {
              background-color: var(--surface-base);
              color: var(--text-primary);
              font-family: 'Inter', system-ui, sans-serif;
              padding: 1.5rem;
              margin: 0;
              line-height: 1.6;
            }
            h1, h2, h3, h4, h5, h6 {
              font-weight: 500;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            a {
              color: var(--text-primary);
              text-decoration: underline;
              text-underline-offset: 4px;
            }
            code {
              font-family: 'JetBrains Mono', 'IBM Plex Mono', monospace;
              background-color: rgba(244, 237, 228, 0.08);
              padding: 0.2em 0.4em;
              border-radius: 4px;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            pre {
              background-color: rgba(244, 237, 228, 0.03);
              padding: 1rem;
              border-radius: 6px;
              border: 1px solid var(--border-subtle);
              overflow-x: auto;
            }
            blockquote {
              border-left: 4px solid var(--border-subtle);
              padding-left: 1rem;
              margin-left: 0;
              color: var(--text-secondary);
            }
            img {
              max-width: 100%;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;
  }, [htmlContent]);

  return (
    <iframe
      srcDoc={fullHtml}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className="w-full h-full border-none rounded-md"
      title="Markdown Preview"
    />
  );
};
