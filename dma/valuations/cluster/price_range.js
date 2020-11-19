/**
 *
 * @param array
 * @returns {number[]|*[]}
 */
const priceRange = (array) => {
  try {
    let L = array.length
    if (L > 3) {
      L = L - 3
    }
    const ninety_percent = Math.floor(L * 0.9);
    const floor = Math.floor(array[0]);
    const cap = Math.round(array[ninety_percent]);
    const price_range = cap - floor;
    /** Step represent 2.5% for each cluster */
    const step = price_range / 40;
    return Array(Math.ceil((cap + step - floor) / step))
      .fill(floor)
      .map((x, y) => parseFloat((x + y * step).toFixed(4)));
  } catch (e) {
    return []
  }
}

module.exports = priceRange
