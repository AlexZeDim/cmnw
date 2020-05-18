const { fork } = require('child_process');

const forked = fork('./child.js');

forked.on('message', (msg) => {
    console.log('Message from child', msg);
});

forked.send({ hello: 'world' });

setInterval(() => {
    console.log(`I do shit`)
}, 5000);

/**
 const { spawn } = require('child_process');

 const child = spawn('node', ['timer.js'], {
    detached: true,
    stdio: 'ignore'
});

 child.unref();
 */

