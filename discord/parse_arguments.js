/**
 *
 * @param args {[string]}
 * @param keywords {[string]}
 * @returns {*}
 */

function parse_arguments (args, keywords) {
  if (keywords && keywords.length) {
    for (let k of keywords) {
      let index = args.indexOf(k)
      if (index !== -1) {
        if (args.length <= index + 1) {
          return true
        } else {
          return args[index + 1]
        }
      }
    }
    return void 0
  } else {
    return void 0
  }
}

module.exports = parse_arguments;
