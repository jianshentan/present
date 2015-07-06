function isValidInput( name ) { // username + roomname
  return /^[0-9a-zA-Z_.-]+$/.test( name ); 
};

/* args: callback, input, url, feedback, click */
function startInput( callback, input, url, feedback, success, failure ) {

  var typingTimer;                
  var doneTypingInterval = 400;  
  var inputIsValid = false;
  var validInput = '';

  // replace 'space' key with 'underscore'
  input.keydown( function( e ) {
    if( e.keyCode == 32 || e.which == 32 ) {
      e.preventDefault();
      $( this ).val( $( this ).val() + '_' );
    }
  });

  //on keyup, start the countdown
  input.keyup( function( e ){
    clearTimeout( typingTimer );

    if( e.keyCode == 13 || e.which == 13 ) {
      if( inputIsValid ) {
        callback( validInput );
      }
    } else {
      inputIsValid = false;
    }

    success.click( function() {
      if( inputIsValid ) {
        callback( validInput );
      }
    });

    failure.click( function() {
      input.val("");       
      feedback();
    });

    if( $( this ).val && $( this ).val().length > 2 ) {
      desiredInput= $( this ).val().toLowerCase();
      typingTimer = setTimeout( function() {
        if( isValidInput( desiredInput ) ) {
          if( desiredInput.length < 50 ) {
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
            feedback( 'too_long' );
          }
        } else {
          inputIsValid = false;
          feedback( 'invalid' );
        }
      }, doneTypingInterval);
    }
  });
};

// Notification plugin
var TabNotification = {
  Vars: {
    OriginalTitle: document.title,
    Interval: null
  },    
  On: function( notification, intervalSpeed ){
    var _this = this;
    _this.Vars.Interval = setInterval( function(){
      document.title = ( _this.Vars.OriginalTitle == document.title )
                       ? notification
                       : _this.Vars.OriginalTitle;
    }, ( intervalSpeed ) ? intervalSpeed : 1000 );
  },
  Off: function() {
    clearInterval( this.Vars.Interval );
    document.title = this.Vars.OriginalTitle;   
  }
}

