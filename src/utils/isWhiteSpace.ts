/**
 *
 * test whitespace codepoints
 * @internal
 * @ignore
 */
export function isWhiteSpace(codepoint: number): boolean {

    return codepoint == 0x9 || codepoint == 0x20 ||
        // isNewLine
        codepoint == 0xa || codepoint == 0xc || codepoint == 0xd;
}