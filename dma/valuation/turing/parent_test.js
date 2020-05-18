const pm2 = require('pm2');

let array = [0,1]
for (let process_ins of array) {
    pm2.start({
        name : `test-${process_ins}`,
        script    : 'child_test.js',         // Script to be run
        exec_mode : 'fork',        // Allows your app to be clustered
        instances : 1,                // Optional: Scales your app by 4
        max_memory_restart : '100M'   // Optional: Restarts your app if it reaches 100Mo
    }, function(err, apps) {
        pm2.disconnect();   // Disconnects from PM2
        if (err) throw err
    });
}

