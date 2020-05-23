const pm2 = require('pm2');
const path = require('path');

async function f (array = [1602,1658]) {
    try {
        for (let process_ins of array) {
            console.log('wait for it')
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('10s')
            await pm2.start({
                name: `test-${process_ins}`,
                args: `connected_realm_id ${process_ins}`,
                script: `${path.dirname(require.main.filename) + '/valuation/child_test.js'}`,
                exec_mode: 'fork',
                instances: 1,
                max_memory_restart: '100M',
                autorestart: false,
            }, function(err, apps) {
                pm2.disconnect();
                if (err) throw err
            });
        }
    } catch (e) {
        console.error(e)
    }
}


f()

