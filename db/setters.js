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
  return parseFloat(number.toFixed(2));
};
