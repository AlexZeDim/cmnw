const path = require('path');

const t = async (p, a) => {
    try {
        console.log(`process.env.import`)
        console.log(process.env.import)
        console.log(`__dirname`)
        console.log(__dirname)
        console.log(`path.normalize(__dirname)`)
        console.log(path.normalize(__dirname))
        console.log(`p as process.env.import`)
        console.log(p)
        console.log(`a as process.env.a`)
        console.log(a)
        console.log(`process.argv`)
        const args = process.argv;
        console.log(args);
    } catch (e) {
        console.error(e)
    }
}

t(process.env.import, process.env.a)