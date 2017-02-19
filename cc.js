var https = require('https');
var fs = require('fs');

module.exports = {
	arb: function() {
		this.readings = 0;
		require('node-schedule').scheduleJob('*/1 * * *', function() {
			this.prices();
		}.bind(this));
	},
	prices: function() {
		https.get({host: 'www.cryptocompare.com', port: 443, path: "/api/data/coinsnapshot/?fsym=BTC&tsym=USD"}, function(response) {
			var data = "";
						
			response.on('data', function(chunk) {
				data += chunk;
			});
			
			response.on('end', function() {
				if (data.length > 0) {
					var now = new Date();
					var nowSeconds = now.getTime() / 1000;
					var snaps = JSON.parse(data).Data.Exchanges.filter(function(snap) {
						return snap.TOSYMBOL === 'USD'
							&& (snap.MARKET === 'Poloniex' || snap.MARKET === 'Kraken');
							//&& nowSeconds - Number(snap.LASTUPDATE) < 60;
					});

					snaps.sort(function(snapA, snapB) {
						return Number(snapA.PRICE) - Number(snapB.PRICE);
					});

					var lowestSnap;
					var highestSnap;
					snaps.forEach(function(snap) {
						if (!lowestSnap || Number(snap.PRICE) < Number(lowestSnap.PRICE)) {
							lowestSnap = snap;
						}

						if (!highestSnap || Number(snap.PRICE) > Number(highestSnap.PRICE)) {
							highestSnap = snap;
						}

						 // console.log(
							// snap.MARKET + ": $" + snap.PRICE
							// + " (" + parseInt(nowSeconds - Number(snap.LASTUPDATE)) + " SECONDS AGO)");
					});

					//console.log("LOWEST PRICE: $" + lowestSnap.PRICE + " (" + lowestSnap.MARKET + ")");
					//console.log("HIGHEST PRICE: $" + highestSnap.PRICE + " (" + highestSnap.MARKET + ")");

					var diff = (Number(highestSnap.PRICE) - Number(lowestSnap.PRICE));
					var diffPercent = diff * 100 / Number(lowestSnap.PRICE);

					if (this.readings++) {
						this.avgarb += (diffPercent - this.avgarb) / this.readings;
					} else {
						this.avgarb = diffPercent;
					}

					console.log(
						diffPercent + "% ($"
						+ diff + ", " + highestSnap.MARKET + "->" + lowestSnap.MARKET + ") "
						+ now + ", AVG=" + this.avgarb + "%");
				}
			}.bind(this));
		}.bind(this));
	}
};