const path = require('path');

const t = async (a = "test") => {
    try {
        let path_;

        if (!a.endsWith(".csv")) {
            a = a + '.csv'
        }

        if (process.env.PWD) {
            path_ = path.normalize(`${process.env.PWD}/uploads/${a}`)
        } else {
            path_ = __dirname
        }
        console.log(path_, a)
        console.log(`process.env.PWD`)
        console.log(process.env.PWD)
        console.log(__dirname)
        const args = process.argv.slice(2);
        console.log(args);
    } catch (e) {
        console.error(e)
    }
}

t(process.argv.slice(2)[0])