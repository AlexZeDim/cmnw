/**
 *
 * @param array {[number]}
 * @param blocks {number}
 * @returns {number[]|*[]}
 */
const priceRange = (array, blocks = 40) => {
  try {
    if (!array.length) return []
    let L = array.length
    let I = 1
    if (L === 1) {
      I = 0;
    }
    if (L > 3) {
      L = L - 3
    }
    const ninety_percent = Math.floor(L * 0.9);
    const floor = Math.floor(array[I]);
    const cap = Math.round(array[ninety_percent]);
    const price_range = cap - floor;
    /** Step represent 2.5% for each cluster */
    const step = price_range / blocks;
    return Array(Math.ceil((cap + step - floor) / step))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * step).toFixed(4)));
  } catch (e) {
    return []
  }
}

module.exports = priceRange
