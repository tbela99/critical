/**
 *
 * @param {string[]} content
 * @param {string} filename
 * @param {string} mimetype
 * @return {Promise<string[]>}
 */
export async function download(content, filename, mimetype = 'application/octet-stream; charset=utf-8') {

    //
    const url = URL.createObjectURL(new Blob(content, {type: mimetype}));
    //
    const a = document.createElement('a');
    document.body.append(a);
    a.style.display = 'none';
    a.download = filename;
    a.href = url;

    //
    a.dispatchEvent(new MouseEvent('click'));
    URL.revokeObjectURL(url);

    return content;
}