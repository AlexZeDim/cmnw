const crc32 = require('fast-crc32c');

let result = crc32.calculate(Buffer.from([1,2,3])).toString(16).toUpperCase();
console.log(result);