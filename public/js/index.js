
/* MAIN */

var app = angular.module( "present", [] );
var mainController = $( ".main" ).scope();

app.controller('MainController',[ '$scope', function($scope) {

  $scope.active_users = 0;
  $scope.total_users = 0;

  $scope.init = function( username ) {
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



/* CREATE ROOM */

startInput( enter, $( ".create_room_input" ), '/check/', feedback );

function enter( input ) {
  window.location.href = "/add/" + input;
};

function feedback( option ) {
  $( ".create_room_text > span" ).fadeOut( '100', function() {
    setTimeout( function() {
      var input = $( ".create_room_input" );
      input.removeClass( "valid" );
      input.removeClass( "invalid" );
      switch( option ) {
        case 'valid':
          $( ".create_room_text > .valid" ).fadeIn( '100' );
          input.addClass( "valid" );
          break;
        case 'invalid':
          $( ".create_room_text > .invalid" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        case 'taken':
          $( ".create_room_text > .taken" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        default:
          $( ".create_room_text > .default" ).fadeIn( '100' );
          break;
      }
    }, 500 );
  });
};
