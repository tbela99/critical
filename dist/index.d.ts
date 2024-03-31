type BrowserOptions = 'chromium' | 'firefox' | 'webkit' | 'edge' | 'chrome';

interface CriticalDimension {

    width: number,
    height: number
}

interface CriticalOptions {

    width?: number;
    height?: number;
    browser?: BrowserOptions;
    dimensions?: string | Array<string> | Array<CriticalDimension>;
    screenshot?: boolean | string | { path: string };
    randomUserAgent?: boolean;
    fonts?: boolean;
    headless?: boolean;
    console?: boolean;
    secure?: boolean;
    filename?: string;
    container?: boolean;
    html?: boolean;
    output?: string;
    pause?: number;
}

interface CriticalCliStats {
    width: number,
    height: number,
    stats: {
        nodeCount: number,
        stats: Array<{
            name: string,
            duration: string
        }>
    }
}

interface CriticalCliResult {
    fonts: Array<string>,
    stats: Array<CriticalCliStats>,
    styles: any[];
    html: string
}

declare function critical(url: string, options?: CriticalOptions): Promise<CriticalCliResult>;

export { critical };
