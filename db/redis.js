var async = require( 'async' );
var redis = require( 'redis' );
var redisClient = redis.createClient(); // can specify ( post, host )

redisClient.on( 'connect', function() {
  console.log( "redis db connected" );
});
redisClient.flushall(); // dev only

/* ===========================================================

REDIS client structure

key              | type    | members   | represents:
--------------------------------------------------------------
'rooms'          | SET     | <room_id> | all room
'room<room_id>'  | SET     | <user_id> | all users in room
'users'          | SET     | <user_id> | all users 
'user<user_id>'  | HASH    | user data | user data

* room_id is the name of the room (they all begin '@')
* user_id = <roomId>:<username>
* rooms and room<room_id> are sets because their members must
  be unique

=========================================================== */

exports.addUserData = function( userId, username, callback ) {
  redisClient.hmset( keyify( 'user', userId ), 
    'username', username, 
    'joined_on', new Date().getTime(),
    'left_on', 'false',
    'active', 'true',
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.addUserToRoom = function( userId, roomId, callback ) {
  redisClient.sadd( keyify( 'room', roomId ), userId,
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.addUser = function( userId, callback ) {
  redisClient.sadd( 'users', userId,
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.deactivateUser = function( userId, callback ) {
  redisClient.hmset( keyify( 'user', userId ), 
    'active', 'false',
    'left_on', new Date().getTime(),
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.getUserData = function( userId, callback ) {
  redisClient.hmget( keyify( 'user', userId ), 
    'active', 'username', 'joined_on', 'left_on',
    function( err, res ) {
      if( err ) throw err;
      callback( res );
    });
};

exports.getUsersInRoom = function( roomId, callback ) {
  var thisRedis = this;
  redisClient.smembers( keyify( 'room', roomId ),
    function( err, res ) {
      if( err ) throw err;
      async.map( res, 
        function( userId, cb ) {
          thisRedis.getUserData( userId, function( data ) {
            cb( null, data );
          });
        }, 
        function( err, result ) { 
          if( err ) throw err;
          var users = [];
          result.forEach( function( reply, i ) {
            var activeState = false;
            if( reply[0] == 'true' )
              activeState = true; 
            if( reply[0] == 'false' )
              activeState = false; 

            var user = {
              active: activeState,
              username: reply[1],
              joined: parseInt( reply[2] ),
              left: parseInt( reply[3] )
            };
            users.push( user );
          });
          users.sort( compare );
          callback( users );
        });
    });
};

exports.isValidUsername = function( username, roomId, callback ) {
  var userId = roomId + ":" + username;
  redisClient.sismember( keyify( 'room', roomId ), userId,
    function( err, res ) {
      if( err ) throw err;
      if( res == 0 ) { // is not member
        callback( true );
      } else { // is member
        callback( false );
      }
    });
};

exports.isExistingRoom = function( roomId, callback ) {
  redisClient.sismember( 'rooms', roomId,
    function( err, res ) {
      if( err ) throw err;
      if( res == 0 ) { // is not member
        callback( false );
      } else { // is member
        callback( true );
      }
    });
};

exports.addRoom = function( roomId, callback ) {
  redisClient.sadd( 'rooms', roomId,
    function( err, res ) {
      if( err ) throw err;
      callback( true );
    });
};

/* trending is defined simply by the number of online users */
exports.getTrendingRooms = function( num, callback ) {
};

/* returns total minutes spent in a room collectively
   TODO: untested */
exports.totalMinutes = function( room, callback ) {
  redisClient.smembers( keyify( 'room', room ),
    function( err, res ) {
      if( err ) throw err;
      console.log( res );

      async.map( res,
        function( userId, cb ) {
          redisClient.hmget( keyify( 'user', userId ), 
            'active', 'joined_on', 'left_on',
            function( err, res1 ) {
              if( err ) throw err;
              console.log( res1 );
              var isActive = res1[0],
                  joinedOn= res1[1],
                  leftOn = res1[2];

              var timeSpent = null;
              if( isActive == 'true' ) {
                timeSpent = new Date().getTime() - joinedOn;
              } else {
                timeSpent = leftOn - joinedOn;
              }
              console.log( timeSpent );
              cb( null, timeSpent );
            });  
        },
        function( err, results ) {
          if( err ) throw err;
          var totalTime = 0;
          results.forEach( function( item, i ) {
            totalTime += item;
          });
          console.log( totalTime );
          callback( totalTime );
        });
        
      });
};

function keyify( type, specifier ) {
  return type + "<" + specifier + ">";
};

function compare( a, b ) {
  if (JSON.stringify( a.joined ) < JSON.stringify( b.joined ) )
    return -1;
  if (JSON.stringify( a.joined ) > JSON.stringify( b.joined ) )
    return 1;
  return 0;
}
