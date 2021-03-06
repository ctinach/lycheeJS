
lychee.define('lychee.net.Client').tags({
	platform: 'nodejs'
}).requires([
	'lychee.data.BitON',
	'lychee.data.JSON',
	'lychee.net.Protocol'
]).includes([
	'lychee.net.Tunnel'
]).supports(function(lychee, global) {

	if (typeof process !== 'undefined') {
		return true;
	}


	return false;

}).exports(function(lychee, global, attachments) {

	var http   = require('http');
	var crypto = require('crypto');

	var _BitON = lychee.data.BitON;
	var _JSON  = lychee.data.JSON;



	/*
	 * HELPERS
	 */

	var _get_websocket_nonce = function() {

		var buffer = new Buffer(16);
		for (var b = 0; b < 16; b++) {
			buffer[b] = Math.round(Math.random() * 0xff);
		}

		return buffer.toString('base64');

	};

	var _upgrade_to_websocket = function(response, socket, head) {

		var connection = (response.headers.connection || '').toLowerCase();
		var upgrade    = (response.headers.upgrade    || '').toLowerCase();
		var protocol   = (response.headers['sec-websocket-protocol'] || '').toLowerCase();

		if (connection === 'upgrade' && upgrade === 'websocket' && protocol === 'lycheejs') {

			var accept   = (response.headers['sec-websocket-accept'] || '');
			var expected = (function(nonce) {

				var sha1 = crypto.createHash('sha1');
				sha1.update(nonce + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
				return sha1.digest('base64');

			})(this.__nonce);


			if (accept === expected) {

				socket.setTimeout(0);
				socket.setNoDelay(true);
				socket.setKeepAlive(true, 0);
				socket.removeAllListeners('timeout');

				return true;

			}

		}


		socket.end();
		socket.destroy();

		return false;

	};



	/*
	 * IMPLEMENTATION
	 */

	var Class = function(data) {

		var settings = lychee.extend({}, data);


		this.__nonce       = null;
		this.__socket      = null;
		this.__isConnected = false;


		lychee.net.Tunnel.call(this, settings);

		settings = null;



		/*
		 * INITIALIZATION
		 */

		this.bind('connect', function() {
			this.__isConnected = true;
		}, this);

		this.bind('disconnect', function() {
			this.__isConnected = false;
		}, this);

		this.bind('send', function(blob) {

			if (this.__socket !== null) {
				this.__socket.send(blob);
			}

		}, this);

	};


	Class.prototype = {

		/*
		 * ENTITY API
		 */

		// deserialize: function(blob) {},

		serialize: function() {

			var data = lychee.net.Tunnel.prototype.serialize.call(this);
			data['constructor'] = 'lychee.net.Client';


			return data;

		},



		/*
		 * CUSTOM API
		 */

		connect: function() {

			if (this.__isConnected === false) {

				var that = this;


				this.__nonce = _get_websocket_nonce();

				var request  = http.request({
					hostname: this.host,
					port:     this.port,
					method:   'GET',
					headers:  {
						'Upgrade':                'websocket',
						'Connection':             'Upgrade',
						'Origin':                 'ws://' + this.host + ':' + this.port,
						'Host':                   this.host + ':' + this.port,
						'Sec-WebSocket-Key':      this.__nonce,
						'Sec-WebSocket-Version':  '13',
						'Sec-WebSocket-Protocol': 'lycheejs'
					}
				});


				request.on('upgrade', function(response, socket, head) {

					if (_upgrade_to_websocket.call(that, response, socket, head) === true) {

						that.__socket = new lychee.net.Protocol(socket, lychee.net.Protocol.TYPE.client);

						that.__socket.ondata = function(blob) {
							that.receive(blob);
						};

						that.__socket.onclose = function(code) {
							that.__socket = null;
							that.trigger('disconnect', [ code ]);
						};

						that.trigger('connect', []);

					}

				});


				request.on('response', function(response) {

					var socket = response.socket || null;
					if (socket !== null) {
						socket.end();
						socket.destroy();
					}

				});


				request.end();


				if (lychee.debug === true) {
					console.log('lychee.net.Client: Connected to ' + this.host + ':' + this.port);
				}


				return true;

			}


			return false;

		},

		disconnect: function() {

			if (this.__isConnected === true) {

				if (this.__socket !== null) {
					this.__socket.close();
				}


				return true;

			}


			return false;

		}

	};


	return Class;

});

