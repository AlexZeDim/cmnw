const pm2 = require('pm2');
const path = require('path');

let array = [1602,1658]
for (let process_ins of array) {
    pm2.start({
        name: `test-${process_ins}`,
        args: `connected_realm_id ${process_ins}`,
        script: `${path.dirname(require.main.filename) + '/valuation/'}child_test.js`,
        exec_mode: 'fork',
        instances: 1,
        max_memory_restart: '100M',
        autorestart: false,
    }, function(err, apps) {
        pm2.disconnect();
        if (err) throw err
    });
}

