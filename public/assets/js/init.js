(function($){
  var socket = io.connect();
  $(document).on('click', "#join", function(e) {
    e.preventDefault();
  });
  	// game
  	$(document).on('click', "#draw", function(e) {
      // e.preventDefault();
      //$("#game-data").append(data);
      move('#card-pack')
      .rotate(-360)
      .duration('.5s')
      .end(function() {
        $("#card-pack").attr("style","");
      });
    $('.button-collapse').sideNav();
    $('.parallax').parallax();
})(jQuery); // end of jQuery name space