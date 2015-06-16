var redis = require( "../db/redis" );

module.exports = function( app ) {

  app.get( '/', function( req, res ) {
    res.render( 'index' );
  });

  app.get( '/:room', function( req, res ) {
    var roomId = req.params.room;
    redis.isExistingRoom( roomId, 
      function( bool ) {
        if( bool ) {
          res.render( 'room', { room: roomId } );
        } else {
          res.render( 'index', { room: roomId } );
        }
      });
  });

  app.get( '/add/:room', function( req, res ) {
    var roomId = req.params.room;
    redis.isExistingRoom( roomId, 
      function( bool ) {
        if( bool ) {
          res.render( 'index', { room: 'invalid room'} );
        } else {
          redis.addRoom( roomId, function() {
            res.render( 'room', { room: roomId } );
          });
        }
      });
  });

  app.get( '/:room/:username', function( req, res ) {
    redis.isValidUsername( req.params.username, req.params.room, 
      function( bool ) {
        res.send( bool );
      });
  });

  /* not using this feature
  app.get( '/time/:room', function( req, res ) {
    // TODO not being called :(
    console.log( 'GETTING TIME' );
    redis.totalMinutes( req.params.room,
      function( data ) {
        res.send( data );
      });
  });
  */

};
