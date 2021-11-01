import {extract} from "./critical/extract";
import {download} from "./file/download";
import {fontscript} from "./critical/fontscript";

/**
 *
 * @param {string} filename
 * @return {Promise<{styles: string[], fonts: object[]}>}
 */
async function extractAndDownload(filename = 'critical.css', options = {}) {

    return extract(options).then(async content => {
        await download(content.styles, filename, 'text/css; charset=utf-8').then(async () => {

            if (content.fonts.length > 0) {

                await download([fontscript(content.fonts)], filename.replace(/\.css$/, '.js'), 'text/javascript; charset=utf-8');
            }
        });

        return content
    });
}

export {extract, fontscript, extractAndDownload as download}