
lychee.Environment = typeof lychee.Environment !== 'undefined' ? lychee.Environment : (function(global) {

	var lychee  = global.lychee;
	var console = global.console;




	/*
	 * EVENTS
	 */

	var _export_loop = function(cache) {

		var that  = this;
		var load  = cache.load;
		var ready = cache.ready;
		var track = cache.track;

		var identifier, definition;


		for (var l = 0, ll = load.length; l < ll; l++) {

			identifier = load[l];
			definition = this.definitions[identifier] || null;


			if (definition !== null) {

				if (ready.indexOf(identifier) === -1) {
					ready.push(identifier);
				}

				load.splice(l, 1);
				track.splice(l, 1);
				ll--;
				l--;

			}

		}


		for (var r = 0, rl = ready.length; r < rl; r++) {

			identifier = ready[r];
			definition = this.definitions[identifier] || null;

			if (definition !== null) {

				var dependencies = _resolve_definition.call(this, definition);
				if (dependencies.length > 0) {

					dependencies.forEach(function(dependency) {

						if (load.indexOf(dependency) === -1 && ready.indexOf(dependency) === -1) {

							that.load(dependency);
							load.push(dependency);
							track.push(identifier);

						}

					});

				} else {

					_export_definition.call(this, definition);

					ready.splice(r, 1);
					rl--;
					r--;

				}

			}

		}


		if (load.length === 0 && ready.length === 0) {

			cache.active = false;

		} else {

			if (Date.now() > cache.timeout) {
				cache.active = false;
			}

		}

	};



	/*
	 * HELPERS
	 */

	var _validate_values = function(array) {

		if (array instanceof Array) {

			var valid = true;

			for (var a = 0, al = array.length; a < al; a++) {

				var value = array[a];
				if (typeof value !== 'string') {
					valid = false;
					break;
				}

			}


			return valid;

		}


		return false;

	};

	var _validate_definition = function(definition) {

		if (!definition instanceof lychee.Definition) {
			return false;
		}


		var supported = false;

		if (definition._supports !== null) {

			// TODO: We need a Proxy for determination of all required sandboxed properties
			supported = definition._supports.call(global, lychee, global);

		} else {
			supported = true;
		}


		var tagged = true;

		if (Object.keys(definition._tags).length > 0) {

			for (var type in definition._tags) {

				var value = definition._tags[type];
				var tags  = this.tags[type] || null;
				if (tags instanceof Array) {

					if (tags.indexOf(value) === -1) {

						tagged = false;
						break;

					}

				}

			}

		}


		if (this.type === 'build') {

			return tagged;

		} else if (this.type === 'export') {

			return tagged;

		} else if (this.type === 'source') {

			return supported && tagged;

		}


		return false;

	};

	var _get_package = function(packageId) {

		for (var p = 0, pl = this.packages.length; p < pl; p++) {

			var pkg = this.packages[p];
			if (pkg.id === packageId) {
				return pkg;
			}

		}


		return null;

	};

	var _resolve_definition = function(definition) {

		var dependencies = [];


		if (definition instanceof lychee.Definition) {

			for (var i = 0, il = definition._includes.length; i < il; i++) {

				var inc      = definition._includes[i];
				var incclass = _get_class.call(this.global, inc);
				if (incclass === null) {
					dependencies.push(inc);
				}

			}

			for (var r = 0, rl = definition._requires.length; r < rl; r++) {

				var req      = definition._requires[r];
				var reqclass = _get_class.call(this.global, req);
				if (reqclass === null) {
					dependencies.push(req);
				}

			}

		}


		return dependencies;

	};

	var _export_definition = function(definition) {

		if (_get_class.call(this.global, definition.id) !== null) {
			return false;
		}


		var namespace  = _get_namespace.call(this.global, definition.id);
		var packageId  = definition.packageId;
		var classId    = definition.classId.split('.').pop();


		if (this.debug === true) {
			var info = Object.keys(definition._attaches).length > 0 ? ('(' + Object.keys(definition._attaches).length + ' Attachment(s))') : '';
			this.global.console.log('lychee-Environment-' + this.id + ': Exporting "' + definition.id + '" ' + info);
		}



		/*
		 * 1. Export Class, Module or Callback
		 */

		var template = null;
		if (definition._exports !== null) {

			if (this.debug === true) {

				if (packageId === 'lychee') {

					try {

						// TODO: This needs to be sandboxed, so global will be this.global

						template = definition._exports.call(
							definition._exports,
							this.global.lychee,
							global,
							definition._attaches
						) || null;

					} catch(err) {
						lychee.Debugger.report(this, err, definition);
					}

				} else {

					try {

						// TODO: This needs to be sandboxed, so global will be this.global

						template = definition._exports.call(
							definition._exports,
							this.global.lychee,
							this.global[packageId],
							global,
							definition._attaches
						) || null;

					} catch(err) {
						lychee.Debugger.report(this, err, definition);
					}

				}

			} else {

				if (packageId === 'lychee') {

					// TODO: This needs to be sandboxed, so global will be this.global

					template = definition._exports.call(
						definition._exports,
						this.global.lychee,
						global,
						definition._attaches
					) || null;

				} else {

					// TODO: This needs to be sandboxed, so global will be this.global

					template = definition._exports.call(
						definition._exports,
						this.global.lychee,
						this.global[packageId],
						global,
						definition._attaches
					) || null;

				}

			}

		}



		/*
		 * 2. Extend Class, Module or Callback
		 */

		if (template !== null) {

			/*
			 * 2.1 Extend and export Class or Module
			 */

			var includes = definition._includes;
			if (includes.length > 0) {


				// Cache old prototype
				var oldprototype = null;
				if (template.prototype instanceof Object) {

					oldprototype = {};

					for (var property in template.prototype) {
						oldprototype[property] = template.prototype[property];
					}

				}



				// Define classId in namespace
				Object.defineProperty(namespace, classId, {
					value:        template,
					writable:     false,
					enumerable:   true,
					configurable: false
				});


				// Create new prototype
				namespace[classId].prototype = {};


				var extendargs = [];

				extendargs.push(namespace[classId].prototype);

				for (var i = 0, il = includes.length; i < il; i++) {

					var include = _get_template.call(this.global, includes[i]);
					if (include !== null) {

						extendargs.push(include.prototype);

					} else {

						if (this.debug === true) {
							console.error('lychee-Environment-' + this.id + ': Invalid Inclusion of "' + includes[i] + '"');
						}

					}

				}


				if (oldprototype !== null) {
					extendargs.push(oldprototype);
				}


				lychee.extend.apply(lychee, extendargs);

				Object.seal(namespace[classId].prototype);


			/*
			 * 2.2 Nothing to include, plain Definition
			 */

			} else {

				namespace[classId] = template;


				if (template instanceof Object) {
					Object.seal(namespace[classId]);
				}

			}

		} else {

			namespace[classId] = function() {};

			if (this.debug === true) {
				this.global.console.error('lychee-Environment-' + this.id + ': Invalid Definition "' + definition.id + '", it is a Dummy now.');
			}

		}


		return true;

	};

	var _get_class = function(identifier) {

		var id = identifier.split('.').pop();

		var pointer = _get_namespace.call(this, identifier);
		if (pointer[id] !== undefined) {
			return pointer;
		}


		return null;

	};

	var _get_namespace = function(identifier) {

		var pointer = this;

		var ns = identifier.split('.'); ns.pop();
		for (var n = 0, l = ns.length; n < l; n++) {

			var name = ns[n];

			if (pointer[name] === undefined) {
				pointer[name] = {};
			}

			pointer = pointer[name];

		}


		return pointer;

	};

	var _get_template = function(identifier) {

		var pointer = this;

		var ns = identifier.split('.');
		for (var n = 0, l = ns.length; n < l; n++) {

			var name = ns[n];

			if (pointer[name] !== undefined) {
				pointer = pointer[name];
			} else {
				pointer = null;
				break;
			}

		}


		return pointer;

	};



	/*
	 * STRUCTS
	 */

	var _sandbox = function(settings) {

		this.__STDOUT = '';
		this.__STDERR = '';


		var that = this;

		this.console = {};
		this.console.log = function() {

			var str = '\n';

			for (var a = 0, al = arguments.length; a < al; a++) {

				var arg = arguments[a];
				if (arg instanceof Object) {
					str += JSON.stringify(arg, null, '\t');
				} else if (typeof arg.toString === 'function') {
					str += arg.toString();
				} else {
					str += arg;
				}

				if (a < al - 1) {
					str += '\t';
				}

			}

			that.__STDOUT += str;

			if (str.substr(0, 3) === '(E)') {
				that.__STDERR += str;
			}

		};

		this.console.info = function() {

			var args = [ '(I)\t' ];

			for (var a = 0, al = arguments.length; a < al; a++) {
				args.push(arguments[a]);
			}

			this.log.apply(this, args);

		};

		this.console.warn = function() {

			var args = [ '(W)\t' ];

			for (var a = 0, al = arguments.length; a < al; a++) {
				args.push(arguments[a]);
			}

			this.log.apply(this, args);

		};

		this.console.error = function() {

			var args = [ '(E)\t' ];

			for (var a = 0, al = arguments.length; a < al; a++) {
				args.push(arguments[a]);
			}

			this.log.apply(this, args);

		};


		this.Buffer  = global.Buffer;
		this.Config  = global.Config;
		this.Font    = global.Font;
		this.Music   = global.Music;
		this.Sound   = global.Sound;
		this.Texture = global.Texture;


		this.lychee              = {};
		this.lychee.ENVIRONMENTS = {};
		this.lychee.VERSION      = global.lychee.VERSION;

		[
			'debug', 'environment',
			'diff', 'extend', 'extendsafe', 'extendunlink',
			'enumof', 'interfaceof',
			'serialize', 'deserialize',
			'define', 'init', 'setEnvironment',
			'Debugger', 'Definition', 'Environment', 'Package'
		].forEach(function(identifier) {

			that.lychee[identifier] = global.lychee[identifier];

		});


		this.setTimeout = function(callback, timeout) {
			global.setTimeout(callback, timeout);
		};

		this.setInterval = function(callback, interval) {
			global.setInterval(callback, interval);
		};


		if (settings instanceof Object) {

			for (var property in settings) {

				var instance = lychee.deserialize(settings[property]);
				if (instance !== null) {
					this[property] = instance;
				}

			}

		}

	};

	_sandbox.prototype = {

		deserialize: function(blob) {

			if (typeof blob.STDOUT === 'string') {
				this.__STDOUT = blob.STDOUT;
			}

			if (typeof blob.STDERR === 'string') {
				this.__STDERR = blob.STDERR;
			}

		},

		serialize: function() {

			var settings = {};
			var blob     = {};


			for (var property in this) {

				if (property.charAt(0) !== '_' && property === property.toUpperCase()) {
					settings[property] = lychee.serialize(this[property]);
				}

			}


			if (this.__STDOUT.length > 0) blob.STDOUT = this.__STDOUT;
			if (this.__STDERR.length > 0) blob.STDERR = this.__STDERR;


			return {
				'constructor': '_sandbox',
				'arguments':   [ settings ],
				'blob':        Object.keys(blob).length > 0 ? blob : null
			};

		}

	};



	/*
	 * IMPLEMENTATION
	 */

	var _id = 0;

	var Class = function(data) {

		var settings = lychee.extend({}, data);


		this.id          = '' + _id++;
		this.build       = 'game.Main';
		this.debug       = true;
		this.definitions = {};
		this.global      = new _sandbox();
		this.packages    = [];
		this.sandbox     = true;
		this.tags        = {};
		this.timeout     = 10000;
		this.type        = 'source';


		this.__cache = {
			active:   false,
			start:    0,
			end:      0,
			timeout:  0,
			load:     [],
			ready:    [],
			track:    []
		};


		// Alternative API for lychee.pkg

		if (settings.packages instanceof Array) {

			for (var p = 0, pl = settings.packages.length; p < pl; p++) {

				var pkg = settings.packages[p];
				if (pkg instanceof Array) {
					settings.packages[p] = new lychee.Package(pkg[0], pkg[1]);
				}

			}

		}


		this.setSandbox(settings.sandbox);
		this.setDebug(settings.debug);

		this.setDefinitions(settings.definitions);
		this.setId(settings.id);
		this.setPackages(settings.packages);
		this.setTags(settings.tags);
		this.setTimeout(settings.timeout);

		// Needs this.packages to be ready
		this.setType(settings.type);
		this.setBuild(settings.build);



		/*
		 * INITIALIZATION
		 */

		var type = this.type;
		if (type === 'source' || type === 'export') {

			var lypkg = _get_package.call(this, 'lychee');
			if (lypkg === null) {

				lypkg = new lychee.Package('lychee', '/lychee/lychee.pkg');

				if (this.debug === true) {
					this.global.console.log('lychee-Environment-' + this.id + ': Injecting Package "lychee"');
				}

				lypkg.setEnvironment(this);
				this.packages.push(lypkg);

			}

		}


		settings = null;

	};



	/*
	 * BOOTSTRAP API
	 */

	Class.__FILENAME = null;

	var _asset_types = {};

	Class.createAsset = function(url, type) {

		url  = typeof url === 'string'  ? url  : null;
		type = typeof type === 'string' ? type : null;


		if (url !== null) {

			if (type === null) {
				type = url.split('/').pop().split('.').pop();
			}


			var construct = _asset_types[type] || _asset_types['*'] || null;
			if (construct !== null) {
				return new construct(url);
			}

		}


		return null;

	};

	Class.setAssetType = function(type, construct) {

		type      = typeof type === 'string'      ? type      : null;
		construct = construct instanceof Function ? construct : null;


		if (type !== null && construct !== null) {

			_asset_types[type] = construct;


			return true;

		}


		return false;

	};



	/*
	 * IMPLEMENTATION
	 */

	Class.prototype = {

		createAsset: function(url) {
			return Class.createAsset(url);
		},


		/*
		 * ENTITY API
		 */

		deserialize: function(blob) {

			if (blob.definitions instanceof Object) {

				for (var id in blob.definitions) {
					this.definitions[id] = lychee.deserialize(blob.definitions[id]);
				}

			}

			if (blob.packages instanceof Array) {

				var packages = [];

				for (var p = 0, pl = blob.packages.length; p < pl; p++) {
					packages.push(lychee.deserialize(blob.packages[p]));
				}

				this.setPackages(packages);

				// This is a dirty hack which is allowed here
				this.setType(blob.type);
				this.setBuild(blob.build);

			} else {

				// This is a dirty hack which is allowed here
				this.setType(blob.type);
				this.setBuild(blob.build);

			}

			if (blob.global instanceof Object) {

				this.global = new _sandbox(blob.global.arguments[0]);

				if (blob.global.blob !== null) {
					this.global.deserialize(blob.global.blob);
				}

			}

		},

		serialize: function() {

			var settings = {};
			var blob     = {};


			if (this.id !== '0')            settings.id      = this.id;
			if (this.build !== 'game.Main') settings.build   = this.build;
			if (this.debug !== true)        settings.debug   = this.debug;
			if (this.sandbox !== true)      settings.sandbox = this.sandbox;
			if (this.timeout !== 10000)     settings.timeout = this.timeout;
			if (this.type !== 'source')     settings.type    = this.type;


			if (Object.keys(this.tags).length > 0) {

				settings.tags = {};

				for (var tagid in this.tags) {
					settings.tags[tagid] = this.tags[tagid];
				}

			}

			if (Object.keys(this.definitions).length > 0) {

				blob.definitions = {};

				for (var defid in this.definitions) {
					blob.definitions[defid] = lychee.serialize(this.definitions[defid]);
				}

			}

			if (this.packages.length > 0) {

				blob.packages = [];

				for (var p = 0, pl = this.packages.length; p < pl; p++) {
					blob.packages.push(lychee.serialize(this.packages[p]));
				}

				// This is a dirty hack which is allowed here
				blob.type  = this.type;
				blob.build = this.build;

			}

			if (this.sandbox === true) {
				blob.global = this.global.serialize();
			}


			return {
				'constructor': 'lychee.Environment',
				'arguments':   [ settings ],
				'blob':        Object.keys(blob).length > 0 ? blob : null
			};

		},



		/*
		 * CUSTOM API
		 */

		load: function(identifier) {

			identifier = typeof identifier === 'string' ? identifier : null;


			if (identifier !== null) {

				var packageId = identifier.split('.')[0];
				var classId   = identifier.split('.').slice(1).join('.');


				var definition = this.definitions[identifier] || null;
				if (definition !== null) {

					return true;

				} else {

					var pkg = _get_package.call(this, packageId);
					if (pkg !== null && pkg.isReady() === true) {

						var result = pkg.load(classId, this.tags);
						if (result === true) {

							if (this.debug === true) {
								this.global.console.log('lychee-Environment-' + this.id + ': Loading "' + identifier + '" from Package "' + pkg.id + '"');
							}

						}


						return result;

					}

				}

			}


			return false;

		},

		define: function(definition) {

			var filename = Class.__FILENAME || null;
			if (filename !== null) {

				if (definition instanceof lychee.Definition) {

					var oldPackageId = definition.packageId;
					var newPackageId = null;

					for (var p = 0, pl = this.packages.length; p < pl; p++) {

						var root = this.packages[p].root;
						if (filename.substr(0, root.length) === root) {
							newPackageId = this.packages[p].id;
							break;
						}

					}


					if (newPackageId !== null && newPackageId !== oldPackageId) {

						if (this.debug === true) {
							this.global.console.log('lychee-Environment-' + this.id + ': Injecting Definition "' + definition.id + '" as "' + newPackageId + '.' + definition.classId + '"');
						}


						definition.packageId = newPackageId;
						definition.id        = definition.packageId + '.' + definition.classId;

						for (var i = 0, il = definition._includes.length; i < il; i++) {

							var inc = definition._includes[i];
							if (inc.substr(0, oldPackageId.length) === oldPackageId) {
								definition._includes[i] = newPackageId + inc.substr(oldPackageId.length);
							}

						}

						for (var r = 0, rl = definition._requires.length; r < rl; r++) {

							var req = definition._requires[r];
							if (req.substr(0, oldPackageId.length) === oldPackageId) {
								definition._requires[r] = newPackageId + req.substr(oldPackageId.length);
							}

						}

					}

				}

			}


			if (_validate_definition.call(this, definition) === true) {

				if (this.debug === true) {
					var info = Object.keys(definition._tags).length > 0 ? ('(' + JSON.stringify(definition._tags) + ')') : '';
					this.global.console.log('lychee-Environment-' + this.id + ': Mapping "' + definition.id + '" ' + info);
				}

				this.definitions[definition.id] = definition;

			} else {

				if (this.debug === true) {
					this.global.console.error('lychee-Environment-' + this.id + ': Invalid Definition "' + definition.id + '"');
				}

			}


			return definition;

		},

		init: function(callback) {

			callback = callback instanceof Function ? callback : function() {};


			var build = this.build;
			var cache = this.__cache;
			var that  = this;

			if (build !== null && cache.active === false) {

				var result = this.load(build, 'lychee.init');
				if (result === true) {

					if (this.debug === true) {
						this.global.console.log('lychee-Environment-' + this.id + ': BUILD START ("' + this.build + '")');
					}


					cache.start   = Date.now();
					cache.timeout = Date.now() + this.timeout;
					cache.load    = [ build ];
					cache.ready   = [];
					cache.active  = true;


					var onbuildend = function() {

						cache.end = Date.now();

						if (this.debug === true) {
							this.global.console.log('lychee-Environment-' + this.id + ': BUILD END (' + (cache.end - cache.start) + 'ms)');
						}


						if (this.sandbox === true) {
							this.global.lychee.environment = this;
						}


						if (this.debug === true) {

							try {

								callback.call(
									this.global,
									this.global
								);

							} catch(err) {
								lychee.Debugger.report(this, err, null);
							}

						} else {

							callback.call(
								this.global,
								this.global
							);

						}

					};


					var intervalId = setInterval(function() {

						var cache = that.__cache;
						if (cache.active === true) {

							_export_loop.call(that, cache);

						} else if (cache.active === false) {

							if (intervalId !== null) {
								clearInterval(intervalId);
								intervalId = null;
							}

							if (Date.now() > cache.timeout) {

								if (that.debug === true) {

									that.global.console.error('lychee-Environment-' + that.id + ': BUILD TIMEOUT (' + (Date.now() - cache.start) + 'ms)');
									that.global.console.error('lychee-Environment-' + that.id + ': Invalid Dependencies ' + cache.load.map(function(value, index) {
										return '"' + value + '" (required by ' + cache.track[index] + ')';
									}).join(', '));

								}

							} else {
								onbuildend.call(that);
							}

						}

					}, (1000 / 60) | 0);

				} else {

					if (this.debug === true) {
						this.global.console.log('lychee-Environment-' + this.id + ': Package not ready, retrying in 100ms ...');
					}


					setTimeout(function() {
						that.init(callback);
					}, 100);

				}

			}

		},

		inject: function(environment) {

			environment = environment instanceof Class ? environment : null;


			if (environment !== null) {

				for (var identifier in environment.definitions) {

					var definition = environment.definitions[identifier];
					if (_validate_definition.call(this, definition) === true) {

						if (this.debug === true) {
							var info = Object.keys(definition._tags).length > 0 ? ('(' + JSON.stringify(definition._tags) + ')') : '';
							this.global.console.log('lychee-Environment-' + this.id + ': Injecting "' + definition.id + '" ' + info);
						}

						// Inject definition as environment knows definition
						this.definitions[identifier] = definition;

					}

				}


				return true;

			}


			return false;

		},

		setBuild: function(identifier) {

			identifier = typeof identifier === 'string' ? identifier : null;


			if (identifier !== null) {

				var type = this.type;
				if (type === 'build') {

					this.build = identifier;

					return true;

				} else {

					var pkg = _get_package.call(this, identifier.split('.')[0]);
					if (pkg !== null) {

						this.build = identifier;

						return true;

					}

				}

			}


			return false;

		},

		setDebug: function(debug) {

			if (debug === true || debug === false) {

				this.debug = debug;

				if (this.sandbox === true) {
					this.global.lychee.debug = debug;
				}

				return true;

			}


			return false;

		},

		setDefinitions: function(definitions) {

			definitions = definitions instanceof Object ? definitions : null;


			if (definitions !== null) {

				for (var identifier in definitions) {

					var definition = definitions[identifier];
					if (definition instanceof lychee.Definition) {
						this.definitions[identifier] = definition;
					}

				}


				return true;

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

		setPackages: function(packages) {

			packages = packages instanceof Array ? packages : null;


			if (packages !== null) {

				for (var p = 0, pl = packages.length; p < pl; p++) {

					var pkg = packages[p];
					if (pkg instanceof lychee.Package) {

						if (this.debug === true) {
							this.global.console.log('lychee-Environment-' + this.id + ': Adding Package "' + pkg.id + '"');
						}

						pkg.setEnvironment(this);
						this.packages.push(pkg);

					}

				}


				return true;

			}


			return false;

		},

		setSandbox: function(sandbox) {

			if (sandbox === true || sandbox === false) {

				this.sandbox = sandbox;


				if (sandbox === true) {
					this.global = new _sandbox();
				} else {
					this.global = global;
				}


				return true;

			}


			return false;

		},

		setTags: function(tags) {

			tags = tags instanceof Object ? tags : null;


			if (tags !== null) {

				for (var type in tags) {

					var values = tags[type];
					if (_validate_values(values) === true) {
						this.tags[type] = values;
					}

				}


				return true;

			}


			return false;

		},

		setTimeout: function(timeout) {

			timeout = typeof timeout === 'number' ? timeout : null;


			if (timeout !== null) {

				this.timeout = timeout;

				return true;

			}


			return false;

		},

		setType: function(type) {

			if (type === 'source' || type === 'export' || type === 'build') {

				this.type = type;


				for (var p = 0, pl = this.packages.length; p < pl; p++) {
					this.packages[p].setType(this.type);
				}


				return true;

			}


			return false;

		}

	};


	return Class;

})(typeof global !== 'undefined' ? global : this);

