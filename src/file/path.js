/**
 * resolve to absolute for external urls, relative for same domain
 * @param {string} path
 * @param {string} from
 * @returns {string}
 */
export function resolve(path, from) {

    if (path.match(/^['"]?data:/)) {

        return path;
    }

    const baseURL = new URL(from, window.location);
    const pathURL = new URL(path, baseURL);

    if (baseURL.protocol != pathURL.protocol ||
        baseURL.host != pathURL.host ||
        pathURL.host != window.location.host ||
        baseURL.port != pathURL.port ||
        pathURL.port != window.location.port ||
        baseURL.port != pathURL.port ||
        pathURL.protocol != window.location.protocol
    ) {

        return pathURL.toString();
    }

    return pathURL.pathname + pathURL.search + pathURL.hash;
}