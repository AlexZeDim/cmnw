/**
 * @param string
 * @returns {string}
 */

exports.toSlug = (string) => {
    return string.replace(/\s+/g,"-").replace(/'+/g,"").toLowerCase()
}

/**
 * @param string
 * @returns {string}
 */

exports.fromSlug = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1).replace(/-+/g," ")
}

/**
 * @param number
 * @returns {number}
 * @constructor
 */

exports.Round2 = (number) => {
    return parseFloat((number).toFixed(2));
}