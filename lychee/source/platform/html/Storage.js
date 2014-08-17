
lychee.define('Storage').tags({
	platform: 'html'
}).includes([
	'lychee.event.Emitter'
]).supports(function(lychee, global) {

	if (typeof Storage !== 'undefined') {

		if (typeof global.localStorage === 'object' && typeof global.sessionStorage === 'object') {
			return true;
		}

	}


	return false;

}).exports(function(lychee, global) {

	/*
	 * EVENTS
	 */

	var _persistent = null;
	var _temporary  = null;



	/*
	 * FEATURE DETECTION
	 */

	(function() {

		var local = 'localStorage' in global;
		if (local === true) {
			_persistent = global.localStorage;
		}

		var session = 'sessionStorage' in global;
		if (session === true) {
			_temporary = global.sessionStorage;
		}


		if (lychee.debug === true) {

			var methods = [];

			if (local)   methods.push('Persistent');
			if (session) methods.push('Temporary');

			if (methods.length === 0) {
				console.error('lychee.Storage: Supported methods are NONE');
			} else {
				console.info('lychee.Storage: Supported methods are ' + methods.join(', '));
			}

		}

	})();



	/*
	 * HELPERS
	 */

	var _read_storage = function() {

		var id   = this.id;
		var blob = null;


		var type = this.type;
		if (type === Class.TYPE.persistent) {
			blob = JSON.parse(_persistent.getItem(id));
		} else if (type === Class.TYPE.temporary) {
			blob = JSON.parse(_temporary.getItem(id));
		}


		if (blob !== null) {

			if (this.model === null) {

				if (blob['@model'] instanceof Object) {
					this.model = blob['@model'];
				}

			}


			var document = this.__document;
			if (document.index === 0) {

				if (blob['@document'] instanceof Object) {
					this.__document = blob['@document'];
				}

			}


			var objects = this.__objects;
			if (objects.length === 0 || objects.length !== blob['@objects'].length) {

				if (blob['@objects'] instanceof Array) {

					objects = blob['@objects'];
					this.__objects = [];

					for (var o = 0, ol = objects.length; o < ol; o++) {
						this.__objects.push(objects[o]);
					}

					this.trigger('sync', [ this.__objects ]);


					return true;

				}

			}

		}


		return false;

	};

	var _write_storage = function() {

		var operations = this.__operations;
		if (operations.length !== 0) {

			while (operations.length > 0) {

				var operation = operations.shift();
				if (operation.type === 'insert') {

					this.__document.index++;
					this.__objects.push(operation.object);
					this.trigger('insert', [ operation.index, operation.object ]);

				} else if (operation.type === 'update') {

					if (this.__objects[operation.index] !== operation.object) {
						this.__objects[operation.index] = operation.object;
						this.trigger('update', [ operation.index, operation.object ]);
					}

				} else if (operation.type === 'remove') {

					this.__document.index--;
					this.__objects.splice(operation.index, 1);
					this.trigger('remove', [ operation.index, operation.object ]);

				}

			}


			this.__document.time = Date.now();


			var id   = this.id;
			var blob = {
				'@document': this.__document,
				'@model':    this.model,
				'@objects':  this.__objects
			};


			var type = this.type;
			if (type === Class.TYPE.persistent) {

				if (_persistent !== null) {
					_persistent.setItem(id, JSON.stringify(blob, null, '\t'));
				}

			} else if (type === Class.TYPE.temporary) {

				if (_temporary !== null) {
					_temporary.setItem(id, JSON.stringify(blob, null, '\t'));
				}

			}


			this.trigger('sync', [ this.__objects ]);

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var _id = 0;

	var Class = function(data) {

		var settings = lychee.extend({}, data);


		this.id    = 'lychee-Storage-' + _id++;
		this.model = {};
		this.type  = Class.TYPE.persistent;

		this.__document   = { index: 0, time: Date.now() };
		this.__objects    = [];
		this.__operations = [];


		this.setId(settings.id);
		this.setModel(settings.model);
		this.setType(settings.type);


		lychee.event.Emitter.call(this);

		settings = null;



		/*
		 * INITIALIZATION
		 */

		_read_storage.call(this);

	};


	Class.TYPE = {
		persistent: 0,
		temporary:  1
	};


	Class.prototype = {

		/*
		 * ENTITY API
		 */

		sync: function(force) {

			force = force === true;


			var result = _read_storage.call(this);
			if (result === true) {

				return true;

			} else {

				if (force === true) {

					this.trigger('sync', [ this.__objects ]);

					return true;

				}

			}


			return false;

		},

		deserialize: function(blob) {

			if (blob.document instanceof Object) {
				this.__document.index = blob.document.index;
				this.__document.time  = blob.document.time;
			}

			if (blob.objects instanceof Array) {

				this.__objects = [];

				for (var o = 0, ol = blob.objects.length; o < ol; o++) {

					var object = blob.objects[o];
					if (lychee.interfaceof(this.model, object)) {
						this.__objects.push(object);
					}

				}

			}

		},

		serialize: function() {

			var settings = {};
			var blob     = {};


			if (this.id.substr(0, 15) !== 'lychee-Storage-') settings.id    = this.id;
			if (Object.keys(this.model).length !== 0)        settings.model = this.model;
			if (this.type !== Class.TYPE.persistent)         settings.type  = this.type;


			if (this.__document.index > 0) {

				blob.document = {};
				blob.document.index = this.__document.index;
				blob.document.time  = this.__document.time;

			}

			if (this.__objects.length > 0) {

				blob.objects = {};

				for (var o = 0, ol = this.__objects.length; o < ol; o++) {

					var object = this.__objects[o];
					if (object instanceof Object) {
						blob.objects.push(JSON.parse(JSON.stringify(object)));
					}

				}

			}


			return {
				'constructor': 'lychee.Storage',
				'arguments':   [ settings ],
				'blob':        Object.keys(blob).length > 0 ? blob : null
			};

		},



		/*
		 * CUSTOM API
		 */

		create: function() {
			return lychee.extendunlink({}, this.model);
		},

		filter: function(callback, scope) {

			callback = callback instanceof Function ? callback : null;
			scope    = scope !== undefined          ? scope    : this;


			var filtered = [];

			for (var o = 0, ol = this.__objects.length; o < ol; o++) {

				var object = this.__objects[o];
				if (callback !== null) {

					if (callback.call(scope, o, object) === true) {
						filtered.push(object);
					}

				} else {
					filtered.push(object);
				}

			}


			return filtered;

		},

		insert: function(object) {

			// This uses the diff method, because properties can be null
			object = lychee.diff(this.model, object) === false ? object : null;


			if (object !== null) {

				var index = this.__objects.indexOf(object);
				if (index === -1) {

					this.__operations.push({
						type:   'insert',
						object: object,
						index:  this.__objects.length
					});


					_write_storage.call(this);

					return true;

				}

			}


			return false;

		},

		update: function(object) {

			// This uses the diff method, because properties can be null
			object = lychee.diff(this.model, object) === false ? object : null;


			if (object !== null) {

				var index = this.__objects.indexOf(object);
				if (index !== -1) {

					this.__operations.push({
						type:   'update',
						object: object,
						index:  index
					});


					_write_storage.call(this);

					return true;

				}

			}


			return false;

		},

		get: function(index) {

			index  = typeof index === 'number' ? (index | 0) : null;


			if (index !== null) {

				var object = this.__objects[index] || null;
				if (object !== null) {
					return object;
				}

			}


			return null;

		},

		remove: function(index) {

			index  = typeof index === 'number' ? (index | 0) : null;


			if (index !== null) {

				if (index >= 0 && index < this.__objects.length) {

					this.__operations.push({
						type: 'remove',
						index: index
					});


					_write_storage.call(this);

					return true;

				}

			}


			return false;

		},

		setId: function(id) {

			id = typeof id === 'string' ? id : null;


			if (id !== null) {

				this.id = id;

				return true;

			}


			return false;

		},

		setModel: function(model) {

			model = model instanceof Object ? model : null;


			if (model !== null) {

				this.model = JSON.parse(JSON.stringify(model));

				return true;

			}


			return false;

		},

		setType: function(type) {

			if (lychee.enumof(Class.TYPE, type)) {

				this.type = type;

				return true;

			}


			return false;

		}

	};


	return Class;

});

