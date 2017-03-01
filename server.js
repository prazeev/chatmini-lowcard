var express = require("express");
var app = express();
var server = require('http').createServer(app);
var io = require("socket.io").listen(server);
var moment = require('moment');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
// Userlist for the game
var users = [];
var game_users = [];
var message = [];
var session = require("express-session")({
    secret: "sfgksjfgdijkshgikdsjbgjdbgfdug",
    resave: true,
    saveUninitialized: true
});
var sharedsession = require("express-socket.io-session");
// Game list for play or playing
var game_list = [
					{
						'game_id': 1,
						'game_name': 'My Game',
						'price' : 20.39,
						'start_by':'prazeev',
						'winner': 'prazeev',
						'time': moment().format('X'),
						'join_time': (Number(moment().format('X')) + Number(60)),
						'next_roll': (Number(moment().format('X')) + Number(120)),
						'message': 'Waiting for joining player',
						'status': 0,
						'round': 0
					}
				];
// Socket connection list
var connections = [];
// Card for the game play rolled or not
var card_rolling = [];
// Game check if exists or not
var game_check = function(game_id, callback) {
	var check;
	for(var i in game_list) {
		if(game_list[i].game_id == game_id) {
			//console.log(i);
			return callback(true);
			break;
		} else {
			check = false;
		}
	}
	return callback(false);
}

var get_info = function(game_id, callback) {
	var game = {};
	for(var i in game_list) {
		if(game_list[i].game_id == game_id)
			game = game_list[i];
	}
	callback(game);
}

var get_player = function(game_id, username, callback) {
	var player = {};
	for(var i in game_users) {
		if(game_users[i].game_id == game_id && game_users[i].username == username)
			player = game_users[i];
	}
	callback(player);
}

var get_user = function(username, callback) {
	for(var i in users) {
		if(users[i].username == username)
			return callback(users[i]);
	}
}

var get_no_of_player = function(game_id, callback) {
	var player = 0;
	for(var i in game_users) {
		if(game_users[i].game_id == game_id)
			player++;
	}
	callback(player);
}


var update_card = function(data, callback) {
	for(var i in game_users) {
		if(game_users[i].game_id == data.game_id && game_users[i].username == data.username) {
			game_users[i] = data;
			console.log(data.username+'draw from game id'+data.game_id+' with priority of '+data.roll);
			return callback(true);
		}
	}
	callback(false);
}


// 9843448514
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
server.listen(process.env.PORT || 8080);
console.log("Server running...");
// init session
app.use(session);
io.use(sharedsession(session, {
    autoSave:true
}));
app.set('views', __dirname+'/views');
app.set('view engine','jade');
app.use(express.static(__dirname + '/public/assets'));


app.get("/", function(req, res) {
	var username = req.session.username;
	if(!username) {
		res.redirect('/login');
		return;
	}
	var avaliable_game = [];
	for (var i in game_list) {
		 var game_time = Number(game_list[i].join_time) - Number(moment().format('X'));
		var game_data = [
			game_list[i].game_id,
			game_list[i].game_name,
			game_list[i].price,
			game_list[i].start_by,
			game_time,
			game_list[i].status,
			game_list[i].message
		];
		if(game_time > 0)
			avaliable_game.push(game_data);
	}
	res.render('index', {
		title: 'Game List',
		games: avaliable_game
	});
});

app.get("/login", function(req, res) {
	var username = req.session.username;
	if(username)
		res.redirect('/?message=Logged In');
	res.render('login');
});

app.post('/login', function(req, res) {
	//req.session.username;
	var username = req.session.username;
	var user = req.body;
	if(!user.username)
		res.redirect('/?message=EmptyPost');
	if(!username) {
		username = user.username;
		req.session.username = username;
		var data = {
		username: username,
		credit: 200.00,
		profile: '/images/avatar.png'
		};
		users.push(data);
		res.redirect('/?message='+username);
	} else {
		res.redirect('/?message=Logged In');
	}
});

app.post("/post", function(req, res, next) {
	var username = req.session.username;
	if(!username) {
		res.redirect('/login');
		return;
	}
	var game = req.body;
	var game_id = Number(game_list.length) + Number(1)
	var data = {
						'game_id': game_id,
						'game_name': game.game_name,
						'price' : game.price,
						'start_by': req.session.username,
						'winner': '',
						'time': moment().format('X'),
						'join_time': (Number(moment().format('X')) + Number(60)),
						'next_roll': (Number(moment().format('X')) + Number(120)),
						'message': 'Waiting for joining player',
						'status': 0,
						'round' : 0
					};
	game_list.push(data);
	res.redirect('/play/'+game_id);
});

app.get("/join/:id", function(req, res, next) {
	var game = req.params;
	var game_id = game.id;
	var username = req.session.username;
	if(!username) {
		res.redirect('/login');
		return;
	}
	var game_info = {};
	var roll_info = {};
	var picture = '';
	get_user(username, function(e) {
		picture = e.profile;
	});
	// set data
	var data = {
		'username': username,
		'game_id': game_id,
		'roll' : null,
		'picture': picture
	};
	// Get info of game
	get_info(game_id, function(e) {
		game_info = e;
	});

	// Get player info
	get_player(game_id,username, function(e) {
		roll_info = e;
	});
	// Check game existance
	if(game_info.length == 0) {
		console.log(game_info.game_id);
		res.redirect('/play/'+game_id);
		return;
	}
	// Check join time
	if(game_info.join_time < moment().format('X')) {
		console.log('Canot join. Join time ended');
		res.redirect('/play/'+game_id);
		return;
	}
	// Check roll
	if(roll_info.length == 1) {
		console.log('Cannot join. Already in game.');
		res.redirect('/play/'+game_id);
		return;
	}

	game_users.push(data);
	var message = username+" joined the game.";
	io.sockets.emit('new message',{type: 'info', heading: 'Game Join', message: message});
	res.redirect('/play/'+game_id);
});

app.get("/play/:id", function(req, res, next) {
	var username = req.session.username;
	if(!username) {
		res.redirect('/login');
		return;
	}
	var game = req.params;
	// Game id
	var game_id = game.id;
	var users_in_game = [];
	var check_user = false;
	game_check(game_id, function(result) {
		if(!result)
			res.redirect('/?messsage=Game Not Exists');
	});
	for(var i in game_users) {
		if(game_users[i].game_id == game_id) {
			users_in_game.push([game_users[i].username]);
			if(game_users[i].username == username)
				check_user = true;
		}
	}
	res.render('game', {
		user_in_game: users_in_game,
		check_user: check_user,
		user: username,
		game_id: game_id
	});
});

var draw_card = function(priority,callback) {
    var fname = [2,3,4,5,6,7,8,9,10,'jack','queen','king','ace'];
    var lname = ['clubs','diamonds','spades','hearts'];
	var rand4 = Math.floor(Math.random() * 3);
	var card = 'cards/'+fname[priority]+'_of_'+lname[rand4]+'.png';
 	callback(card); 
};
io.sockets.on('connection', function(socket) {
	connections.push(socket);
	// Auto refresh
	setInterval(function() {
		for(var i in game_list) {
			if(game_list[i].join_time < moment().format('X') && game_list[i].status == 0) {
				game_list[i].status = 1;
				game_list[i].round = 1;
				game_list[i].message = "Joining Completed.<br>First round started.";
				io.sockets.emit('game info', game_list);
				var message = "Joining completed. First round starts.";
				io.sockets.emit('new message',{game_id:game_list[i].game_id,type: 'success', heading: 'Information', message: message});									
				continue;
			}
			// Gets game list with rolling time exceed
			if(game_list[i].next_roll < moment().format('X') && game_list[i].status != 2) {
				var out = [];
				//Perform action for users unrolled
				game_list[i].next_roll = Number(game_list[i].next_roll) + Number(60);
				for(var j in game_users) {
					// For unrolled users
					if(game_users[j].game_id == game_list[i].game_id) {
						// IF user havent drawn for the round
						if(game_users[j].roll == null) {
							// Round ended automatic calculations 
							var priority = Math.floor(Math.random() * 12);
							var card = '';
							draw_card(priority, function(res) {
								card = res;
							});
							var picture = '';
							get_user(game_users[j].username, function(e) {
								picture = e.profile;
							});
							var update_card_d = {
								'username': game_users[j].username,
								'game_id': game_users[j].game_id,
								'roll': priority,
								'picture': picture
								};
							update_card(update_card_d, function(e) {
								if(e) {
									var card_list = [2,3,4,5,6,7,8,9,10,'jack','queen','king','ace'];
									var message = "Bod draw "+card_list[priority]+" for "+game_users[j].username;
									io.sockets.emit('new message',{game_id:game_users[j].game_id,type: 'info', heading: 'Game Join', message: message});
									io.sockets.emit('new card', {card: card, game_id: game_users[j].game_id});
								}
							});
						}
						// push to array to find lowest roller
						out.push(game_users[j].roll);
					}
				}
				// PLAYER out action
				var min = Math.min.apply(null, out);
				var tie = out.filter(function(val){
    				return val === min;
				}).length;

				// if there is tie or not we can manage from here using tie variable
				//var splice_check = false;
				for(var j in game_users) {
					if(game_users[j].game_id == game_list[i].game_id && game_users[j].roll == min) {
						game_users.splice(j, 1);
					}
				}
				var left_player;
				get_no_of_player(game_list[i].game_id, function(e) {
					left_player = e;
				});
				if(left_player == 1) {
					for(j in game_users) {
						if(game_users[j].game_id == game_list[i].game_id) {
							game_list[i].message = "Game over.";
							game_list[i].winner = game_users[j].username;
							game_list[i].status = 2;
							io.sockets.emit('game info', game_list);
							var card_list = [2,3,4,5,6,7,8,9,10,'jack','queen','king','ace'];
							var message = game_users[j].username+" win the match with highest card "+card_list[game_users[j].roll];
							io.sockets.emit('new message',{game_id:game_users[j].game_id,type: 'success', heading: 'Game Over', message: message});									
						}
					}
				} else {
					game_list[i].round += 1;
					game_list[i].message = "Next round started.";
					var message = "New round started.";
					io.sockets.emit('new message',{game_id:game_list[i].game_id,type: 'success', heading: 'Information', message: message});									
					io.sockets.emit('game info', game_list);
				}
				for(var j in game_users) {
					game_users[j].roll = null;
					io.sockets.emit('new user', game_users);
				}
			}
		}
	}, 1000);
	console.log("New client %s is Connected: %s socket users",socket.handshake.session.username,connections.length);

	// Send message
	socket.on("disconnect", function(data) {
		connections.splice(connections.indexOf(socket), 1);
		console.log("Disconnected: %s socket users",connections.length);
	});
	// send message
	socket.on("draw card", function(data) {
		var priority = Math.floor(Math.random() * 12);
		var card;
		var game = {};
		var roll_info = {};
		var username = socket.handshake.session.username;
		var time = moment().format('X');
		// Get game info 
		get_info(data.game_id, function(e) {
			game = e;
		});
		// Get player info
		get_player(data.game_id,username, function(e) {
			roll_info = e;
		});
		if(!game.game_id) {
			console.log("Sorry, invalid game.");
			return;
		}
		if(roll_info.roll != null) {
			console.log("Sorry, invalid time for roll"+roll_info.roll);
			return;
		}
		if(game.join_time > time) {
			console.log("Sorry, invalid time for roll. Let joining time be completed."+(game.join_time - time));
			return;
		}
		if(roll_info == null) {
			console.log("Sorry, you are not in game.");
			return;
		}
		draw_card(priority, function(res) {
			card = res;
		});

		var picture = '';
		get_user(username, function(e) {
			picture = e.profile;
		});
		var update_card_d = {
			'username': username,
			'game_id': data.game_id,
			'roll': priority,
			'picture': picture
		};
		update_card(update_card_d, function(e) {
			if(e) {
				var card_list = [2,3,4,5,6,7,8,9,10,'jack','queen','king','ace'];
				var message = username+" draw "+card_list[priority];
				io.sockets.emit('new message',{game_id:data.game_id,type: 'info', heading: 'Game Draw', message: message});
				io.sockets.emit('new card', {card: card, game_id: data.game_id});
			}
			io.sockets.emit('new user', game_users);
		});
		
	});
	// user joins list
	io.sockets.emit('new user', game_users);
	io.sockets.emit('game info', game_list);

	socket.on("get time", function() {
		var game_id = data.game_id;
		for (var i = game_list.length - 1; i >= 0; i--) {
			if(game_list[i][0] == game_id) {
				var game = game_list[i];
				break;
			}
		}
		var game_time = Number(game_list[i][6]) - Number(moment().format('X'));
	});
});