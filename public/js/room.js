/* GLOBAL */

var PERSISTENT_USER = true;
var username = "";
var roomId = roomId; // roomId is declared in the html
window.history.pushState("", "", '/'+roomId);

/* MAIN */

var app = angular.module( "present", [] );
var mainController = $( ".main" ).scope();

app.controller('MainController',[ '$scope', function($scope) {

  $scope.active_users = 0;
  $scope.total_users = 0;

  // check if user is already logged in on current browser
  if( PERSISTENT_USER ) {
    if( !localStorage.getItem( 'room' ) ) {
      startInput( enter, $( ".enter_username" ), '/'+roomId+'/', feedback );
    } else {
      var obj = JSON.parse( localStorage.getItem( 'room' ) );
      if( obj.room_id !== roomId ) {
        startInput( enter, $( ".enter_username" ), '/'+roomId+'/', feedback );
      } else {
        enter( obj.username );
      }
    }
  } else {
    startInput( enter, $( ".enter_username" ), '/'+roomId+'/', feedback );
  }

  $scope.init = function( username ) {
    if( PERSISTENT_USER ) {
      var localStorageObj = {
        room_id: roomId,
        username: username
      }
      localStorage.setItem( 'room', JSON.stringify( localStorageObj ) );
    }

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

    setUsersContainerWidth(); // user tiles css hack
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

app.filter('reverse', function() {
  return function( items ) {
    if( items ) return items.slice().reverse();
  };
});

// fix users display alignment
$( document ).ready( function(){
  setUsersContainerWidth();
});

$( window ).resize( function(){
  setUsersContainerWidth();
});

function setUsersContainerWidth(){
  $( '.users_container' ).css( 'width', 'auto' );
  var windowWidth = $( document ).width();
  var blockWidth = $( '.user' ).outerWidth( true );
  var maxBoxPerRow = Math.floor( windowWidth / blockWidth );
  $( '.users_container' ).width( maxBoxPerRow * blockWidth );
};

function enter( input ) {
  username = input;
  openConnection();
  $( ".enter_modal" ).fadeOut( function() {
    $( ".main" ).fadeIn('fast');
      // start angular controller
      $( "body" ).scope().init( username );
  });
};

function feedback( option ) {
  $( ".enter_text > span" ).fadeOut( '100', function() {
    setTimeout( function() {
      var input = $( ".enter_username" );
      input.removeClass( "valid" );
      input.removeClass( "invalid" );
      switch( option ) {
        case 'valid':
          $( ".enter_text > .valid" ).fadeIn( '100' );
          input.addClass( "valid" );
          break;
        case 'invalid':
          $( ".enter_text > .invalid" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        case 'taken':
          $( ".enter_text > .taken" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        default:
          $( ".enter_text > .default" ).fadeIn( '100' );
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
  $( "body" ).scope().users( reply.userlist );
});

socket.on( 'user left', function( reply ) {
  $( "body" ).scope().users( reply.userlist );
  if( PERSISTENT_USER ) {
    console.log( reply.user.username );
    console.log( typeof reply.user.username );
    console.log( username );
    console.log( typeof username );
    if( reply.user.username === username ) {
      $( '.exit_background' ).fadeIn();
      $( '.exit_button' ).click( function() {
        window.location.href = "/";
      });
    }
  }
});
