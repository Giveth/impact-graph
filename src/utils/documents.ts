import HTMLToPDF from 'html-pdf-node';
import { pinFileDataBase64 } from '../middleware/pinataUtils';

// tslint:disable-next-line:no-var-requires
const Handlebars = require('handlebars');
// tslint:disable-next-line:no-var-requires
const path = require('path');
// tslint:disable-next-line:no-var-requires
const fs = require('fs');
// tslint:disable-next-line:no-var-requires
const util = require('util');

const readFile = util.promisify(fs.readFile);

export async function generateHTMLDocument(name: string, data: any) {
  const raw = await readFile(
    path.join(__dirname, '../docs/html/' + name + '.html'),
    'utf-8',
  );

  return Handlebars.compile(raw)(data);
}

export async function generatePDFDocument(
  name: string,
  data: any,
): Promise<String> {
  const html = await generateHTMLDocument(name, data);
  const buf = await HTMLToPDF.generatePdf({ content: html }, { format: 'A4' });

  // fs.writeFileSync("test.pdf", buf)

  return buf.toString('base64');
}

export async function changeBase64ToIpfsImageInHTML(
  html: string,
): Promise<string> {
  while (true) {
    // Find image with base64
    const regex = /<img\ssrc="(data:image\/[^;]+;base64,[^"]+)"/g;
    const match = regex.exec(html);

    if (!match) break;

    const base64 = match[1];
    const pinResponse = await pinFileDataBase64(base64, undefined, 'base64');
    const url = `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${pinResponse.IpfsHash}`;

    const startIndex = match.index + '<img src="'.length;
    const endIndex = startIndex + base64.length;
    // Replace base64 with ipfs url
    html = html.slice(0, startIndex) + url + html.slice(endIndex);
  }
  return html;
}
