$('#divModalImage').hide();

$(document).ready(function () {
  $('#tblDropFiles').on({
    'dragover dragenter': function (e) {
      e.preventDefault();
      e.stopPropagation();
    },
    'drop': function (e) {
      //console.log(e.originalEvent instanceof DragEvent);
      var dataTransfer = e.originalEvent.dataTransfer;
      if (dataTransfer && dataTransfer.files.length) {
        e.preventDefault();
        e.stopPropagation();
        $.each(dataTransfer.files, function (i, file) {
          var reader = new FileReader();
          reader.onload = $.proxy(function (file, event) {
            //var img = file.type.match('image.*') ? "<img class='imgUploadThumbnail' src='" + event.target.result + "' /> " : "";
            if (file.type.match('image.*')) {
              addUploadTableRow(file, event.target.result);
            }
          }, this, file);
          reader.readAsDataURL(file);
        });
      }
    },
    //'click': function (e) {
    //  alert('clicked me');
    //}
  });
});

function addUploadTableRow(file, imgData) {
  var tr = $('<tr class="trToUpload"></tr>');
  var tdImg = $(
    '<td class="tdToUpload">' +
    ' <img class="imgUploadThumbnail" src="' + imgData + '" />' +
    '</td>');
  tdImg.on('click', {'file':file,'imgData':imgData}, function (event) {
    var inFile = event.data.file;
    var iData = event.data.imgData;

    $('#imgFull').attr('src', imgData);
    $('divModalImage').find('.modal-title').text(file.name);
    $('#divModalImage').modal('show');
    $('#divModalImage').show(300);

    event.preventDefault();
    event.stopPropagation();
  });
  tr.append(tdImg);
  tr.append($('<td class="tdToUpload">' + file.name + '</td>'));
  tr.append($('<td class="tdToUpload tdOriginalSize">' + file.size + '</td>'));
  var tdDimensions = $('<td class="tdToUpload tdDimensions">N/A</td>');
  tr.append(tdDimensions);

  var myImg = new Image();
  myImg.onload = function () {
    tdDimensions.text(myImg.width + ' x ' + myImg.height);
    tr.append($('<td class="tdToUpload tdConvertedSize">N/A</td>'));

    var tdConvertedDimensions = $('<td class="tdToUpload tdConvertedMD5">N/A</td>');
    tr.append(tdConvertedDimensions);

    var aConvertLink = $('<a class="aConvertLink">Convert To Jpg</a>');
    aConvertLink.on('click', { 'me': this, 'file': file, 'image': myImg, 'imgData': imgData }, function (event) {
      var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
      canvas.width = event.data.image.width;
      canvas.height = event.data.image.height;
      ctx.drawImage(event.data.image, 0, 0);

      canvas.toBlob(function (blob) {
        var retFile = new File([blob], file.name.substr(0, file.name.lastIndexOf(".")) + ".jpg",
          { type: "application/octet-stream" });

        aConvertLink.parent().parent().find('.tdConvertedSize').text(retFile.size);

        var aDownloadJpeg = $('<a class="aConvertLink" href="' + URL.createObjectURL(blob) + '">Download Jpg</a>');
        aDownloadJpeg.attr('download', retFile.name);
        tr.append($('<td class="tdToUpload"></td>').append(aDownloadJpeg));

        var aUploadLink = $('<a class="aConvertLink">Send Jpg to server</a>');
        aUploadLink.on('click', { 'me': aUploadLink, 'fileName': retFile.name, 'blob': blob }, uploadData);
        tr.append($('<td class="tdToUpload"></td>').append(aUploadLink));

        calculateMD5Hash(retFile, bufferSize).then(
          function (result) {
            // Success
            console.log(result);
            tdConvertedDimensions.text(result.hashResult);
          },
          function (err) {
            // There was an error,
          },
          function (progress) {
            // We get notified of the progress as it is executed
            console.log(progress.currentPart, 'of', progress.totalParts, 'Total bytes:', progress.currentPart * bufferSize, 'of', progress.totalParts * bufferSize);
            tdConvertedDimensions.text(progress.currentPart + '/' + progress.totalParts);
          });
      }, "image/jpeg", 0.90);
    });
    tr.append($('<td class="tdToUpload"></td>').append(aConvertLink));
  };
  myImg.src = imgData;

  var tdMd5Original = $('<td class="tdToUpload tdOriginalMD5">...</td>');
  var bufferSize = 1024; // 10MB
  calculateMD5Hash(file, bufferSize).then(
    function (result) {
      // Success
      console.log(result);
      tdMd5Original.text(result.hashResult);
    },
    function (err) {
      // There was an error,
    },
    function (progress) {
      // We get notified of the progress as it is executed
      console.log(progress.currentPart, 'of', progress.totalParts, 'Total bytes:', progress.currentPart * bufferSize, 'of', progress.totalParts * bufferSize);
      tdMd5Original.text(progress.currentPart + '/' + progress.totalParts);
    });
  tr.append(tdMd5Original);
  $('#tblToUpload').append(tr);
}

function uploadData(event) {
  var strOriginalMD5 = event.data.me.parent().parent().find('.tdOriginalMD5').text();
  var strConvertedMD5 = event.data.me.parent().parent().find('.tdConvertedMD5').text();
  var strOriginalSize = event.data.me.parent().parent().find('.tdOriginalSize').text();
  var strConvertedSize = event.data.me.parent().parent().find('.tdConvertedSize').text();

  var reader = new FileReader();
  reader.onload = function (e) {
    var sendData = {};

    sendData['fileName'] = event.data.fileName;
    sendData['originalMD5'] = strOriginalMD5;
    sendData['convertedMD5'] = strConvertedMD5;
    sendData['originalSize'] = strOriginalSize;
    sendData['convertedSize'] = strConvertedSize;
    sendData['data'] = e.target.result.split(',').pop();
    $.ajax({
      type: 'POST',
      url: '/upload',
      data: sendData,
      dataType: 'json',
      success: function (data) {
        console.log(data);
      }
    });
  };
  //reader.readAsArrayBuffer(event.data.blob);
  reader.readAsDataURL(event.data.blob);
  //$.post('upload', { 'fileName': event.data.fileName, 'blob': event.data.blob }, function (data, status) {
  //  console.log('data:' + data + ', status: ' + status);
  //});
}

function calculateMD5Hash(file, bufferSize) {
  var def = Q.defer();

  var fileReader = new FileReader();
  var fileSlicer = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
  var hashAlgorithm = new SparkMD5();
  var totalParts = Math.ceil(file.size / bufferSize);
  var currentPart = 0;
  var startTime = new Date().getTime();

  fileReader.onload = function (e) {
    currentPart += 1;

    def.notify({
      currentPart: currentPart,
      totalParts: totalParts
    });

    var buffer = e.target.result;
    hashAlgorithm.appendBinary(buffer);

    if (currentPart < totalParts) {
      processNextPart();
      return;
    }

    def.resolve({
      hashResult: hashAlgorithm.end(),
      duration: new Date().getTime() - startTime
    });
  };

  fileReader.onerror = function (e) {
    def.reject(e);
  };

  function processNextPart() {
    var start = currentPart * bufferSize;
    var end = Math.min(start + bufferSize, file.size);
    fileReader.readAsBinaryString(fileSlicer.call(file, start, end));
  }

  processNextPart();
  return def.promise;
}

function calculate() {

  var input = document.getElementById('file');
  if (!input.files.length) {
    return;
  }

  var file = input.files[0];
  var bufferSize = Math.pow(1024, 2) * 10; // 10MB

  calculateMD5Hash(file, bufferSize).then(
    function (result) {
      // Success
      console.log(result);
    },
    function (err) {
      // There was an error,
    },
    function (progress) {
      // We get notified of the progress as it is executed
      console.log(progress.currentPart, 'of', progress.totalParts, 'Total bytes:', progress.currentPart * bufferSize, 'of', progress.totalParts * bufferSize);
    });
}