import { getHtmlTextSummary } from './utils';
import { assert } from 'chai';
import { SUMMARY_LENGTH } from '../constants/summary';

describe('getHtmlTextSummary test cases', getHtmlTextSummaryTestCases);

function getHtmlTextSummaryTestCases() {
  it('should return empty string on negative length limit', () => {
    const textSummary = getHtmlTextSummary('<div>Hello</div>', -10);
    assert.isEmpty(textSummary);
  });

  it('should return correct summary - short', () => {
    const textSummary = getHtmlTextSummary('<div>Hello</div>', 10);
    assert.equal(textSummary, 'Hello');
  });

  it('should return correct summary - long', () => {
    const REPEAT_TIMES = 20;
    const html = `
    <div>
      This is the outer text
      ${'<div>This is the inner text</div>'.repeat(REPEAT_TIMES)}
    </div>
    `;

    const expectedResult = [
      'This is the outer text',
      ...new Array(REPEAT_TIMES).fill('This is the inner text'),
    ].join('\n');
    const textSummary = getHtmlTextSummary(html, 1000);
    assert.equal(textSummary, expectedResult);
  });

  it('should truncate summary', () => {
    const FIRST_LINE = `First Line`;
    const SECOND_LINE = `Second Line`;
    const html = `
    <div>
       <div>
        ${FIRST_LINE}
       </div>
       <div>
        ${SECOND_LINE}
       </div>
    </div>
`;
    const textSummary = getHtmlTextSummary(html, 'First line'.length + 3);
    assert.equal(textSummary, FIRST_LINE + '...');
  });

  it('should truncate long summary', () => {
    const REPEAT_TIMES = 1000;
    const html = `
    <div>
    ${'<div>Hello World!</div>'.repeat(REPEAT_TIMES)}
    </div>
    `;

    const expectedSummary =
      new Array(REPEAT_TIMES)
        .fill('Hello World!')
        .join('\n')
        .slice(0, SUMMARY_LENGTH - 3) + '...';
    const textSummary = getHtmlTextSummary(html);
    assert.equal(textSummary, expectedSummary);
  });
}
