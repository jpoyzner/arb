var https = require('https');
var fs = require('fs');

module.exports = {
	prices: function(pageRes) {
		https.get({host: 'www.cryptocompare.com', port: 443, path: "/api/data/coinsnapshot/?fsym=BTC&tsym=USD"}, function(response) {
			var data = "";
						
			response.on('data', function(chunk) {
				data += chunk;
			});
			
			response.on('end', function() {
				if (data.length > 0) {
					var nowSeconds = (new Date).getTime() / 1000;
					var snaps = [];
					JSON.parse(data).Data.Exchanges.forEach(function(snap) {
						if (snap.TOSYMBOL === 'USD' && nowSeconds - Number(snap.LASTUPDATE) < 60) {
							//console.log(snap.MARKET + ": $" + snap.PRICE);
							snaps.push(snap);
						}
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

						console.log(
							snap.MARKET + ": $" + snap.PRICE
							+ " (" + parseInt(nowSeconds - Number(snap.LASTUPDATE)) + " SECONDS AGO)");
					});

					console.log("LOWEST PRICE: $" + lowestSnap.PRICE + " (" + lowestSnap.MARKET + ")");
					console.log("HIGHEST PRICE: $" + highestSnap.PRICE + " (" + highestSnap.MARKET + ")");

					console.log(
						"ARBITRAGE: $" + (Number(highestSnap.PRICE) - Number(lowestSnap.PRICE))
						+ " (" + highestSnap.MARKET + "->" + lowestSnap.MARKET + ")");
				}
			});
		});
	}
};