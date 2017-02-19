var cc = require('./cc');
require('node-schedule').scheduleJob('*/1 * * *', function() {
	cc.prices();
});
