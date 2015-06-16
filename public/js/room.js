/* MAIN */

var app = angular.module( "present", [] );
var mainController = $( ".main" ).scope();

app.controller('MainController',[ '$scope', function($scope) {

  $scope.active_users = 0;
  $scope.total_users = 3292;

  $scope.init = function( username, roomId ) {
    $scope.username = username;
    $scope.room_id = roomId;
    $scope.$apply();

    var totalSeconds = 0;
    setInterval( function() {
      totalSeconds += 1;

      h = Math.floor(totalSeconds / 3600);
      totalSeconds %= 3600;
      m = Math.floor(totalSeconds / 60);
      s = totalSeconds % 60;

      var duration = "";
      if( h == 0 ) {
        duration =  m +  "m " + s + "s"; 
      } else {
        duration = h + "h " + m +  "m " + s + "s"; 
      }

      $( '.user_duration' ).html( duration );
    }, 1000 );
  };

  $scope.users = function( users ) {
    var activeUsers = 0;
    var userList = [];
    users.forEach( function( item, i ) {
      item.user_count = i+1;
      userList.push( item );
      if( item.active ) {
        activeUsers += 1;
      }
      if( item.username == username ) {
        $scope.user_count = i+1;
      }
    });

    $scope.user_list = userList;
    $scope.active_users = activeUsers;
    $scope.total_users = users.length;
    $scope.$apply();
  };

}]);

app.directive( 'user', function() { 
  return { 
    restrict: 'E', 
    scope: {
      info: '='
    }, 
    templateUrl: '/templates/user.html',
    controller: function( $scope ) {
      $scope.getUserCount = function() {
        return 0
      }
    }
  }; 
});

/* ENTER */

var username = "";
window.history.pushState("", "", '/'+roomId);

var typingTimer;                
var doneTypingInterval = 750;  
var inputIsValid = false;

//on keyup, start the countdown
$( '.enter_username' ).keyup( function( e ){
  clearTimeout( typingTimer );

  if( e.keyCode == 13 || e.which == 13 ) {
    if( inputIsValid ) {
      openConnection();
      $( ".enter_modal" ).fadeOut( function() {
        $( ".main" ).fadeIn('fast');
          // start angular controller
          $( "body" ).scope().init( username, roomId );
      });
    }
  }

  if( $( this ).val && $( this ).val().length > 2 ) {
    desiredUsername = $( this ).val();
    typingTimer = setTimeout( function() {
      if( isValidUsername( desiredUsername ) ) {
        $.get( '/'+roomId+'/'+desiredUsername, function( valid ) {
          var feedbackText = $( ".enter_text" );
          if( valid ) {
            inputIsValid = true;
            showText( 'valid' );
            username = desiredUsername;
          } else {
            inputIsValid = false;
            showText( 'taken' );
          }
        });
      } else {
        inputIsValid = false;
        showText( 'invalid' );
      }
    }, doneTypingInterval);
    
  }
});

function isValidUsername( name ) {
  if( name.length > 1 && name.length <= 15 ) {
    return /^[0-9a-zA-Z_.-]+$/.test( name ); 
  } else {
    return false;
  }
};

function showText( option ) {
  $( ".enter_text > span" ).fadeOut( 'fast', function() {
    setTimeout( function() {
      switch( option ) {
        case 'valid':
          $( ".enter_text > .valid" ).fadeIn( 'fast' );
          break;
        case 'invalid':
          $( ".enter_text > .invalid" ).fadeIn( 'fast' );
          break;
        case 'taken':
          $( ".enter_text > .taken" ).fadeIn( 'fast' );
          break;
        default:
          $( ".enter_text > .default" ).fadeIn( 'fast' );
          break;
      }
    }, 500 );
  });
};


/* SOCKET */

var socket = io();

function openConnection() {
  var user = {
    id: roomId+":"+username,
    username: username
  }
  socket.emit( 'join', { user: user, room: roomId } );
} 

socket.on( 'user joined', function( reply ) {
  $( "body" ).scope().users( reply );
  /*
  var usernames = "";
  reply.forEach( function( item, i ) {
    usernames += item.username + "|" + item.active + ", "
  });
  $( ".user_count" ).html( usernames );
  */
});

socket.on( 'user left', function( reply ) {
  $( "body" ).scope().users( reply );
  /*
  var usernames = "";
  reply.forEach( function( item, i ) {
    usernames += item.username + "|" + item.active + ", "
  });
  $( ".user_count" ).html( usernames );
  */
});
