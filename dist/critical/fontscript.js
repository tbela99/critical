function fontscript(fonts) {
    return '/* font preloader script: ' + fonts.length + ' */\n"fonts" in document && ' + JSON.stringify([...fonts], null, 1) + '.forEach(font => new FontFace(font.fontFamily, font.src, font.properties).load().then(font => document.fonts.add(font)))';
}

export { fontscript };
//# sourceMappingURL=fontscript.js.map
