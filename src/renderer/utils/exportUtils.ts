import { ThemeType } from '../types'

const EXPORT_THEME_TOKENS: Record<
  ThemeType,
  { bg: string; text: string; secondary: string; link: string; border: string; codeBg: string }
> = {
  light: {
    bg: '#FAF8F3',
    text: '#2C2C2C',
    secondary: '#5C5C5C',
    link: '#2E5C8A',
    border: 'rgba(0,0,0,0.08)',
    codeBg: '#F5F2EB',
  },
  dark: {
    bg: '#0D1117',
    text: '#E8E4DF',
    secondary: '#B8B4AF',
    link: '#7AB8E8',
    border: 'rgba(255,255,255,0.12)',
    codeBg: '#161B22',
  },
  sepia: {
    bg: '#F4ECD8',
    text: '#4A4035',
    secondary: '#6A6055',
    link: '#4A6A8A',
    border: 'rgba(74,64,53,0.15)',
    codeBg: '#EFE6D2',
  },
  midnight: {
    bg: '#000000',
    text: '#E0E0E0',
    secondary: '#A0A0A0',
    link: '#82B1FF',
    border: 'rgba(255,255,255,0.14)',
    codeBg: '#0A0A0A',
  },
}

export function toExportBaseName(fileName: string): string {
  return fileName.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') || 'document'
}

export function createExportDocument(params: {
  title: string
  htmlContent: string
  themeType: ThemeType
}): string {
  const { title, htmlContent, themeType } = params
  const theme = EXPORT_THEME_TOKENS[themeType]

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: ${themeType === 'light' || themeType === 'sepia' ? 'light' : 'dark'};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      background: ${theme.bg};
      color: ${theme.text};
      font-family: "Smiley Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
      line-height: 1.8;
    }
    .paper {
      max-width: 880px;
      margin: 0 auto;
      padding: 28px 34px;
      border: 1px solid ${theme.border};
      border-radius: 12px;
      background: ${theme.bg};
    }
    .markdown-body { color: ${theme.text}; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 1.5em;
      margin-bottom: 0.6em;
      line-height: 1.4;
      color: ${theme.text};
      font-family: "LXGW WenKai", "STKaiti", "KaiTi", serif;
    }
    .markdown-body p, .markdown-body li { color: ${theme.text}; }
    .markdown-body blockquote {
      margin: 1rem 0;
      padding: 0.75rem 1rem;
      border-left: 4px solid ${theme.border};
      color: ${theme.secondary};
      background: ${theme.codeBg};
    }
    .markdown-body a {
      color: ${theme.link};
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .markdown-body pre, .markdown-body code {
      font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
      background: ${theme.codeBg};
    }
    .markdown-body pre {
      padding: 12px;
      border-radius: 8px;
      overflow: auto;
      border: 1px solid ${theme.border};
    }
    .markdown-body code {
      padding: 0.15em 0.35em;
      border-radius: 4px;
    }
    .copy-code-btn { display: none !important; }
    .markdown-body img { max-width: 100%; height: auto; }
    @page { margin: 16mm 14mm; }
    @media print {
      body { padding: 0; }
      .paper {
        border: none;
        max-width: none;
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <main class="paper">
    <article class="markdown-body markdown-${themeType}">
      ${htmlContent}
    </article>
  </main>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
