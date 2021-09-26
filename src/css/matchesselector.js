export function matchesSelector(el, selector) {

    let matchesSelector = el.matchesSelector || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector;

    if (matchesSelector) {
        try {
            return matchesSelector.call(el, selector);
        } catch (e) {
            return false;
        }
    } else {
        let matches = el.ownerDocument.querySelectorAll(selector),
            len = matches.length;

        while (len && len--) {
            if (matches[len] === el) {
                return true;
            }
        }
    }
    return false;
}
