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

export interface CriticalExtractOptions {

    fonts?: boolean;
    html?: boolean;
    signal?: AbortSignal;
    transform?: (css: string, options: TransformOptions = {}) => Promise<TransformResult>
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
