/**
 * Simple regex-based markdown renderer for runbook content.
 * Content is created by authenticated EDITOR/ADMIN users only.
 * HTML entities are escaped before inline processing to prevent injection.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function processInline(text: string): string {
  let processed = escapeHtml(text);

  // Inline code (before bold/italic to avoid conflicts)
  processed = processed.replace(
    /`([^`]+)`/g,
    '<code class="bg-[var(--bg-hover)] rounded px-1 py-0.5 text-sm font-mono text-[var(--text-primary)]">$1</code>'
  );

  // Bold
  processed = processed.replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>"
  );

  // Italic
  processed = processed.replace(/\*([^*]+)\*/g, "<em>$1</em>");

  // Links — only allow http/https URLs
  processed = processed.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" class="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  return processed;
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.split("\n");
  const htmlLines: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        const escaped = escapeHtml(codeBlockContent.join("\n"));
        htmlLines.push(
          `<pre class="bg-[var(--bg-primary)] p-4 rounded-lg overflow-x-auto my-3"><code class="text-sm font-mono text-[var(--text-secondary)]">${escaped}</code></pre>`
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Close any open list before code block
        if (inList) {
          htmlLines.push("</ul>");
          inList = false;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line — close list, add paragraph break
    if (line.trim() === "") {
      if (inList) {
        htmlLines.push("</ul>");
        inList = false;
      }
      htmlLines.push('<div class="h-3"></div>');
      continue;
    }

    // Headings (check raw line before inline processing)
    if (line.startsWith("### ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(
        `<h3 class="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-2">${processInline(line.slice(4))}</h3>`
      );
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(
        `<h2 class="text-xl font-bold text-[var(--text-primary)] mt-6 mb-2">${processInline(line.slice(3))}</h2>`
      );
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { htmlLines.push("</ul>"); inList = false; }
      htmlLines.push(
        `<h1 class="text-2xl font-bold text-[var(--text-primary)] mt-6 mb-3">${processInline(line.slice(2))}</h1>`
      );
      continue;
    }

    // List items
    if (/^[-*]\s/.test(line)) {
      if (!inList) {
        htmlLines.push(
          '<ul class="list-disc list-inside space-y-1 my-2">'
        );
        inList = true;
      }
      htmlLines.push(
        `<li class="text-sm text-[var(--text-secondary)]">${processInline(line.replace(/^[-*]\s/, ""))}</li>`
      );
      continue;
    }

    // Close list if not a list item
    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }

    // Regular paragraph
    htmlLines.push(
      `<p class="text-sm text-[var(--text-secondary)] leading-relaxed">${processInline(line)}</p>`
    );
  }

  // Close any open blocks
  if (inList) {
    htmlLines.push("</ul>");
  }
  if (inCodeBlock && codeBlockContent.length > 0) {
    const escaped = escapeHtml(codeBlockContent.join("\n"));
    htmlLines.push(
      `<pre class="bg-[var(--bg-primary)] p-4 rounded-lg overflow-x-auto my-3"><code class="text-sm font-mono text-[var(--text-secondary)]">${escaped}</code></pre>`
    );
  }

  return htmlLines.join("\n");
}

export function MarkdownRenderer({ content }: { content: string }) {
  const html = renderMarkdown(content);
  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
