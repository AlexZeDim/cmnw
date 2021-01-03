const arg = { }

async function T (...args) {
  try {
    const obj = {};
    obj.guild = {
      name: 'test',
      rank: 1
    }
    if (args.guild === undefined) {
      console.log('T')
      obj.guild = arg.guild;
    }
    console.log(obj)
  } catch (e) {
    console.error(e)
  }
}

T(arg);
