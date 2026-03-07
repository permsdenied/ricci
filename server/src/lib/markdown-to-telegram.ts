import { Renderer, marked } from "marked";

/**
 * Converts GFM Markdown (from MDEditor) to Telegram-compatible HTML.
 *
 * Telegram supports: <b>, <i>, <s>, <u>, <a href>, <code>, <pre>, <blockquote>
 * Everything else is stripped or converted to supported equivalents.
 */

class TelegramRenderer extends Renderer {
  // Bold: **text** / __text__
  strong({ tokens }: any): string {
    return `<b>${this.parser.parseInline(tokens)}</b>`;
  }

  // Italic: _text_ / *text*
  em({ tokens }: any): string {
    return `<i>${this.parser.parseInline(tokens)}</i>`;
  }

  // Strikethrough: ~~text~~
  del({ tokens }: any): string {
    return `<s>${this.parser.parseInline(tokens)}</s>`;
  }

  // Inline code: `text`
  codespan({ text }: any): string {
    return `<code>${escapeHtml(text)}</code>`;
  }

  // Code block: ```lang\ncode\n```
  code({ text }: any): string {
    return `<pre><code>${escapeHtml(text)}</code></pre>\n\n`;
  }

  // Hyperlink: [text](url)
  link({ href, tokens }: any): string {
    const text = this.parser.parseInline(tokens);
    return `<a href="${href}">${text}</a>`;
  }

  // Image: ![alt](url) → link (Telegram can't embed images in text)
  image({ href, text }: any): string {
    return `<a href="${href}">${text || href}</a>`;
  }

  // Headings → bold
  heading({ tokens }: any): string {
    return `<b>${this.parser.parseInline(tokens)}</b>\n\n`;
  }

  // Paragraph
  paragraph({ tokens }: any): string {
    return `${this.parser.parseInline(tokens)}\n\n`;
  }

  // Blockquote
  blockquote({ tokens }: any): string {
    const inner = this.parser.parse(tokens).trim();
    return `<blockquote>${inner}</blockquote>\n\n`;
  }

  // List item
  listitem({ tokens }: any): string {
    return `• ${this.parser.parseInline(tokens)}\n`;
  }

  // Ordered / unordered list
  list({ items }: any): string {
    return items.map((item: any) => this.listitem(item)).join("") + "\n";
  }

  // Line break
  br(): string {
    return "\n";
  }

  // Horizontal rule
  hr(): string {
    return "\n";
  }

  // Space between blocks
  space(): string {
    return "";
  }
}

export function markdownToTelegramHtml(md: string): string {
  const renderer = new TelegramRenderer();
  const html = marked.parse(md, { renderer }) as string;
  return html.replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
