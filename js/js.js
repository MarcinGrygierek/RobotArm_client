$(function() {
    var socket = io();

    function log(log) {
        var date = new Date();
        $('#log').append("<span><strong>" + date.toLocaleTimeString() + ":</strong> " + log + "</span>");
    }

    socket.on('color', function(color) {
        $('#readings-color').css('background', 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')');
        $('#color-r').html(color.r);
        $('#color-g').html(color.g);
        $('#color-b').html(color.b);
    });

    socket.on('angles', function(data) {
        $('#angle-base').html(data.angles[0]);
        $('#angle-shoulder').html(data.angles[2]);
        $('#angle-elbow').html(data.angles[3]);
        $('#angle-wrist').html(data.angles[4]);
        $('#angle-gripper-rotation').html(data.angles[5]);
        $('#angle-gripper').html(data.angles[6]);
    });

    socket.on('message', function(data) {
        log(data.message);
    });

    socket.on('portClosed', function(data) {
        log('Port closed');
    });

    socket.on('portError', function(data) {
        log(data.error);
    });


    $.get("/status", function(response) {
        if (response === 'connected') {
            var date = new Date();
            $('#connection-status').removeClass('label-danger').addClass('label-success').html(response);
            log('Connected to serial port')
        } else $('#connection-status').removeClass('label-success').addClass('label-danger').html(response);
    })

    function start() {
        console.log('starting');
        socket.emit('start', {});
    }

    $('#button-start').click(function() {
        log('Trying to start robot');
        start();
    })

    var workMethod = $('input[name=working-method]:checked').val();


    function checkWorkMethod() {
        console.log(workMethod);
        switch (workMethod) {
            case 'GIVEN_POSITION':
                $('#sorting-color-positions').hide();
                $('#sorting-color-containers').hide();
                $('#direct-angles').hide();
                $('#button-add-object').show();
                $('#sorting-non-color').show();
                break;
            case 'COLOR_BASED':
                $('#sorting-non-color').hide();
                $('#direct-angles').hide();
                $('#button-add-object').show();
                $('#sorting-color-positions').show();
                $('#sorting-color-containers').show();
                break;
            case 'DIRECT_ANGLE':
                $('#sorting-color-positions').hide();
                $('#sorting-color-containers').hide();
                $('#sorting-non-color').hide();
                $('#button-add-object').hide();
                $('#direct-angles').show();
                break;
        }
    }

    checkWorkMethod();

    $('input[name=working-method').change(function() {
        workMethod = $('input[name=working-method]:checked').val();
        checkWorkMethod()
    });

    $("#button-reset").click(function() {
        socket.emit('reset', {});
        log('Clearing configuration');
    });

    $('#button-clear-logs').click(function() {
        $('#log').html('');
    });

    $("#button-save").click(function() {
        var objects = [];
        var record = [];

        socket.emit('saveWorkingMethodInfo', workMethod);

        switch (workMethod) {
            case "COLOR_BASED":
                break;
            case "GIVEN_POSITION":
                $('#positions-non-color tbody tr').each(function() {
                    record = []
                    $(this).find(".position-val").each(function() {
                        record.push($(this).val())
                    })
                    objects.push(record);
                });
                socket.emit('saveObjects', objects);
                break;
            case "DIRECT_ANGLE":
                break;
        }
        log('Saving configuration to device');
    });

    $('#button-update-angles').click(function() {
      var angles = [];
      $('#angles tbody tr').each(function() {
          $(this).find(".joint-angle").each(function() {
              angles.push($(this).val())
          })
      });
      socket.emit('saveAngles', angles);
    });

    $('#button-add-object').click(function() {
        if (workMethod === "COLOR_BASED") {
            $('#positions-color tbody').append('<tr><td><input class="position-val form-control"></td><td><input class="position-val form-control"></td><td>' +
                '<input class="position-val form-control"></td><td><button class="btn btn-danger remove-row glyphicon glyphicon-minus"></button></td></tr>');

        } else if (workMethod === "GIVEN_POSITION") {
            $('#positions-non-color tbody').append('<tr><td><input class="position-val form-control"></td><td><input class="position-val form-control"></td><td><input class="position-val form-control"></td>' +
                '<td><input class="position-val form-control"></td><td><input class="position-val form-control"></td><td><input class="position-val form-control"></td><td><button class="btn btn-danger remove-row glyphicon glyphicon-minus"></button></td></tr>');
        }
    });

    $(document).on('click', '.remove-row', function() {
        $(this).parent().parent().remove();
    });
});
