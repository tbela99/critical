/**
 *
 * @param {string[]} content
 * @param {string} filename
 * @param {string} mimetype
 * @return {Promise<string[]>}
 */
export async function download(content: Array<string>, filename: string, mimetype: string = 'application/octet-stream; charset=utf-8'): Promise<Array<string>> {

    //
    const url: string = URL.createObjectURL(new Blob(content, {type: mimetype}));
    //
    const a: HTMLAnchorElement = document.createElement('a');
    document.body.append(a);
    a.style.display = 'none';
    a.download = filename;
    a.href = url;

    //
    a.dispatchEvent(new MouseEvent('click'));
    URL.revokeObjectURL(url);

    return content;
}