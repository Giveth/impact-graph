import { assert } from 'chai';
import { sanitizeProjectRichText } from './htmlSanitizer';

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
});
