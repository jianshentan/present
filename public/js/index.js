$( ".create_room" ).click( function() {
  var input = $( ".room" ).val();
  window.location.href = "/add/"+input;
});
