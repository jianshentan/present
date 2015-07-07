var async = require( 'async' );
var redis = require( 'redis' );

/* init redis */
if(process.env.REDIS_URL) {
  // HEROKU
  var url = require('url');

  var redisURL = url.parse(process.env.REDIS_URL);
  var redisClient = redis.createClient(redisURL.port, redisURL.hostname);
  redisClient.auth(redisURL.auth.split(":")[1]);
} else {
  // LOCAL
  var redisClient = require("redis").createClient(); //can specify ( post, host )
}

redisClient.on( 'connect', function() {
  console.log( "redis db connected" );
});

/* ===========================================================

REDIS client structure

key                    | type      | members    | represents:
--------------------------------------------------------------
'rooms'                | SET       | <room_id>  | all room
'room:<room_id>'       | HASH      | room data  | room data
'room:<room_id>:users' | SET       | <user_id>  | all users in room
'users'                | SET       | <user_id>  | all users 
'user:<user_id>'       | HASH      | user data  | user data
'user:<user_id>:entry' | LIST      | <dates>    | list of enter-datetimes 
'user:<user_id>:exit'  | LIST      | <dates>    | list of exit-datetimes 
'trending'             | SORTEDSET | <room_id>  | sorted by most active users 
'active'               | SORTEDSET | <user_id>  | all active users sorted by date

* TODO: trending & rooms might be redundant 
* room_id is the name of the room (they all begin '@')
* user_id = <roomId>:<username>
* users, rooms, room:<room_id>:users are sets because their members must
  be unique

=========================================================== */

exports.addUserData = function( clientIp, userId, username, roomId, callback ) {
  redisClient.hmset( 'user:'+userId,
    'username', username.toLowerCase(), 
    'ip', clientIp,
    'active', 'true',
    'joined', new Date().getTime(),
    'room_id', roomId,
    function( err, res ) {
      if( err ) throw err;
      callback();
    });
};

exports.addUserToRoom = function( userId, roomId, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.sadd( 'room:'+roomId+':users', userId,
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

exports.logUserEnter = function( userId, callback ) {
  redisClient.lpush( 'users:'+userId+':enter', new Date().getTime(),
    function( err, res ) {
      if( err ) throw err;
      callback();
    });

  redisClient.zadd( 'active', new Date().getTime(), userId,
    function( err, res ) {
      if( err ) throw err;
    });
};

exports.logUserExit = function( userId, callback ) {
  redisClient.lpush( 'users:'+userId+':exit', new Date().getTime(),
    function( err, res ) {
      if( err ) throw err;
      callback();
    });

  redisClient.zrem( 'active', userId,
    function( err, res ) {
      if( err ) throw err;
    });
};

exports.addRoom = function( roomId, roomIp, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.sadd( 'rooms', roomId,
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    }, 
    function( cb ) {
      redisClient.hmset( 'room:'+roomId, 
        'date', new Date().getTime(),
        'ip', roomIp,
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

exports.activateUser = function( userId, callback ) {
  async.parallel([
    function( cb ) {
      redisClient.hmset( 'user:'+userId,
        'active', 'true',
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    },
    function( cb ) {
      redisClient.hget( 'user:'+userId, 'room_id',
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
      redisClient.hmset( 'user:'+userId, 
        'active', 'false',
        function( err, res ) {
          if( err ) throw err;
          cb( null, true );
        });
    }, 
    function( cb ) {
      redisClient.hget( 'user:'+userId, 'room_id',
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
  redisClient.hmget( 'user:'+userId,
    'active', 'username', 'room_id',
    function( err, res ) {
      if( err ) throw err;

      var user = {
        active: res[0] == 'true' ? true : false,
        username: res[1],
        room_id: res[4]
      };

      callback( user );

    });
};

exports.getUsersInRoom = function( roomId, callback ) {
  var thisRedis = this;
  redisClient.smembers( 'room:'+roomId+':users',
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
  var userId = roomId + ":" + username.toLowerCase();
  redisClient.sismember( 'room:'+roomId+':users', userId,
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
  redisClient.sismember( 'rooms', roomId.toLowerCase(),
    function( err, res ) {
      if( err ) throw err;
      if( res == 0 ) { // is not member
        callback( false );
      } else { // is member
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

exports.searchRooms = function( query, callback ) {
  redisClient.smembers( 'rooms' ,
    function( err, res ) {
      if( err ) throw err;
      var validRooms = [];
      for( var index in res ) {
        var room = res[index];
        if( room.indexOf( query ) != -1 ){ // contains query
          validRooms.push( room ); 
        }
      }
      callback( validRooms );
    });
};

/* returns total minutes spent in a room collectively
   TODO: untested */
exports.totalMinutes = function( room, callback ) {
  redisClient.smembers( 'room:'+room+':users',
    function( err, res ) {
      if( err ) throw err;
      console.log( res );

      async.map( res,
        function( userId, cb ) {
          redisClient.hmget( 'user:'+userId, 
            'active', 
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

function compare( a, b ) {
  if( JSON.stringify( a.joined ) < JSON.stringify( b.joined ) )
    return -1;
  if( JSON.stringify( a.joined ) > JSON.stringify( b.joined ) )
    return 1;
  return 0;
}

