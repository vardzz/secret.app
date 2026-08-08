import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { SandboxedPreview } from './SandboxedPreview';

interface MarkdownEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent, onContentChange }) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    onContentChange(newContent);
  };

  const sanitizedHtml = useMemo(() => {
    if (mode === 'preview') {
      const rawHtml = marked.parse(content, { async: false }) as string;
      // DOMPurify strips scripts, inline handlers, and javascript: URIs by default.
      return DOMPurify.sanitize(rawHtml);
    }
    return '';
  }, [content, mode]);

  return (
    <div className="flex flex-col h-full w-full rounded-lg bg-surface-base border border-subtle overflow-hidden">
      <div className="flex items-center justify-end px-4 py-2 border-b border-subtle">
        <div className="flex space-x-2">
          <button
            onClick={() => setMode('write')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'write'
                ? 'bg-bone text-obsidian font-medium'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              mode === 'preview'
                ? 'bg-bone text-obsidian font-medium'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Preview
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {mode === 'write' ? (
          <textarea
            value={content}
            onChange={handleChange}
            className="w-full h-full p-6 bg-transparent text-text-primary resize-none outline-none font-mono focus:ring-0 border-none"
            placeholder="Write your note here..."
            spellCheck={false}
          />
        ) : (
          <SandboxedPreview htmlContent={sanitizedHtml} />
        )}
      </div>
    </div>
  );
};
