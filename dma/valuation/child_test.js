async function f (number = 1602) {
    try {
        console.log(number)
        for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(i)
        }
    } catch (e) {
        console.error(e)
    }
}

f(process.argv[process.argv.findIndex(arg => arg === 'connected_realm_id') + 1])

