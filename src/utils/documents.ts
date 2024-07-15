import { pinFileDataBase64 } from '../middleware/pinataUtils.js';

export async function changeBase64ToIpfsImageInHTML(
  html: string,
): Promise<string> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Find image with base64
    const regex = /<img\ssrc="(data:image\/[^;]+;base64,[^"]+)"/g;
    const match = regex.exec(html);

    if (!match) break;

    const base64 = match[1];
    const pinResponse = await pinFileDataBase64(base64, undefined);
    const url = `${process.env.PINATA_GATEWAY_ADDRESS}/ipfs/${pinResponse.IpfsHash}`;

    const startIndex = match.index + '<img src="'.length;
    const endIndex = startIndex + base64.length;
    // Replace base64 with ipfs url
    html = html.slice(0, startIndex) + url + html.slice(endIndex);
  }
  return html;
}
