var redis = require( "../db/redis" );

module.exports = function( app ) {

  app.get( '/', function( req, res ) {
    res.render( 'index', { color: randomColor() } );
  });

  app.get( '/about', function( req, res ) {
    res.render( 'about', { color: randomColor() } );
  });

  app.get( '/search/:query', function( req, res ) {
    var query = req.params.query;
    redis.searchRooms( query, function( rooms ) {
      res.send( rooms );
    });
  });

  app.get( '/trending', function( req, res ) {
    if( !isEmpty( req.query ) ) {
      redis.getTrendingRooms( req.query.number, function( data ) {
        res.send( data );
      });
    } else {
      var roomId = "@trending";
      redis.isExistingRoom( roomId, 
        function( bool ) {
          if( bool ) {
            res.render( 'room', { room: roomId, color: randomColor() } );
          } else {
            res.render( 'invalid_room', { room: roomId, color: randomColor() } );
          }
        });
    }
  });

  app.get( '/:room', function( req, res ) {
    var roomId = req.params.room[0] == "@" ? req.params.room : "@" + req.params.room;
    redis.isExistingRoom( roomId, 
      function( bool ) {
        if( bool ) {
          res.render( 'room', { room: roomId, color: randomColor() } );
        } else {
          res.render( 'invalid_room', { room: roomId, color: randomColor() } );
        }
      });
  });

  app.get( '/valid/:room', function( req, res ) {
    var roomId = req.params.room[0] == "@" ? req.params.room : "@" + req.params.room;
    redis.isExistingRoom( roomId.toLowerCase(),
      function( bool ) {
        res.send( !bool );
      });
  });

  app.get( '/add/:room', function( req, res ) {
    var roomId = req.params.room[0] == "@" ? req.params.room : "@" + req.params.room;
    redis.isExistingRoom( roomId, 
      function( bool ) {
        if( bool ) {
          res.render( 'index', { room: 'invalid room', color: randomColor()  } );
        } else {
          redis.addRoom( roomId, function() {
            res.render( 'room', { room: roomId, color: randomColor() } );
          });
        }
      });
  });

  app.get( '/:room/:username', function( req, res ) {
    redis.isValidUsername( req.params.username.toLowerCase(), req.params.room.toLowerCase(), 
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

function randomColor() {
  var colors = ["#0068FF", "#05CA50", "#FAD100", "#F53D54", "#FF7CAB", "#F28713", "#9640FF", "#9CD100" ];
  var random = Math.floor( Math.random() * (colors.length - 0)) + 0; 
  return colors[random];
}

function isEmpty(obj) {
  for(var prop in obj) {
    if(obj.hasOwnProperty(prop))
      return false;
  }
  return true;
}
