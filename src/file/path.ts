
export function resolve(path: string, from: string): string {

    if (path.match(/^['"]?data:/)) {

        return path;
    }

    // @ts-ignore
    const baseURL: URL = new URL(from, window.location);
    const pathURL: URL = new URL(path, baseURL);

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