var async = require( 'async' );
var redisClient = require( '../db/redis' );

/* ===========================================================

SOCKET Protocol


client --> server
-------------------------------------------------------------
'join':
  {
    room: roomId,
    user: { 
      id: roomId+':'+username,
      username: username
    }
  }
'disconnect': {}


server --> client
-------------------------------------------------------------
'user joined',
'user left':
  { 
    userlist: [
      { active: <bool>, username: <string> ...},
      { active: <bool>, username: <string> ...},
      ...
    ],
    user: { active: <bool>, username: <string> ...}
  }

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

      redisClient.isExistingUser( userId, function( bool ) {
        if( bool ) {
          existingUser( userId, roomId );
        } else {
          addNewUser( userId, roomId, data );
        }
      });

      function existingUser( userId, roomId ) {
        async.parallel([
          function( callback ) {
            redisClient.getUserData( userId, function( user ) {
              callback( null, user );
            });
          },
          function( callback ) {
            redisClient.activateUser( userId, function() {
              callback( null, true );  
            });
          }
        ], function( err, results ) {
          if( err ) throw err;

          var user = results[0];
          if( user ) {
            redisClient.getUsersInRoom( roomId, function( users ) {
              io.to( roomId ).emit( 'joined',
                { userlist: users, user: user } );
            });
          }
          
        });
      };

      function addNewUser( userId, roomId, data ) {
        async.parallel([
          function( callback ) {
            redisClient.addUserData( userId, data.user.username, roomId,
              function() {
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
          if( err ) throw err;

          redisClient.getUserData( userId, function( user ) {
            redisClient.getUsersInRoom( roomId, function( users ) {
              io.to( roomId ).emit( 'user joined',
                { userlist: users, user: user } );
            });
          });
        });
      }

      /*
      redisClient.totalMinutes( roomId, function( time ) {
        io.to( roomId ).emit( 'time', time );
      });
      */

    });

    socket.on( 'disconnect', function( socket ) {
      console.log( "user '" + userId + "' left room: " + roomId ) ;

      async.parallel([
        function( callback ) {
          redisClient.getUserData( userId, function( user ) {
            callback( null, user );
          });
        },
        function( callback ) {
          redisClient.deactivateUser( userId, function() {
            callback( null, true );
          });
        }
      ], function( err, results ) {
        if( err ) throw err;

        var user = results[0];
        if( user ) {
          redisClient.getUsersInRoom( roomId, function( users ) {
            io.to( roomId ).emit( 'user left', 
              { userlist: users, user: user } );
          });
        }
      });
    });
  });
};

