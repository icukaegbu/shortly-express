var db = require('../config');
//var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'));

var User = db.Model.extend({
	tableName: 'users',

	hasTimestamps: true,

	initialize: function(){
		db.Model.prototype.initialize.apply(this, arguments);

		this.on('saving', this.hashPassword, this);
	},

	//set salted password
	hashPassword: function(){
		var that = this;

		return bcrypt.genSaltAsync(10)
			.then(function(salt){
				that.set('salt', salt);

				return bcrypt.hashAsync(that.get('password'), salt);
			})
			.then(function(hash){
				return that.set('password', hash);
			});
	},

	//authenticate user
	authenticate: function(username, password){
		return new this({username: username}).fetch({require: true})
				.then(function(user){
					return [bcrypt.hashAsync(password, user.get('salt')), user];
				})
				.spread(function(hash, user){
					if(hash === user.get('password')){
						return user;
					}
					throw new Error('passoword or username is incorrect');
				});
	}
});

module.exports = User;