import {extract} from "./critical/extract";
import {download} from "./file/download";
import {fontscript} from "./critical/fontscript";
import {CriticalExtractOptions, CriticalResult} from "./@types";

async function extractAndDownload(filename: string = 'critical.css', options: CriticalExtractOptions = {}): Promise<CriticalResult> {

    return extract(options).
        then(async (content : CriticalResult): Promise<CriticalResult> => download(<string[]>content.styles, filename, 'text/css; charset=utf-8').
            then(async () => {

                if ((<string[]>content.fonts).length > 0) {

                    // @ts-ignore
                    return download([fontscript(<string[]>content.fonts)], filename.replace(/\.css$/, '.js'), 'text/javascript; charset=utf-8');
                }
        }).
        then(() => content)
    );
}

export {extract, fontscript, extractAndDownload as download}