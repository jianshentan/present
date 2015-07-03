/* GLOBAL */
var how_is_open = false;
var fake_user_names = [ "denise_li",  "avalencia", "js_tan", "lbentel", "ross_g", "sira_happy", "linus_boy", "crazyjkang", "wilradin", "josands", "hannahchoi", "hkaye", "zsalinger", "eliz", "mattso", "h_li", "kevin_saxon", "tony" ]

/* CREATE ROOM */

var app = angular.module( "present", [] );
var mainController = $( ".main" ).scope();

app.controller('MainController',[ '$scope', '$http', function( $scope, $http ) {

  $http.get( '/trending?number=50' )
    .success( function( data ) {
      if( data.length < 4 ) {
        //$( ".create_room" ).addClass( "full_page" );
      } else {
        $( ".trending" ).show();
        var trendingRooms = [];
        for( var i in data ) {
          var room = {
            trending_count: parseInt(i)+1,
            room_id: data[i]
          }
          trendingRooms.push( room );
        }
        $scope.trending_rooms = trendingRooms;
      }
    })
    .error( function( data ) {
      console.log( data );
    });

  $scope.fake_user_list = [];
  $scope.fake_user_count = 1;
  $scope.addFakeUser = function() {
    var name = fake_user_names[$scope.fake_user_count];
    var num = $scope.fake_user_count;
    $scope.fake_user_list.push( { username: name, count: num } );
    $scope.fake_user_count += 1;
    $scope.$apply();
  }
  
}]);

app.directive( 'fakeuser', function() {
  return {
    restrict: 'E',
    scope: {
      info: '=',
    },
    template: "<div class='how_browser_item'><div class='how_browser_circle'>{{ info.count }}</div>{{ info.username }}</div>"
  }
});

app.directive( 'trendingroom', function() { 
  return { 
    restrict: 'E', 
    scope: {
      info: '='
    }, 
    template: '<div class="num">{{ info.trending_count }}.</div><a href="/{{ info.room_id }}"> {{ info.room_id }}</a>'
  }; 
});


$( document ).ready( function() {
  startInput( enter, $( ".create_room_input" ), '/valid/', feedback, $( ".create_room_next_icon.success" ), $( ".create_room_next_icon.fail" ) );
});

var fakeUserCount = 13;
if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
  fakeUserCount = 4;
}

function how() {
  $( ".how_container" ).slideToggle( function() {
    how_is_open = (how_is_open == true) ? false : true;
    if( how_is_open ) {
      var count = 0;
      var interval = setInterval( function() {
        if( count >= fakeUserCount ) {
          stopInterval();
        }
        $( "body" ).scope().addFakeUser(); 
        count++;
      }, 2000 );

      function stopInterval() {
        console.log();
        clearInterval( interval );
      }
    }
  });
}

function enter( input ) {
  window.location.href = "/add/" + input;
};

function feedback( option ) {
  $( ".create_room_next_icon" ).fadeOut( '100' );
  $( ".create_room_text > span" ).fadeOut( '100', function() {
    setTimeout( function() {
      var input = $( ".create_room_input" );
      input.removeClass( "valid" );
      input.removeClass( "invalid" );
      switch( option ) {
        case 'valid':
          $( ".create_room_text > .valid" ).fadeIn( '100' );
          $( ".create_room_next_icon.success" ).fadeIn( '100' );
          input.addClass( "valid" );
          break;
        case 'invalid':
          $( ".create_room_text > .invalid" ).fadeIn( '100' );
          $( ".create_room_next_icon.fail" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        case 'taken':
          $( ".create_room_text > .taken" ).fadeIn( '100' );
          $( ".create_room_next_icon.fail" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        case 'too_long':
          $( ".create_room_text > .too_long" ).fadeIn( '100' );
          $( ".create_room_next_icon.fail" ).fadeIn( '100' );
          input.addClass( "invalid" );
          break;
        default:
          $( ".create_room_text > .default" ).fadeIn( '100' );
          break;
      }
    }, 500 );
  });
};
