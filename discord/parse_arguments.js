/**
 *
 * @param args {[string]}
 * @param keywords {[string]}
 * @returns {*}
 */

function parse_arguments (args, keywords) {
  console.log(args, keywords)
  if (keywords && keywords.length) {
    keywords.forEach(k => {
      console.log(k)
      let index = args.indexOf(k)
      console.log(index)
      if (index === -1) {
        return void 0
      } else {
        if (args.length <= index + 1) {
          return true
        } else {
          return args[index + 1]
        }
      }
    })
  }
  return void 0
}

module.exports = parse_arguments;
