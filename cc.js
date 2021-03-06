var https = require('https');
var fs = require('fs');
var moment = require('moment');

const FROM = 'XMR';
const TO = 'BTC';

module.exports = {
	arb: function() {
		this.readings = 0;
		this.flips = 0;
		require('node-schedule').scheduleJob('*/1 * * *', function() {
			this.readings++;
			this.prices();
		}.bind(this));
	},
	prices: function() {
		var params = {host: 'www.cryptocompare.com', port: 443, path: "/api/data/coinsnapshot/?fsym=" + FROM + "&tsym=" + TO}
		https.get(params, function(response) {
			var data = "";
						
			response.on('data', function(chunk) {
				data += chunk;
			});
			
			response.on('end', function() {
				if (data.length > 0) {
					var now = new Date();
					var nowSeconds = now.getTime() / 1000;
					var snaps = JSON.parse(data).Data.Exchanges.filter(function(snap) {
						//return snap.TOSYMBOL === TO && (snap.MARKET === 'Poloniex' || snap.MARKET === 'Kraken');
						return nowSeconds - Number(snap.LASTUPDATE) < 600;
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

					var lowestFlipSnap =
						snaps.filter(function(snap) {
							return this.lowestFlipSnap && snap.MARKET === this.lowestFlipSnap.MARKET;
						}.bind(this));

					var highestFlipSnap =
						snaps.filter(function(snap) {
							return 	this.highestFlipSnap && snap.MARKET === this.highestFlipSnap.MARKET;
						}.bind(this));

					if (lowestFlipSnap[0] && highestFlipSnap[0] && lowestFlipSnap[0].PRICE < highestFlipSnap[0].PRICE) {
						this.currentFlipMins++;
					} else {
						if (this.lowestSnap) {
							this.flips++;
						}

						if (this.flips) {
							this.flipMinsAvg += (this.currentFlipMins - this.flipMinsAvg) / this.flips;
						} else {
							this.flipMinsAvg = 0;
						}
						
						this.currentFlipMins = 0;

						this.lowestFlipSnap = lowestSnap;
						this.highestFlipSnap = highestSnap;
					}

					this.lowestSnap = lowestSnap;
					this.highestSnap = highestSnap;

					//console.log("LOWEST PRICE: $" + lowestSnap.PRICE + " (" + lowestSnap.MARKET + ")");
					//console.log("HIGHEST PRICE: $" + highestSnap.PRICE + " (" + highestSnap.MARKET + ")");

					var diff = (Number(highestSnap.PRICE) - Number(lowestSnap.PRICE));
					var diffPercent = diff * 100 / Number(lowestSnap.PRICE);

					if (this.readings > 1) {
						this.avgarb += (diffPercent - this.avgarb) / this.readings;
						this.rate += (Math.abs(diffPercent - this.diffPercent) - this.rate) / (this.readings - 1);
					} else {
						this.avgarb = diffPercent;
						this.rate = 0;
					}

					this.diffPercent = diffPercent;

					console.log(
						diffPercent + "% ($"
						+ diff + ", " + highestSnap.MARKET + "->" + lowestSnap.MARKET + ") "
						+ moment(now).format('MM/DD/YYYY H:mm:00') + ", AVG=" + this.avgarb + "%");

					console.log(
						"THIS FLIP: " + this.currentFlipMins + " mins ("
						+ highestSnap.MARKET + "->" + lowestSnap.MARKET
						+ ", AVG:" + this.flipMinsAvg + " mins)");
					
					console.log("AVG CHANGE PER MINUTE: " + this.rate + "%");
				}
			}.bind(this));
		}.bind(this));
	}
};