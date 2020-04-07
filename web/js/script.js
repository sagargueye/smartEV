



var map;
mapboxgl.accessToken = "pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
var start_geocoder;
var end_geocoder;
var token_locationiq = "07076b95eec962";
var token_here = "tVIwsP4pVf0zkKgUYV0XKFpI3hdOSJ_yJkTb4Ls_Tec";
var num_click;
var arrayLatLng = [];

var end_latitude;
var end_longitude;
var bool;


function initialize() {
	map = L.map('map').setView([48.833, 2.333], 7); // LIGNE 14

	  var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { // LIGNE 16
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    });

	var markerDepart;
	var markerArrivee;


	map.on('click', onMapClick);	
	num_click = 0;
	var markers = L.markerClusterGroup();


	stations_recharge.forEach(function(element) {
		var AddressLine1 = (element['AddressInfo']['AddressLine1'])?element['AddressInfo']['AddressLine1']:"";
		var Town = (element['AddressInfo']['Town'])?element['AddressInfo']['Town']:"";
		var ContactTelephone1 = (element['AddressInfo']['ContactTelephone1'])?element['AddressInfo']['ContactTelephone1']:"";
		var customPopup = AddressLine1 + "<br>"
		+ Town + "<br>"
		+ ContactTelephone1;
	var marker = L.marker([element["AddressInfo"]["Latitude"], element["AddressInfo"]["Longitude"]]);
	marker.bindPopup(customPopup);
	markers.addLayer(marker);
		

	});
	map.addLayer(osmLayer);
	map.addLayer(markers);
	

	
	start_geocoder = new MapboxGeocoder({  
		accessToken: mapboxgl.accessToken,
		mapboxgl: map, 
		marker: true
	});

	document.getElementById("start_geocoder").appendChild(start_geocoder.onAdd(map));
	
	end_geocoder = new MapboxGeocoder({  
		accessToken: mapboxgl.accessToken,
		mapboxgl: map, 
		marker: true
	});

	document.getElementById("end_geocoder").appendChild(end_geocoder.onAdd(map));

	//permuter les adresse destinataire et d'arriver
	$("#echange").click(function () {
		$start = $("#start_geocoder").val();
		$end = $("#end_geocoder").val();
		$("#end_geocoder").val($start);
		$("#start_geocoder").val($end);
	});


};


function searchItineraire()
{ 
	var lat;
	var lon;

	url1 = 'https://eu1.locationiq.com/v1/search.php?key='+ token_locationiq + '&q=' + document.getElementById('start_geocoder').value + '&format=json';
	url2 = 'https://eu1.locationiq.com/v1/search.php?key='+ token_locationiq + '&q=' + document.getElementById('end_geocoder').value + '&format=json';
	Promise.all([
			fetch(url1).then(function(res) { return res.json(); })
			,fetch(url2).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		start_longitude = data[0][0]["lon"];
		start_latitude = data[0][0]["lat"];
		end_longitude =  data[1][0]["lon"];
		end_latitude = data[1][0]["lat"];
		arrayLatLng.push(data[0][0]["lon"]);
		arrayLatLng.push(data[0][0]["lat"]);
		arrayLatLng.push(data[1][0]["lon"]);
		arrayLatLng.push(data[1][0]["lat"]);
		get_itineraire(arrayLatLng);
	});
};

function get_itineraire(arrayLatLng)
{
	var LatLng = "";
	arrayLatLng.forEach(function(element, index) {		
		if(arrayLatLng.length == index + 1)
				LatLng = LatLng + element;
		else if(index%2 != 0)
		{
			LatLng = LatLng + element + ";";
		}
		else
		{
			LatLng = LatLng + element + ",";
		}
		
	});
	
	console.log("https://api.mapbox.com/directions/v5/mapbox/driving/"+LatLng+"?geometries=geojson&steps=true&access_token=pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ");
	url1 = "https://api.mapbox.com/directions/v5/mapbox/driving/"+LatLng+"?geometries=geojson&steps=true&access_token=pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
	Promise.all([
			fetch(url1).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		var array_coordinates = [];
	
		// Les coordonnées de Latitude/Longitude n'étant pas dans le même ordre dans toutes les API, on les réordonne
		data[0]["routes"][0]["legs"].forEach(function(element) {
			element["steps"].forEach(function(steps) {
				steps["geometry"]["coordinates"].forEach(function(coordinates) {
					array_coordinates.push([coordinates[1], coordinates[0]]);
				});
			});
		});
		
		var autonomie_voiture = 400000;	
		var boolCheckItineraire = true;
		data[0]["routes"][0]["legs"].forEach(function(element) {
			if(autonomie_voiture < element["distance"])
			{
				search_new_itineraire(element);
				boolCheckItineraire = false;
			}
		});
		console.log(data[0]["routes"][0]["distance"]);
		console.log(data[0]["routes"][0]["duration"]);
		if(boolCheckItineraire == true)
		{
			draw_itineraire(array_coordinates);
			displayItineraire(data);
		}
	});
}

function draw_itineraire(array_coordinates)
{
	var polyline = L.polyline(array_coordinates, {color: 'red'}).addTo(map);
	map.fitBounds(polyline.getBounds());
}




// Explication rapide de l'algorithme 
// Je récupère toutes les coordonnées à partir du moment où la voiture passe en dessous des 50% de km d'autonomie (jusqu'à 20%, histoire de laisser une marge de réserve)
// Pour chaque coordonnées récupérées (des centaines), je récupère la station de recharge la plus proche. Cela m'oblige à parcourir la liste de toutes les stations de recharge
// Chaque position de notre itinéraire (entre 50% et 20% de batterie) est donc associée à une station
// Il ne reste plus qu'à récupérer la station où là distance est la plus faible entre notre itinéraire et la station

// Cet algorithme est loin d'être parfait et présente de nombreux défauts :
// - La distance est calculée à vol d'oiseau : en pratique, la distance est plus longue
// - Je parcours la liste de toutes les stations pour chaque coordonnée : c'est long. En pratique, il faudrait faire appel à l'API d'OpenChargeMap et utiliser des paramètres pour restreindre la zone et récupérer seulement quelques stations.
// Cela permettrait de gagner en temps d'exécution. En l'occurrence, pour éviter de surcharger l'API d'OpenChargeMap, je me suis contenté de cette méthode.

function search_new_itineraire(leg)
{
	console.log("new itineraire");
	arrayLatLng.splice(arrayLatLng.length -2, 2);
	var autonomie_voiture = 400000;
	var distance = 0;
	var pos = [];
	var boolGetStep = false;
	leg["steps"].some(function(element, index) {
		if(!boolGetStep)
		{
			if((distance + element["distance"]) < 0.5*autonomie_voiture)
			{
				distance = distance + element["distance"];
			}
			else
			{	
				var distanceStep = element["distance"];
				var nbPositionInStep = Math.trunc(element["geometry"]["coordinates"].length);
				var distancePositionInStep = Math.trunc(distanceStep/nbPositionInStep);
				var index = 0;
				while(distance + distancePositionInStep < distanceStep && distance + distancePositionInStep < 0.8*autonomie_voiture)
				{
					if(distance > 0.5*autonomie_voiture && element["geometry"]["coordinates"][index] != undefined)
						pos.push(element["geometry"]["coordinates"][index]);
					index++;
					distance = distance + distancePositionInStep;	
				}
				
				if(distance + distancePositionInStep > 0.8*autonomie_voiture)
					return true;
				boolGetStep = true;

			}
		}
		else
		{
			if(distance + element["distance"] < 0.8*autonomie_voiture)
			{
				element["geometry"]["coordinates"].forEach(function(element) {
					if(element != undefined)
						pos.push(element);		
				});
				distance = distance + element["distance"];

			}
			else
			{
				var distanceStep = element["distance"];
				var nbPositionInStep = Math.trunc(element["geometry"]["coordinates"].length);
				var distancePositionInStep = Math.trunc(distanceStep/nbPositionInStep);
				var index = 0;
				while(distance + distancePositionInStep < 0.8*autonomie_voiture)
				{
					if(element["geometry"]["coordinates"][index] != undefined)
						pos.push(element["geometry"]["coordinates"][index]);
					index++;
					distance = distance + distancePositionInStep;	
				}

				return true;
			}
		}
	});



	var posAllNearestStation = [];
	pos.forEach(function(element) {

		posAllNearestStation.push(searchNearestStation(element));
	});
	
	var minDistance = 100;
	var index = 0;
	var indexMin = 0;
	while(index < pos.length)
	{
		var tempDistance = getDistance(posAllNearestStation[index][0], posAllNearestStation[index][1], pos[index][0], pos[index][1]);
		if(tempDistance < minDistance)
		{
			minDistance = tempDistance;
			indexMin = index;
		}
		index++;
	}
	
	arrayLatLng.push(posAllNearestStation[indexMin][0]);
	arrayLatLng.push(posAllNearestStation[indexMin][1]);
	arrayLatLng.push(end_longitude);
	arrayLatLng.push(end_latitude);
	get_itineraire(arrayLatLng);
	//get_itineraire(positionNearestStation[0], positionNearestStation[1], end_longitude, end_latitude);
}

function getDistance(lat1,lon1,lat2,lon2) {
	var R = 6371; // km (change this constant to get miles)
	var dLat = (lat2-lat1) * Math.PI / 180;
	var dLon = (lon2-lon1) * Math.PI / 180;
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
		Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) *
		Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c;
	return Math.round(d);
}


function searchNearestStation(position)
{
	var min = 100;
	var nearestStation;
	stations_recharge.forEach(function(element) {
		var d = getDistance(position[0], position[1], element["AddressInfo"]["Longitude"], element["AddressInfo"]["Latitude"]);
		if(d < min)
		{
			min = d;
			nearestStation = element;
		}
	});
	var pos = [nearestStation["AddressInfo"]["Longitude"],nearestStation["AddressInfo"]["Latitude"]];
	return pos;

}

function onMapClick(e) {
	var url_reverse_geocoding = "https://eu1.locationiq.com/v1/reverse.php?key=" + token_locationiq + "&lat=" + e.latlng["lat"] + "&lon=" + e.latlng["lng"] + "&format=json";

	Promise.all([
			fetch(url_reverse_geocoding).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		if(num_click > 1)
			num_click = 0
		var objetAddress = data[0]["address"];
		var numRoad = objetAddress["house_number"]?objetAddress["house_number"]:"";
		var nameRoad = objetAddress["road"]?objetAddress["road"]:"";
		var nameCity = objetAddress["county"]?objetAddress["county"]:"";
		var postCode = objetAddress["postcode"]?objetAddress["postcode"]:"";
		var adresse = "";
		if(numRoad != "")
			adresse = numRoad;
		if(nameRoad != "")
			adresse = adresse + " " + nameRoad;
		if(nameCity != "")
			adresse = adresse + " " + nameCity;
		if(postCode != "")
			adresse = adresse + " " + postCode;
			
		if(adresse == "")
			adresse = data[0]["display_name"];
		
		if(num_click == 0)
		{
			document.getElementById("start_geocoder").value = adresse;
		}
		if(num_click == 1)
		{
			document.getElementById("end_geocoder").value = adresse;
			
		}
		num_click++;

		
	});
}



function displayItineraire(itineraire)
{

	console.log(itineraire);
	var blocItineraire = document.getElementById("itinbloc");
	itineraire[0]["routes"][0]["legs"].forEach(function(legs) {
		
		legs["steps"].forEach(function(steps) {
			steps["maneuver"]["instruction"];
			$('#itinbloc').append('<div class="directions-mode-separator"><div class="directions-mode-line"></div><div class="directions-mode-distance-time">' + Math.trunc(steps["distance"]) + '&nbsp;m</div></div>' +
			'<div class="itin_list"><i class="fa fa-directions"></i>' + steps["maneuver"]["instruction"] + '</div>');

			
			
		});
		
		
		/*
		var autonomieRestanteKm = autonomie_voiture - legs["distance"];
		//var autonomieRestantePer100  = Math.trunc(autonomieRestanteKm * 100)/autonomie_voiture));
		//var chargementNecessaire = 100 - autonomieRestantePer100;
		var tempsRechargement;
		*/

		$('#itinbloc').append('ICI ON INDIQUE LE TEMPS DE RECHARGEMENT !');
		
		
		
		
	});
	
		
	$(".first_div .fa-map-marker-alt").html($("#end_geocoder").val());
	$(".first_div .fa-circle").html($("#start_geocoder").val());

	
}


