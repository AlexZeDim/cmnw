

async function test () {
    try {
        let round;
        let n = 43;
        if (n < 1) {
            round = (number, nearest = .5) => parseFloat((Math.round(number * (1/nearest)) / (1/nearest) ).toFixed(2));
        } else {
            round = (number, pres = 5) => Math.round(number/pres)*pres;
        }
        console.log(round(n,10))
    } catch (err) {
        console.log(err);
    }
}

test();