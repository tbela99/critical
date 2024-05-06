import {TransformResult, TransformOptions} from "@tbela99/css-parser";

export type Font = {

    src: string;
};

export type Fonts = Array<Font>;

export type BrowserOptions = 'chromium' | 'firefox' | 'webkit' | 'edge' | 'chrome';

export interface CriticalDimension {

    width: number,
    height: number
}

export interface CriticalOptions {

    headless?: boolean;
    browser?: BrowserOptions;
    browserType?: 'mobile' | 'desktop' | 'default';
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

export interface CriticalExtractOptions {

    fonts?: boolean;
    html?: boolean;
    signal?: AbortSignal;
}

export interface CriticalResult {

    styles?: Array<string>,
    fonts?: Array<string> | Array<FontObject>,
    nodeCount?: number,
    stats?: {
        nodeCount: number,
        stats: Array<{
            name: string,
            duration: string
        }>
    },
    html?: string
}

export interface CriticalCliStats {
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

export interface CriticalCliResult {
    fonts: Array<string>,
    stats: Array<CriticalCliStats>,
    styles: any[];
    html: string
}

export type RuleList = CSSMediaRule | CSSImportRule | CSSRule | CSSConditionRule | CSSStyleSheet;

export interface FontObject {

    fontFamily: string,
    src: string,
    properties: {

        [key: string]: string
    }
}

export interface MatchCSSStyleSheet {

    fonts?: boolean,
    rule: RuleList,
    match: boolean
}

interface FileMapObject {

// @ts-ignore
    base: string;
// @ts-ignore
    file: string;
}
