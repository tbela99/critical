type BrowserOptions = 'chromium' | 'firefox' | 'webkit' | 'edge' | 'chrome';

interface CriticalDimension {

    width: number,
    height: number
}

interface CriticalOptions {

    url?: string;
    input?: string;
    headless?: boolean;
    browser?: BrowserOptions;
    browserType?: 'mobile' | 'desktop' | 'default';
    base?: string;
    width?: number;
    height?: number;
    dimensions?: string | Array<string> | Array<CriticalDimension>;
    container?: boolean;
    secure?: boolean;
    screenshot?: boolean | string | { path: string };
    colorScheme?: 'light' | 'dark';
    randomBrowser?: boolean;
    randomUserAgent?: boolean;
    html?: boolean;
    fonts?: boolean;
    output?: string;
    filename?: string;
    console?: boolean;
    verbose?: boolean;
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

declare function critical(options: CriticalOptions): Promise<CriticalCliResult>;
declare function critical(url: string, options: CriticalOptions): Promise<CriticalCliResult>;

export { critical };
