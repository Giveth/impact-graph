/* eslint-disable no-irregular-whitespace */
import { assert } from 'chai';
import { getCreatedAtFromMongoObjectId, getHtmlTextSummary } from './utils';
import { SUMMARY_LENGTH } from '../constants/summary';

describe('getHtmlTextSummary test cases', getHtmlTextSummaryTestCases);
describe(
  'getCreatedAtFromMongoObjectId test cases',
  getCreatedAtFromMongoObjectIdTestCases,
);

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

  it('should remove images and link href', () => {
    const html = `
    <p><img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+'></p><p><img src='https://next.giveth.io/_next/image?url=%2Fimages%2Fgiveth-logo-blue.svg&amp;w=128&amp;q=75'></p><p><a href='https://next.giveth.io/' target='_blank'>Home</a></p><p><a href='https://next.giveth.io/projects' target='_blank'>Projects</a></p><p><a href='https://liquidity-mining-dapp.vercel.app/' target='_blank'>GIVeconomy</a></p><p><a href='https://next.giveth.io/join' target='_blank'>Community</a></p><p>CREATE A PROJECT</p><p><img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+'></p><p><img src='https://next.giveth.io/_next/image?url=%2Fimages%2FGIV_menu-01.svg&amp;w=48&amp;q=75'></p><p>0</p><p><img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+'></p><p><img src='https://next.giveth.io/_next/image?url=%2F_next%2Fstatic%2Fimage%2Fpublic%2Fimages%2Fdefault_user_profile.9d4b202733e6d1ce5eaf1584ec31d658.png&amp;w=64&amp;q=75'></p><p>Ram camp owner</p><p>Connected to&nbsp;xDAI</p><p><br></p><p><img src='https://giveth.mypinata.cloud/ipfs/QmYKoSuj7VzLFVntMhjKqb5BNpS5hip6TTSWVZRQCcpuDZ'>Ram third metamask<a href='https://next.giveth.io/user/0x10a84b835c5df26f2a380b3e00bcc84a66cd2d34' target='_blank'>by Ram Meta</a></p><p><br></p><p>Iraq</p><p>Description</p><p>Updates0</p><p>Donations</p><p>Traces</p><p>What is your project about?How To Write A Great Project Description</p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p>DONATE</p><p><br></p><p>Traceable</p><p>GIVERS:&nbsp;0</p><p>DONATIONS:&nbsp;0</p><p>COMMUNITY</p><p>FOOD</p><p><br></p><p>1</p><p><br></p><p>Share</p><p><img src='https://next.giveth.io/images/giverBadge@40x40.png'>Be the first to give!</p><p>Your early support will go a long way and help inspire others to donate.</p><p><br></p><p><a href='https://next.giveth.io/' target='_blank'><img src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmVyc2lvbj0iMS4xIi8+'></a></p><p><a href='https://next.giveth.io/' target='_blank'><img src='https://next.giveth.io/_next/image?url=%2Fimages%2Fgiveth-logo-blue.svg&amp;w=96&amp;q=75'></a></p><p><a href='https://next.giveth.io/' target='_blank'>Home</a></p><p><a href='https://next.giveth.io/projects' target='_blank'>Projects</a></p><p><a href='https://next.giveth.io/about' target='_blank'>About Us</a></p><p><a href='https://next.giveth.io/faq' target='_blank'>FAQ</a></p><p><a href='https://next.giveth.io/support' target='_blank'>Support</a></p><p><a href='https://next.giveth.io/join' target='_blank'>Join Our Community</a></p><p><a href='https://docs.giveth.io/whatisgiveth/' target='_blank'>What is Giveth?&nbsp;</a></p><p><a href='https://docs.giveth.io/dapps/' target='_blank'>User Guides&nbsp;</a></p><p><a href='https://docs.giveth.io/dapps/givethioinstallation' target='_blank'>Developer Docs&nbsp;</a></p><p><a href='https://next.giveth.io/tos' target='_blank'>Terms of Use</a></p><p><a href='https://trace.giveth.io/' target='_blank'>Giveth TRACE&nbsp;</a></p><p><a href='https://commonsstack.org/' target='_blank'>Commons Stack&nbsp;</a></p><p><a href='https://next.giveth.io/partnerships' target='_blank'>Partnerships</a></p><p><a href='https://docs.giveth.io/jobs/' target='_blank'>We\`'re Hiring!&nbsp;</a></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p><br></p><p>Support us&nbsp;<a href='https://next.giveth.io/donate/giveth-2021:-retreat-to-the-future' target='_blank'>with your donation</a></p><p>MMXXI&nbsp;- No Rights Reserved -&nbsp;<a href='https://wiki.giveth.io/dac/' target='_blank'>The Giveth DAC</a></p><p><br></p>`;
    const expectedOutput = `Home
Projects
GIVeconomy
Community
CREATE A PROJECT
0
Ram camp owner
Connected to xDAI
Ram third metamaskby Ram Meta
Iraq
Description
Updates0
Donations
Traces
What is your project about?How To Write A Great Project Description
DONATE
Traceable
GIVERS: 0
DONATIONS: 0
COMMUNITY
FOOD
1
Share
Be the first to give!
Your early support will go a long way and help inspire others to donate.
Home
Projects
About Us
FAQ
Support
Join Our Community
What is Giveth? 
User Guides 
Developer Docs 
Terms of Use
Giveth TRACE 
Commons Stack 
Partnerships
We\`'re Hiring! 
Support us with your donation
MMXXI - No Rights Reserved - The Giveth DAC`;
    const text = getHtmlTextSummary(html, expectedOutput.length);
    assert.equal(text, expectedOutput);
  });
}

function getCreatedAtFromMongoObjectIdTestCases() {
  // success scenario test case
  it('should return correct date for valid mongo object id', () => {
    const date = getCreatedAtFromMongoObjectId('65a90d86d3a1115b4ebc0731');
    assert.equal(date.getTime(), 1705577862000);
  });
}
