import type {FontObject} from "../@types";

/**
 * generate javascript to load web fonts
 */
export function fontscript(fonts: FontObject[]): string {

    return '/* font preloader script: ' + fonts.length + ' */\n"fonts" in document && ' + JSON.stringify([...fonts], null, 1) + '.forEach(font => new FontFace(font.fontFamily, font.src, font.properties).load().then(font => document.fonts.add(font)))'
}