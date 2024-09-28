/**
 *
 * generate download file
 */
export async function download(content: Array<string>, filename: string, mimetype: string = 'application/octet-stream; charset=utf-8'): Promise<Array<string>> {

    //
    const url: string = URL.createObjectURL(new Blob(content, {type: mimetype}));
    // @ts-ignore
    const a: HTMLAnchorElement = document.createElement('a');
    // @ts-ignore
    document.body.append(a);
    a.style.display = 'none';
    a.download = filename;
    a.href = url;

    // @ts-ignore
    a.dispatchEvent(new MouseEvent('click'));
    URL.revokeObjectURL(url);

    return content;
}