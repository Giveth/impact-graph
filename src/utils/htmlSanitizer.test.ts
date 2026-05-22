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

  it('strips inline style attributes', () => {
    const input = '<p style="background:url(javascript:alert(1))">styled</p>';
    const out = sanitizeProjectRichText(input);
    assert.notInclude(out, 'javascript');
    assert.notInclude(out, 'style=');
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
});
