var async = require( 'async' );
var redisClient = require( '../db/redis' );

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
          redisClient.addUserData( userId, data.user.username, roomId, function() {
            callback( null, true );
          });
        },
        function( callback ) {
          redisClient.addUserToRoom( userId, roomId, function() {
            callback( null, true );
          });
        },
        function( callback ) {
          redisClient.addUser( userId, function() {
            callback( null, true );
          });
        },

      ], function( err, results ) {
        if( !err )
          redisClient.getUsersInRoom( roomId, function( users ) {
            io.to( roomId ).emit( 'user joined', users );
          });
      });

      redisClient.totalMinutes( roomId, function( time ) {
        io.to( roomId ).emit( 'time', time );
      });

    });

    socket.on( 'disconnect', function( socket ) {
      console.log( "user '" + userId + "' left room: " + roomId ) ;

      async.parallel([
        function( callback ) {
          redisClient.deactivateUser( userId, function() {
            callback( null, true );
          });
        }
      ], function( err, results ) {
        if( !err )
          redisClient.getUsersInRoom( roomId, function( users ) {
            io.to( roomId ).emit( 'user left', users );
          });
      });
    });
  });
};

