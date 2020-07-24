const path = require('path');

const t = async (p, a = 1) => {
    try {
        console.log(`process.env.import`)
        console.log(process.env.import)
        console.log(`__dirname`)
        console.log(__dirname)
        console.log(`path.normalize(__dirname)`)
        console.log(path.normalize(__dirname))
        console.log(`p as arg`)
        console.log(p)
        if (p === false) {
            console.log('Boolean')
        }
        if (p) {
            console.log('Exists')
        }
        console.log(typeof p)
        console.log(`a as arg`)
        console.log(a)
        console.log(`process.argv`)
        const args = process.argv.slice(2);
        console.log(args);
    } catch (e) {
        console.error(e)
    }
}

t(process.argv.slice(2)[0], process.argv.slice(2)[1])