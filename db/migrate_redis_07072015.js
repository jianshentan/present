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
  console.log( "migrate: redis db connected" );
});

/* update room keys */
function updateRoomKeys( callback ) {
  redisClient.keys( "room<*>", function( err, res ) {
    if( err ) throw err;

    async.map( res,
      function( key, cb ) {
        var newKey = "room:"+key.slice( 5, -1 )+":users";
        redisClient.rename( key, newKey, 
          function( err, res1 ) {
            if( err ) throw err;
            cb( null, true );
          });
      }, 
      function( err, results ) {
        if( err ) throw err;
        callback();
      });
  });
};

/* update users keys to new format and removes deprecated user attributes */
function updateUserKeys( callback ) {
  redisClient.keys( "user<*>", function( err, res ) {
    if( err ) throw err;

    async.map( res,
      function( key, cb ) {
        var newKey = "user:"+key.slice( 5, -1 );

        async.series([
          function( cb1 ) {
            redisClient.hdel( key, "joined_on", "left_on", function( err, res1 ) {
              if( err ) throw err;
              cb1( null, true );
            });
          }, 
          function( cb1 ){
            redisClient.hset( key, "active", "false", function( err, res1 ) {
              if( err ) throw err;
              cb1( null, true );
            });
          },
          function( cb1 ) {
            redisClient.rename( key, newKey, function( err, res1 ) {
              if( err ) throw err;
              cb1( null, true );
            });
          }
        ], function( err, result ) {
          if( err ) throw err;
          cb();
        });
      },
      function( err, results ) {
        if( err ) throw err;
        callback();
      });
  });
};

async.parallel([
  function( cb ) {
    updateRoomKeys( function() { 
      console.log( "updated room keys" ) 
      cb();
    });
  },
  function( cb ) {
    updateUserKeys( function() { 
      console.log( "updated user keys" ) 
      cb();
    });
  }
], function( err, results ) {
  if( err ) throw err;
  process.exit();
});
