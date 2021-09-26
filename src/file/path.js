/**
 * resolve to absolute for external urls, relative for same domain
 * @param {string} path
 * @param {string} from
 * @returns {string}
 */
export function resolve(path, from) {

    if (path.substr(0, 5) === 'data:') {

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

    const base = baseURL.pathname.split('/');
    const tokens = pathURL.pathname.split('/');

    while (tokens.length > 0 && base.length > 0) {

        if (tokens[0] != base[0]) {

            break;
        }

        base.shift();
        tokens.shift();
    }

    let length = base.length;
    while (length-- > 1) {

        tokens.unshift('..');
    }

    return tokens.join('/') + pathURL.search;
}