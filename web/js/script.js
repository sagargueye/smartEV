var map;

function initialize() {
    map = L.map('map').setView([48.833, 2.333], 7); // LIGNE 14

    var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { // LIGNE 16
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });

    map.addLayer(osmLayer);
}



var getJSON = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status === 200) {
        callback(null, xhr.response);
      } else {
        callback(status, xhr.response);
      }
    };
    xhr.send();
};


getJSON('https://api.openchargemap.io/v3/poi/?output=json&countrycode=FR&maxresults=100',
function(err, data) {
  if (err !== null) {
    alert('Something went wrong: ' + err);
  } else {
    data.forEach(function(element) {
        var AddressLine1 = (element['AddressInfo']['AddressLine1'])?element['AddressInfo']['AddressLine1']:"";
        var Town = (element['AddressInfo']['Town'])?element['AddressInfo']['Town']:"";
        var ContactTelephone1 = (element['AddressInfo']['ContactTelephone1'])?element['AddressInfo']['ContactTelephone1']:"";
        var customPopup = AddressLine1 + "<br>"
        + Town + "<br>"
        + ContactTelephone1;

        L.marker([element["AddressInfo"]["Latitude"], element["AddressInfo"]["Longitude"]]).bindPopup(customPopup).addTo(map);

    } 
    );

  }
});

