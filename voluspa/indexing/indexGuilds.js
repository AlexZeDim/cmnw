const { PerformanceObserver, performance } = require('perf_hooks');
const delay = time => new Promise(res => setTimeout(res, time))
async function doSomeLongRunningProcess() {
    await delay(1000);
}
const obs = new PerformanceObserver((items) => {
    console.log('PerformanceObserver A to B',items.getEntries()[0].duration);
    performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });

performance.mark('A');

(async function main(){
    try{
        await performance.timerify(doSomeLongRunningProcess)();
        performance.mark('B');
        performance.measure('A to B', 'A', 'B');
    }catch(e){
        console.log('main() error',e);
    }
})();