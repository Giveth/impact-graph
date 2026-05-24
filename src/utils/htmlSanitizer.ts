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

// A single CSS length value: a number with an optional unit (px or %), or 0,
// or the keyword `auto`. Used to build the multi-token `margin` matcher.
const CSS_LENGTH_TOKEN = '(?:auto|0|\\d+(?:\\.\\d+)?(?:px|%))';

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
      // 1–4 space-separated CSS length tokens, matching the standard
      // `margin: <top> [<right> [<bottom> [<left>]]]` shorthand. Values like
      // "autopx" or "12pxauto4" are rejected — only valid CSS shorthand
      // passes.
      margin: [
        new RegExp(`^${CSS_LENGTH_TOKEN}(?:\\s+${CSS_LENGTH_TOKEN}){0,3}$`),
      ],
      cursor: [/^[a-z-]+$/],
    },
  };

const PROJECT_RICH_TEXT_ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

// <img src> is the only place we allow `data:` URLs, and only when the MIME
// type is one of these image formats. Legacy project / cause / project_update
// rows contain base64-encoded inline images from before the editor uploaded
// to a CDN, and we need to preserve them on read and edit. Browsers do not
// execute scripts inside SVG loaded via <img>, so data:image/svg+xml is safe
// in this context.
const PROJECT_RICH_TEXT_ALLOWED_SCHEMES_BY_TAG = {
  img: ['http', 'https', 'data'],
};
const SAFE_DATA_IMAGE_URL =
  /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|bmp|x-icon)(?:;[^,]*)?,/i;

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
    allowedSchemesByTag: PROJECT_RICH_TEXT_ALLOWED_SCHEMES_BY_TAG,
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: false,
    allowedIframeHostnames: PROJECT_RICH_TEXT_ALLOWED_IFRAME_HOSTNAMES,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
      // Final guard on img: even though `data:` is in allowedSchemesByTag,
      // only let through data URLs that declare an image MIME type. This
      // blocks data:text/html or data:application/javascript payloads that
      // could otherwise piggyback on the data: allowance.
      //
      // sanitize-html itself lowercases the scheme for the allowedSchemes
      // check (so `DATA:`/`Data:` pass scheme filtering), so the
      // `data:`-prefix detection here has to be case-insensitive too —
      // otherwise a mixed-case `DATA:text/html,<script>…</script>` would
      // skip MIME validation entirely.
      img: (tagName, attribs) => {
        const src = attribs.src ?? '';
        if (
          src.slice(0, 5).toLowerCase() === 'data:' &&
          !SAFE_DATA_IMAGE_URL.test(src)
        ) {
          delete attribs.src;
        }
        return { tagName, attribs };
      },
    },
  });
};

// Strip every tag and return only the text content. Used for length
// validation on rich-text fields — sanitize-html is a proper HTML parser, so
// this handles unclosed tags, nested tags, and other edge cases that a naive
// `.replace(/<[^>]+>/g, '')` regex misses (and that CodeQL flags as
// "incomplete multi-character sanitization").
export const getRichTextPlainLength = (html: string = ''): number => {
  if (!html) return 0;
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).length;
};
