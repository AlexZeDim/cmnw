
let item = {
    name: 'papaya',
    reagents: ['apple', 'cucumber']
};


async function f(counter = 0, fruits = [], fruit = 'pappya') {
    try {
        fruits.push(fruit);
        counter += 1;
        console.log(counter, fruits);
        /***
         * if (already in) then return, else push forward
         */
        if (counter === 10) {
            process.exit(1);
            return fruits;
        }
        await f(counter, fruits, fruit);
    } catch (e) {
        console.log(e);
    }
}


f();