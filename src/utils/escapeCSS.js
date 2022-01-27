'use strict';

/**
 * CSS string escape
 * @param str
 * @returns {string}
 */
export function escapeCSS (str) {

	let result = '';
	let code;

	for (let i = 0; i < str.length; i++) {

		code = str.charCodeAt(i);

		if (code > 255) {

			result += '\\' + code.toString(16);
		}

		else {

			result += str[i];
		}
	}

	return result;
}