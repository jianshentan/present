var async = require( 'async' );
var redis = require( 'redis' );

/* init redis */
if(process.env.REDISTOGO_URL ) {
  // HEROKU
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  var redis = require("redis").createClient(rtg.port, rtg.hostname);
  redis.auth(rtg.auth.split(":")[1]);
} else {
  // LOCAL
  var redisClient = require("redis").createClient(); //can specify ( post, host )
}

redisClient.on( 'connect', function() {
  console.log( "redis db connected" );
});
// redisClient.flushall(); // dev only

/* ===========================================================

REDIS client structure

key              | type      | members    | represents:
--------------------------------------------------------------
'rooms'          | SET       | <room_id>  | all room
'room<room_id>'  | SET       | <user_id>  | all users in room
'users'          | SET       | <user_id>  | all users 
'user<user_id>'  | HASH      | user data  | user data
'trending'       | SORTEDSET | <room_id>  | sorted by most active users 

* TODO: trending + rooms might be redundant 
* room_id is the name of the room (they all begin '@')
* user_id = <roomId>:<username>
* rooms and room<room_id> are sets because their members must
  be unique

=========================================================== */

exports.addUserData = function( userId, username, roomId, callback ) {
  redisClient.hmset( keyify( 'user', userId ), 
    'username', username, 
    'joined_on', new Date().getTime(),
    'left_on', 'false',
    'active', 'true',
    'room_id', roomId,
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.addUserToRoom = function( userId, roomId, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.sadd( keyify( 'room', roomId ), userId,
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    },
    function( cb ) {
      redisClient.zincrby( 'trending', 1, roomId,
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    }
  ], function( err, results ) {
    if( !err ) {
      callback();
    }
  });
};

exports.addUser = function( userId, callback ) {
  redisClient.sadd( 'users', userId,
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.activateUser = function( userId, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.hmset( keyify( 'user', userId ),
        'active', 'true',
        'left_on', 'false',
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    },
    function( cb ) {
      redisClient.hget( keyify( 'user', userId ), 'room_id',
        function( err, res ) {
          if( err ) throw err;
          var roomId = res;
          redisClient.zincrby( 'trending', 1, roomId, 
            function( err, res ) {
              if( err ) throw err;
              cb( null, true );
            });
        });
    }
  ], function( err, results ) {
    if( !err )
      callback(); 
  });
};

exports.deactivateUser = function( userId, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.hmset( keyify( 'user', userId ), 
        'active', 'false',
        'left_on', new Date().getTime(),
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    }, 
    function( cb ) {
      redisClient.hget( keyify( 'user', userId ), 'room_id',
        function( err, res ) {
          if( err ) throw err;
          var roomId = res;
          redisClient.zincrby( 'trending', -1, roomId, 
            function( err, res ) {
              if( err ) throw err;
              cb( null, true );
            });
        });
    }
  ], function( err, results ) {
    if( !err ) 
      callback();
  });
  
};

exports.getUserData = function( userId, callback ) {
  redisClient.hmget( keyify( 'user', userId ), 
    'active', 'username', 'joined_on', 'left_on', 'room_id',
    function( err, res ) {
      if( err ) throw err;

      var user = {
        active: res[0] == 'true' ? true : false,
        username: res[1],
        joined: parseInt( res[2] ),
        left: parseInt( res[3] ),
        room_id: res[4]
      };

      callback( user );

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
          result.sort( compare );
          callback( result );
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

exports.isExistingUser = function( userId, callback ) {
  redisClient.sismember( 'users', userId,
    function( err, res ) {
      if( err ) throw err;
      if( res == 0 ) { // is not member
        callback( false );
      } else {
        callback( true );
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
  async.parallel([
    function( cb ) {
      redisClient.sadd( 'rooms', roomId,
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    }, 
    function( cb ) {
      redisClient.zadd( 'trending', 0, roomId,
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );  
        });
    }
  ], function( err, results ) {
    if( !err ) {
      callback( true );
    }
  });
};

exports.getTrendingRooms = function( num, callback ) {
  redisClient.zrevrangebyscore( 'trending', '+inf', 0, 'limit', 0, num,
    function( err, res ) {
      if( err ) throw err;
      callback( res );
    });
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
  if( JSON.stringify( a.joined ) < JSON.stringify( b.joined ) )
    return -1;
  if( JSON.stringify( a.joined ) > JSON.stringify( b.joined ) )
    return 1;
  return 0;
}
