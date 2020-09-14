/**
 * @param string
 * @returns {string}
 */

exports.toSlug = string => {
  return string
    .toString()
    .replace(/\s+/g, '-')
    .replace(/'+/g, '')
    .toLowerCase();
};

/**
 * @param string
 * @returns {string}
 */

exports.fromSlug = string => {
  return (
    string.toString().charAt(0).toUpperCase() +
    string.slice(1).replace(/-+/g, ' ')
  );
};

/**
 * @param number
 * @returns {number}
 * @constructor
 */

exports.Round2 = number => {
  return parseFloat(number.toString().toFixed(2));
};

/**
 * @param string
 * @returns {string}
 */

exports.capitalize = (string) => {
  if (typeof string !== 'string') return ''
  return string.charAt(0).toUpperCase() + string.slice(1)
}
