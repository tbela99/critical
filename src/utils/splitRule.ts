import {isWhiteSpace} from "./isWhiteSpace";

/**
 *
 * split css rule
 * @internal
 * @ignore
 */
export function splitRule(buffer: string): string[][] {

    const result: string[][] = [[]];
    let str: string = '';

    for (let i = 0; i < buffer.length; i++) {

        let chr: string = buffer.charAt(i);

        if (isWhiteSpace(chr.charCodeAt(0))) {

            let k: number = i;

            while (k + 1 < buffer.length) {

                if (isWhiteSpace(buffer[k + 1].charCodeAt(0))) {

                    k++;
                    continue;
                }

                break;
            }

            if (str !== '') {

                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }

            // @ts-ignore
            if (result.at(-1).length > 0) {

                // @ts-ignore
                result.at(-1).push(' ');
            }

            i = k;
            continue;
        }

        if (chr == ',') {

            if (str !== '') {
                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }

            result.push([]);
            continue;
        }

        if (chr == ':') {

            if (str !== '') {
                // @ts-ignore
                result.at(-1).push(str);
                str = '';
            }

            if (buffer.charAt(i + 1) == ':') {

                chr += buffer.charAt(++i);
            }

            str += chr;
            continue;
        }

        str += chr;
        if (chr == '\\') {

            str += buffer.charAt(++i);
            continue;
        }

        if (chr == '"' || chr == "'") {

            let k = i;
            while (++k < buffer.length) {
                chr = buffer.charAt(k);
                str += chr;
                if (chr == '//') {
                    str += buffer.charAt(++k);
                    continue;
                }
                if (chr == buffer.charAt(i)) {
                    break;
                }
            }
            continue;
        }

        if (chr == '(' || chr == '[') {
            const open = chr;
            const close = chr == '(' ? ')' : ']';
            let inParens = 1;
            let k = i;
            while (++k < buffer.length) {
                chr = buffer.charAt(k);
                if (chr == '\\') {
                    str += buffer.slice(k, k + 2);
                    k++;
                    continue;
                }
                str += chr;
                if (chr == open) {
                    inParens++;
                } else if (chr == close) {
                    inParens--;
                }
                if (inParens == 0) {
                    break;
                }
            }
            i = k;
        }
    }

    if (str !== '') {
        // @ts-ignore
        result.at(-1).push(str);
    }

    return result;
}