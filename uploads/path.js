const path = require('path');

const t = async (p, a = 1) => {
    try {
        console.log(`process.env.PWD`)
        console.log(process.env.PWD)
        const args = process.argv.slice(2);
        console.log(args);
    } catch (e) {
        console.error(e)
    }
}

t(process.argv.slice(2)[0], process.argv.slice(2)[1])