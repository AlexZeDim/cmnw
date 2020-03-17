

async function test () {
    try {
        const range = (start, stop, step = 1) => Array(Math.ceil((stop + step - start) / step)).fill(start).map((x, y) => x + y * step);
        console.log(range(43,112,2.5))
    } catch (err) {
        console.log(err);
    }
}

test();