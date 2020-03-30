$(document).ready(function () {
	var map;
	mapboxgl.accessToken = "pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
	var start_geocoder;
	var end_geocoder;
	var token_locationiq = "07076b95eec962";
	var token_here = "tVIwsP4pVf0zkKgUYV0XKFpI3hdOSJ_yJkTb4Ls_Tec";
	var num_click;

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

});//END READY







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
		get_itineraire(data);
	});
}

function get_itineraire(data)
{
	url1 = "https://api.mapbox.com/directions/v5/mapbox/driving/"+data[0][0]["lon"]+","+data[0][0]["lat"]+";"+data[1][0]["lon"]+","+data[1][0]["lat"]+"?geometries=geojson&steps=true&access_token=pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
	Promise.all([
			fetch(url1).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		console.log(data);
		var array_coordinates = [];
		data[0]["routes"][0]["legs"][0]["steps"].forEach(function(steps) {
			steps["geometry"]["coordinates"].forEach(function(coordinates) {
				array_coordinates.push([coordinates[1], coordinates[0]]);
			});
		});
		if(check_itineraire(data))
			draw_itineraire(array_coordinates);
		else
			search_new_itineraire(data);
	});
}
function draw_itineraire(array_coordinates)
{
	var polyline = L.polyline(array_coordinates, {color: 'red'}).addTo(map);
	map.fitBounds(polyline.getBounds());
}



function check_itineraire(itineraire)
{
	var autonomie_voiture = 350;
	if(autonomie_voiture < (itineraire[0]["routes"][0]["distance"]/1000))
		return true; // ici il faut mettre false
	else
		return true;
}
	






function search_new_itineraire(old_itineraire)
{
/*
	var autonomie_voiture = 350;
	old_itineraire[0]["routes"][0]["legs"][0]["steps"].forEach(function(element) {
	int i;
	var listSteps = old_itineraire[0]["routes"][0]["legs"][0]["steps"];
	var distance=0;
	for(i=0;i<listSteps.length;i++)
	{
		if(distance + listSteps[i]["distance"] > itineraire[0]["routes"][0]["distance"] - 50)
			break;
		else
			distance = distance + listSteps[i]["distance"];
		


	}
	
	stations_recharge.forEach(function(element) {
		
	
	});

	console.log("search new itineraire");
*/
}




function onMapClick(e) {
	var url_reverse_geocoding = "https://eu1.locationiq.com/v1/reverse.php?key=" + token_locationiq + "&lat=" + e.latlng["lat"] + "&lon=" + e.latlng["lng"] + "&format=json";

	Promise.all([
			fetch(url_reverse_geocoding).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		if(num_click > 1)
			num_click = 0

		console.log(data);
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
		
		console.log(num_click);
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



