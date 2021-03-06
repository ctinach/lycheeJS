
lychee.define('sorbet.module.Error').requires([
	'sorbet.data.Template'
]).exports(function(lychee, sorbet, global, attachments) {

	var _templates = {
		'text/html':        new sorbet.data.Template(attachments['html.tpl']),
		'application/json': new sorbet.data.Template(attachments['json.tpl'])
	};


	var Class = function(main) {

		this.id   = 'Error';
		this.main = main || null;

	};


	Class.STATUS = {
		400: '私 იქნებოდა not understand на solicitud.',
		401: 'Nice try ... NOT',
		402: 'Gimme money. Bitches love money!',
		403: 'You have no power here.',
		404: 'Oh noez! I lost the file. It was here, I promise ... but it\'s gone now.',
		405: 'The cake is a lie!',
		406: 'Grumpy Webserver is grumpy.',
		407: 'Bitches Proxy be like crazy.',
		408: 'Go get some coffee. This might take a while ...',
		409: 'It\'s dangerous to go alone.',
		410: 'Oh noez! The requested resource has disappeared!',
		411: 'You mad bro? I need a Length.',
		412: 'Y U NO Precondition?',
		413: 'TL;DR - Too long, didn\'t read.',
		414: 'TL;DR - Too long, didn\'t read.',
		415: 'Trololo. Can\'t support this shit.',
		416: 'Watch out! We got a badass Request Range over there!',
		417: 'Expectation Failed. Nailed it.',
		418: 'I\'m a tea pot.',
		500: 'Damn. You broke it!',
		501: 'Not sure if trolling or not implemented ...',
		502: 'Bitches Gateway be like crazy.',
		503: 'Ain\'t nobody time for that Service!',
		504: 'Ain\'t nobody time for that Gateway!',
		505: 'Wow. Many HTTP. Such Version. So not supported.'
	};


	Class.prototype = {

		process: function(vhost, response, data) {

			var status = typeof data.status === 'number'   ? data.status   : 500;
			var host   = typeof data.host === 'string'     ? data.host     : null;
			var url    = typeof data.url === 'string'      ? data.url      : null;
			var type   = typeof data.type === 'string'     ? data.type     : 'text/html';


			if (lychee.debug === true) {
				console.error('sorbet.module.Error: ' + status + ' for "' + host + ' , ' + url + '"');
			}


			var content  = '';
			var message  = Class.STATUS[status] || '';
			var version  = sorbet.Main.VERSION;


			var template = _templates[type] || null;
			if (template === null) {
				template = _templates['text/html'];
				type     = 'text/html';
			}


			try {

				content = template.render({
					status:  status,
					host:    host,
					url:     url,
					message: message,
					version: version
				});

			} catch(e) {

				content = '';

			}


			response.status                 = status;
			response.header['Content-Type'] = type;
			response.content                = content;


			return true;

		}

	};


	return Class;

});

