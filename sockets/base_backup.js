var async = require( 'async' );
var redis = require( 'redis' );
var redisClient = redis.createClient(); // can specify ( post, host )

redisClient.on( 'connect', function() {
  console.log( "redis db connected" );
});
redisClient.flushall();

/* ===========================================================

REDIS client structure

key              | type    | members   | represents:
--------------------------------------------------------------
'rooms'          | SET     | <room_id> | all room
'room<room_id>'  | SET     | <user_id> | all users in room
'users'          | SET     | <user_id> | all users 
'user<user_id>'  | HASH    | user data | user data

* user_ids = <roomId>:<username>
* rooms and room<room_id> are sets because their members must
  be unique

=========================================================== */

exports.start = function( io ) {
  
  io.on( 'connection', function( socket ) { 
    var userId = null;
    var roomId = null;

    socket.on( 'join', function( data ) {
      userId = data.user.id;
      roomId = data.room;
      console.log( "user '" + userId + "' entered room: " + roomId ) ;
      socket.join( roomId );

      async.parallel([
        function( callback ) {
          redisClient.hmset( keyify( 'user', userId ), 
            'username', data.user.username, 
            'created_on', new Date().getTime(),
            function( err, res ) {
              if( err ) throw err;
              callback( null, true );
            });
        },
        function( callback ) {
          redisClient.sadd( keyify( 'room', roomId ), userId,
            function( err, res ) {
             if( err ) throw err;
              callback( null, true );
            });
        },
        function( callback ) {
          redisClient.sadd( 'users', userId,
            function( err, res ) {
              if( err ) throw err;
              callback( null, true );
            });
        }
      ], function( err, results ) {
        if( !err )
          getUsersInRoom( roomId, function( users ) {
            io.to( roomId ).emit( 'user joined', users );
          });
      });

    });

    socket.on( 'disconnect', function( socket ) {
      console.log( "user '" + userId + "' left room: " + roomId ) ;

      async.parallel([
        function( callback ) {
          redisClient.del( keyify( 'user', userId ),
            function( err, res ) {
              if( err ) throw err;
              callback( null, true );
            });
        },
        function( callback ) {
          redisClient.srem( keyify( 'room', roomId ), userId,
            function( err, res ) {
              if( err ) throw err;
              callback( null, true );
            });
        }
      ], function( err, results ) {
        if( !err )
          getUsersInRoom( roomId, function( users ) {
            io.to( roomId ).emit( 'user left', users );
          });
      });
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

exports.totalMinutes = function( room, callback ) {
  /* TODO: does not work because users leave 
     rooms when they disconnect, so we're not 
     including their data 
   */
  redisClient.smembers( keyify( 'room', room ),
    function( err, res ) {
      if( err ) throw err;
      async.map( res,
        function( userId, cb ) {
          redisClient.hget( keyify( 'user', item ), 'created_on',
            function( err, res1 ) {
              if( err ) throw err;
              var timeSpent = new Date().getTime - res1;
              cb( null, res1 );
            });  
        },
        function( err, results ) {
          if( err ) throw err;

        });
      res.forEach( function( item, i ) {
        
      });
    });
};

function getUsersInRoom( roomId, callback ) {
  redisClient.smembers( keyify( 'room', roomId ),
    function( err, res ) {
      if( err ) throw err;
      async.map( res, 
        function( userId, cb ) {
          redisClient.hmget( keyify( 'user', userId ), 'username',
            function( err, res1 ) {
              if( err ) throw err;
              cb( null, res1 );
            });
        }, 
        function( err, result ) { 
          if( err ) throw err;
          var users = [];
          result.forEach( function( reply, i ) {
            var user = {
              username: reply[0]
            };
            users.push( user );
          });
          callback( users );
        });
    });
};

function removeA( arr ) {
  var what, a = arguments, L = a.length, ax;
  if( arr ) 
    while( L > 1 && arr.length ) {
      what = a[--L];
      while ( ( ax= arr.indexOf(what) ) !== -1 ) {
        arr.splice( ax, 1 );
      }
    }
  return arr;
}

function keyify( type, specifier ) {
  return type + "<" + specifier + ">";
};

