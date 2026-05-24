import sanitizeHtml from 'sanitize-html';

// Allowlist aligned with what the Quill editor in giveth-dapps-v2 can produce
// for project updates and project descriptions. Anything outside this list is
// stripped before content is persisted, preventing stored XSS via the
// dangerouslySetInnerHTML render path on the frontend.
const PROJECT_RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'br',
  'span',
  'div',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  // Older Quill versions emit <strike> for the strikethrough format
  // (newer ones emit <s>) — keep both.
  'strike',
  'sub',
  'sup',
  'blockquote',
  'pre',
  'code',
  'ol',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
  'img',
  'iframe',
];

// Attributes that are safe on any tag in the allowlist. `id` lets Quill emit
// stable anchors for headings; `class` is what Quill uses for alignment,
// indent, video wrapper, emoji blot, etc.; `title` is the standard tooltip.
const GLOBAL_ATTRIBUTES = ['id', 'class', 'title'];

const PROJECT_RICH_TEXT_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] =
  {
    '*': GLOBAL_ATTRIBUTES,
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'style'],
    iframe: [
      'src',
      'width',
      'height',
      'frameborder',
      'allow',
      'allowfullscreen',
    ],
    // Quill's emoji blot persists the emoji shortname via data-name on a span,
    // and its mention-style blots use data-id / data-value the same way.
    span: ['data-name', 'data-id', 'data-value'],
    li: ['data-list'],
  };

// Inline `style` is allowed only on <img>, and only for the specific CSS
// properties Quill's ImageResize plugin uses to persist sizing and layout.
// Values are validated by regex so url(javascript:...), expression(), etc.
// cannot slip through.
const PROJECT_RICH_TEXT_ALLOWED_STYLES: sanitizeHtml.IOptions['allowedStyles'] =
  {
    img: {
      width: [/^\d+(?:\.\d+)?(?:px|%)?$/],
      height: [/^\d+(?:\.\d+)?(?:px|%)?$/],
      float: [/^(?:left|right|none)$/],
      display: [/^(?:block|inline|inline-block)$/],
      margin: [/^[\d.\s%pxauto]+$/],
      cursor: [/^[a-z-]+$/],
    },
  };

const PROJECT_RICH_TEXT_ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

// Only allow iframe embeds from hostnames Giveth already uses for embedded
// media. Anything else (e.g. attacker-controlled iframe src) is dropped.
const PROJECT_RICH_TEXT_ALLOWED_IFRAME_HOSTNAMES = [
  'www.youtube.com',
  'youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
];

export const sanitizeProjectRichText = (html: string = ''): string => {
  if (!html) return html;

  return sanitizeHtml(html, {
    allowedTags: PROJECT_RICH_TEXT_ALLOWED_TAGS,
    allowedAttributes: PROJECT_RICH_TEXT_ALLOWED_ATTRIBUTES,
    allowedStyles: PROJECT_RICH_TEXT_ALLOWED_STYLES,
    allowedSchemes: PROJECT_RICH_TEXT_ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    allowedIframeHostnames: PROJECT_RICH_TEXT_ALLOWED_IFRAME_HOSTNAMES,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  });
};
