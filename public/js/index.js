/* CREATE ROOM */

var app = angular.module( "present", [] );
var mainController = $( ".main" ).scope();

app.controller('MainController',[ '$scope', '$http', function( $scope, $http ) {

  $http.get( '/trending?number=10' )
    .success( function( data ) {
      var trendingRooms = [];
      for( var i in data ) {
        var room = {
          trending_count: parseInt(i)+1,
          room_id: data[i]
        }
        trendingRooms.push( room );
      }
      $scope.trending_rooms = trendingRooms;
    })
    .error( function( data ) {
      console.log( data );
    });
  
}]);

app.directive( 'trendingroom', function() { 
  return { 
    restrict: 'E', 
    scope: {
      info: '='
    }, 
    template: '{{ info.trending_count }}.<a href="/{{ info.room_id }}"> {{ info.room_id }}</a>'
  }; 
});


$( document ).ready( function() {
  startInput( enter, $( ".create_room_input" ), '/valid/', feedback );
});

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
