import { assert } from 'chai';
import {
  getRichTextPlainLength,
  sanitizeProjectRichText,
} from './htmlSanitizer';

describe('sanitizeProjectRichText', () => {
  it('preserves benign Quill-style markup', () => {
    const input =
      '<p><strong>hello</strong> <em>world</em></p><ul><li>one</li></ul>';
    assert.equal(sanitizeProjectRichText(input), input);
  });

  it('preserves benign block tags like div', () => {
    const input = '<div>TestProjectUpdate</div>';
    assert.equal(sanitizeProjectRichText(input), input);
  });

  it('strips script tags', () => {
    const input = '<p>hi</p><script>alert(1)</script>';
    assert.equal(sanitizeProjectRichText(input), '<p>hi</p>');
  });

  it('strips inline event handler attributes (img onerror)', () => {
    const input =
      '<p>hello</p><img src="x" onerror="document.body.setAttribute(\'data-xss\',\'1\')">';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'onerror');
    assert.notInclude(out, 'document.body');
    assert.include(out, '<p>hello</p>');
  });

  it('strips javascript: URLs from anchors', () => {
    const input = '<a href="javascript:alert(1)">click</a>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'javascript:');
  });

  it('drops disallowed iframe hostnames', () => {
    const input = '<iframe src="https://evil.example.com/x"></iframe>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'evil.example.com');
  });

  it('keeps allowed iframe hostnames (YouTube)', () => {
    const input =
      '<iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe>';
    const out = sanitizeProjectRichText(input);
    assert.include(out, 'youtube.com/embed/abc');
  });

  it('strips inline style on non-image tags', () => {
    const input = '<p style="background:url(javascript:alert(1))">styled</p>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'javascript');
    assert.notInclude(out, 'style=');
  });

  it('keeps Quill ImageResize sizing styles on img', () => {
    const input =
      '<img src="https://example.com/x.png" style="cursor: nwse-resize; display: block; margin: 0px auto; width: 300px;">';
    const out = sanitizeProjectRichText(input);
    assert.include(out, 'width:300px');
    assert.include(out, 'display:block');
    assert.include(out, 'cursor:nwse-resize');
  });

  it('strips dangerous style values on img even when style is allowed', () => {
    const input =
      '<img src="https://example.com/x.png" style="width: 100px; background: url(javascript:alert(1));">';
    const out = sanitizeProjectRichText(input);
    assert.include(out, 'width:100px');
    assert.notInclude(out, 'javascript');
    assert.notInclude(out, 'background');
  });

  it('strips IE expression() payloads from img style', () => {
    const input =
      '<img src="https://example.com/x.png" style="width: 100px; width: expression(alert(1));">';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'expression');
    assert.notInclude(out, 'alert(1)');
  });

  it('rejects malformed margin values like "autopx"', () => {
    const input =
      '<img src="https://example.com/x.png" style="margin: autopx; width: 100px;">';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'autopx');
    assert.include(out, 'width:100px');
  });

  it('keeps well-formed margin shorthand (1–4 tokens)', () => {
    const inputs = [
      '<img src="https://example.com/x.png" style="margin: auto;">',
      '<img src="https://example.com/x.png" style="margin: 0px auto;">',
      '<img src="https://example.com/x.png" style="margin: 10px 5%;">',
      '<img src="https://example.com/x.png" style="margin: 1px 2px 3px 4px;">',
    ];
    for (const input of inputs) {
      const out = sanitizeProjectRichText(input);
      assert.include(out, 'margin:', `expected margin preserved for: ${input}`);
    }
  });

  it('strips svg/use exfiltration vectors', () => {
    const input = '<svg><use href="data:image/svg+xml;base64,xxx"/></svg>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, '<svg');
    assert.notInclude(out, '<use');
  });

  it('forces anchors to open in a new tab with safe rel', () => {
    const input = '<a href="https://giveth.io">link</a>';
    const out = sanitizeProjectRichText(input);
    assert.include(out, 'rel="noopener noreferrer"');
    assert.include(out, 'target="_blank"');
  });

  it('returns empty string for empty input', () => {
    assert.equal(sanitizeProjectRichText(''), '');
    assert.equal(sanitizeProjectRichText(undefined as unknown as string), '');
  });

  it('keeps <strike> alongside <s> for legacy Quill output', () => {
    const input = '<strike>old price</strike><s>new price</s>';
    assert.equal(sanitizeProjectRichText(input), input);
  });

  it('keeps id on heading tags for anchor links', () => {
    const input = '<h2 id="my-section">Section</h2>';
    assert.equal(sanitizeProjectRichText(input), input);
  });

  it('keeps Quill emoji blot data-name on span', () => {
    const input = '<span class="ql-emojiblot" data-name="grinning">😀</span>';
    const out = sanitizeProjectRichText(input);
    assert.include(out, 'data-name="grinning"');
    assert.include(out, 'class="ql-emojiblot"');
  });

  it('keeps title attribute on anchors, images, and iframes', () => {
    const inputs = [
      '<a href="https://giveth.io" title="home">link</a>',
      '<img src="https://example.com/x.png" title="hero">',
      '<iframe src="https://www.youtube.com/embed/abc" title="video"></iframe>',
    ];
    for (const input of inputs) {
      const out = sanitizeProjectRichText(input);
      assert.include(out, 'title=');
    }
  });

  it('is idempotent — sanitizing twice yields the same output', () => {
    const input =
      '<p>hello <strong>world</strong></p><img src="https://example.com/x.png" style="width: 300px;"><a href="https://giveth.io">link</a>';
    const once = sanitizeProjectRichText(input);
    const twice = sanitizeProjectRichText(once);
    assert.equal(once, twice);
  });

  it('preserves legacy base64 image src on <img> (PNG, JPEG, GIF, WebP, SVG)', () => {
    const inputs = [
      '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB">',
      '<img src="data:image/jpeg;base64,/9j/4AAQSkZJRgAB">',
      '<img src="data:image/jpg;base64,/9j/4AAQSkZJRgAB">',
      '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAP">',
      '<img src="data:image/webp;base64,UklGRiQAAABXRUJQ">',
      '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0i">',
    ];
    for (const input of inputs) {
      const out = sanitizeProjectRichText(input);
      assert.include(
        out,
        'data:image/',
        `expected data: image preserved for: ${input}`,
      );
    }
  });

  it('strips non-image data: URLs on <img>', () => {
    const inputs = [
      '<img src="data:text/html,<script>alert(1)</script>">',
      '<img src="data:application/javascript;base64,YWxlcnQoMSk=">',
      '<img src="data:text/plain,hello">',
    ];
    for (const input of inputs) {
      const out = sanitizeProjectRichText(input);
      assert.notInclude(
        out,
        'data:text',
        `expected text data: stripped from: ${input}`,
      );
      assert.notInclude(
        out,
        'data:application',
        `expected application data: stripped from: ${input}`,
      );
    }
  });

  it('does not allow data: URLs on anchors', () => {
    const input = '<a href="data:text/html,<script>alert(1)</script>">x</a>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'data:');
  });
});

describe('getRichTextPlainLength', () => {
  it('returns 0 for empty or undefined input', () => {
    assert.equal(getRichTextPlainLength(''), 0);
    assert.equal(getRichTextPlainLength(undefined as unknown as string), 0);
  });

  it('counts only text content, ignoring tags and attributes', () => {
    assert.equal(getRichTextPlainLength('<p>hello</p>'), 5);
    assert.equal(
      getRichTextPlainLength('<a href="https://giveth.io">link</a>'),
      4,
    );
  });

  it('handles unclosed and partial tags safely (no regex pitfalls)', () => {
    // A naive /<[^>]+>/g regex would leave "<script alert(1)" intact and
    // miscount. sanitize-html parses HTML properly so the count is correct.
    assert.equal(getRichTextPlainLength('hello <script alert(1)'), 6);
  });
});
