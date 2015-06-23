function isValidInput( name ) { // username + roomname
  if( name.length > 1 && name.length <= 18 ) {
    return /^[0-9a-zA-Z_.-]+$/.test( name ); 
  } else {
    return false;
  }
};

/* args: callback, input, url, feedback */
function startInput( callback, input, url, feedback ) {

  var typingTimer;                
  var doneTypingInterval = 750;  
  var inputIsValid = false;
  var validInput = '';

  //on keyup, start the countdown
  input.keyup( function( e ){
    clearTimeout( typingTimer );

    if( e.keyCode == 13 || e.which == 13 ) {
      if( inputIsValid ) {
        callback( validInput );
      }
    }

    if( $( this ).val && $( this ).val().length > 2 ) {
      desiredInput= $( this ).val();
      typingTimer = setTimeout( function() {
        if( isValidInput( desiredInput ) ) {
          $.get( url+desiredInput, function( valid ) {
            if( valid ) {
              inputIsValid = true;
              feedback( 'valid' );
              validInput = desiredInput;
            } else {
              inputIsValid = false;
              feedback( 'taken' );
            }
          });
        } else {
          inputIsValid = false;
          feedback( 'invalid' );
        }
      }, doneTypingInterval);
    }
  });
};
