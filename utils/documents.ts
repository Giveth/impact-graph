import HTMLToPDF from "wkhtmltopdf";

const Handlebars = require("handlebars")
const path = require("path")
const fs = require("fs")
const util = require("util")

const readFile = util.promisify(fs.readFile)

export async function generateHTMLDocument (name: string, data: any) {
    const raw = await readFile(path.join(__dirname, "../docs/html/" + name + ".html"), "utf-8");

    return Handlebars.compile(raw)(data);
}

export async function generatePDFDocument (name: string, data: any): Promise<String> {
    const html = await generateHTMLDocument(name, data);
    
    return new Promise(async (done, err) => {
        const stream = HTMLToPDF(html);
        const chunks: any[] = [];

        stream
          .on('data', d => {
            chunks.push(d)
          })
          .on('end', async function () {
            const buf = Buffer.concat(chunks);
            return done(buf.toString("base64"));
          })
          .on('error', err);
    });

}