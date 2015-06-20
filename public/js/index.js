/* CREATE ROOM */

$( document ).ready( function() {
  startInput( enter, $( ".create_room_input" ), '/valid/', feedback );
  $.get( '/trending?number=3', function( data ) {
    console.log( data );
  });
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
