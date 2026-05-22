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

const PROJECT_RICH_TEXT_ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] =
  {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    iframe: [
      'src',
      'width',
      'height',
      'frameborder',
      'allow',
      'allowfullscreen',
    ],
    span: ['class'],
    div: ['class'],
    p: ['class'],
    ol: ['class'],
    ul: ['class'],
    li: ['class', 'data-list'],
    pre: ['class'],
    code: ['class'],
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
    allowedSchemes: PROJECT_RICH_TEXT_ALLOWED_SCHEMES,
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    allowedIframeHostnames: PROJECT_RICH_TEXT_ALLOWED_IFRAME_HOSTNAMES,
    // Strip inline style entirely — it is a frequent XSS vector via
    // expression(), url(javascript:...), and CSS-based exfiltration.
    allowedStyles: {},
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  });
};
