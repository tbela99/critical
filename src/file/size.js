/**
 *
 * @param {int} number
 * @param {string[]} units
 * @return {string}
 */
export function size (number, units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']) {

    if(number == 0) return '0';

    const e = Math.floor(Math.log(number) / Math.log(1024));

    return (number / Math.pow(1024, Math.floor(e))).toFixed(2) + " " + units[e];
}