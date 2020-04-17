var map;
mapboxgl.accessToken = "pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
var start_geocoder;
var end_geocoder;
var token_locationiq = "07076b95eec962";
var token_here = "tVIwsP4pVf0zkKgUYV0XKFpI3hdOSJ_yJkTb4Ls_Tec";
var num_click;
var arrayLatLng = [];
var puissanceVoiture;
var autonomieVoiture;
var puissanceMaximaleVoiture;
var end_latitude;
var end_longitude;
var bool;
var markerDepart;
var markerArrivee;
var polyline;
var itineraireActive = false;


$(document).ready(function () {
	setTimeout(function(){
		$.LoadingOverlay("hide");	// Hide LoadingOverlay after loading page
	}, 3000);

	map = L.map('map').setView([48.833, 2.333], 7); // LIGNE 14
	var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { // LIGNE 16
			attribution: '© OpenStreetMap contributors',
			maxZoom: 19
	});


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

	$("#itinbloc").hide();

	//defilement des lien internes
	$('a[href^="#"]').click(function(){
		var id = $(this).attr("href");
		var offset = $(id).offset().top;
		$('html, body').animate({scrollTop: offset}, 'slow');
		return false;
	});

	//naviguer vers la carte
	$("#dropdownMenuButton").click(function(){
		var id = $("#bande_maps_id");
		var offset = $(id).offset().top;
		$('html, body').animate({scrollTop: offset}, 'slow');
		return false;
	});

	document.getElementById("type_vehicule").value = 0;
	document.getElementById("start_geocoder").value = "";
	document.getElementById("end_geocoder").value = "";

	document.getElementById("type_vehicule").addEventListener("change", function() {
		var tempVoiture;
		var tempIndex = this.selectedIndex;
		voiture.forEach(function(element) {
			if(element["id"] == tempIndex)
			{
				tempVoiture = element;
				return true;
			}	
		});
		
		if(tempVoiture != undefined)
		{
			autonomieVoiture = tempVoiture["autonomie"];
			capaciteVoiture = tempVoiture["puissance"];
			puissanceMaximaleVoiture = tempVoiture["puissanceMaximale"];
		}
	});


	var greenIcon = L.icon({
		iconUrl: 'leaf-green.png',
		shadowUrl: 'leaf-shadow.png',

		iconSize:     [38, 95], // size of the icon
		shadowSize:   [50, 64], // size of the shadow
		iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
		shadowAnchor: [4, 62],  // the same for the shadow
		popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
	});
	L.marker([51.5, -0.09], {icon: greenIcon}).addTo(map);
});

function searchItineraire(){
// Show full page LoadingOverlay
	$.LoadingOverlay("show", {
		image       : "",
		fontawesome : "fa fa-cog fa-spin fas fa-map-marked-alt"
	});

	//itinéraire
	var lat;
	var lon;

	url1 = 'https://eu1.locationiq.com/v1/search.php?key='+ token_locationiq + '&q=' + document.getElementById('start_geocoder').value + '&format=json';
	url2 = 'https://eu1.locationiq.com/v1/search.php?key='+ token_locationiq + '&q=' + document.getElementById('end_geocoder').value + '&format=json';
	Promise.all([
			fetch(url1).then(function(res) { return res.json(); })
			,fetch(url2).then(function(res) { return res.json(); })
	])
	.then(function(data) {
	
		if(itineraireActive)
			deleteOldItineraire();
		start_longitude = data[0][0]["lon"];
		start_latitude = data[0][0]["lat"];
		end_longitude =  data[1][0]["lon"];
		end_latitude = data[1][0]["lat"];
		arrayLatLng.push(data[0][0]["lon"]);
		arrayLatLng.push(data[0][0]["lat"]);
		arrayLatLng.push(data[1][0]["lon"]);
		arrayLatLng.push(data[1][0]["lat"]);
		get_itineraire(arrayLatLng);
	}).
	finally(function() {
		// Hide LoadingOverlay
		$.LoadingOverlay("hide");
	});
}

function get_itineraire(arrayLatLng){
	var LatLng = "";
	arrayLatLng.forEach(function(element, index) {		
		if(arrayLatLng.length == index + 1)
				LatLng = LatLng + element;
		else if(index%2 != 0)	{
			LatLng = LatLng + element + ";";
		}else{
			LatLng = LatLng + element + ",";
		}
	});
	
	url1 = "https://api.mapbox.com/directions/v5/mapbox/driving/"+LatLng+"?geometries=geojson&steps=true&language=fr&access_token=pk.eyJ1IjoiY3Zlcmdub24iLCJhIjoiY2s2ajVodGoyMDFvaTNxbGp1eGRqa3ZwbCJ9._FqRqJ8LXtsLYYURGUcydQ";
	Promise.all([
			fetch(url1).then(function(res) { return res.json(); })
	])
	.then(function(data) {
		if(data[0]["routes"][0] != undefined && document.getElementById("type_vehicule").value != 0){
			var array_coordinates = [];		
			// Les coordonnées de Latitude/Longitude n'étant pas dans le même ordre dans toutes les API, on les réordonne
			data[0]["routes"][0]["legs"].forEach(function(element) {
				element["steps"].forEach(function(steps) {
					steps["geometry"]["coordinates"].forEach(function(coordinates) {
						array_coordinates.push([coordinates[1], coordinates[0]]);
					});
				});
			});
			


			var boolCheckItineraire = true;
			data[0]["routes"][0]["legs"].forEach(function(element){
				if(autonomieVoiture < element["distance"]){
					search_new_itineraire(element);
					boolCheckItineraire = false;
				}
			});
			if(boolCheckItineraire == true)	{
				draw_itineraire(array_coordinates);
				displayItineraire(data);
			}
		}else{
			alert("impossible");
		}
	});
}

function deleteOldItineraire()
{
		polyline.remove(map);
		arrayLatLng = [];
}

function draw_itineraire(array_coordinates){
	polyline = L.polyline(array_coordinates, {color: 'red'}).addTo(map);
	map.fitBounds(polyline.getBounds());
	itineraireActive = true;
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

function search_new_itineraire(leg){
	arrayLatLng.splice(arrayLatLng.length -2, 2);
	var distance = 0;
	var pos = [];
	var boolGetStep = false;
	leg["steps"].some(function(element, index) {
		if(!boolGetStep){
			if((distance + element["distance"]) < 0.5*autonomieVoiture){
				distance = distance + element["distance"];
			}else{
				var distanceStep = element["distance"];
				var nbPositionInStep = Math.trunc(element["geometry"]["coordinates"].length);
				var distancePositionInStep = Math.trunc(distanceStep/nbPositionInStep);
				var index = 0;
				while(distance + distancePositionInStep < distanceStep && distance + distancePositionInStep < 0.8*autonomieVoiture){
					if(distance > 0.5*autonomieVoiture && element["geometry"]["coordinates"][index] != undefined)
						pos.push(element["geometry"]["coordinates"][index]);
					index++;
					distance = distance + distancePositionInStep;	
				}
				
				if(distance + distancePositionInStep > 0.8*autonomieVoiture)
					return true;
				boolGetStep = true;
			}
		}else{
			if(distance + element["distance"] < 0.8*autonomieVoiture){
				element["geometry"]["coordinates"].forEach(function(element) {
					if(element != undefined)
						pos.push(element);		
				});
				distance = distance + element["distance"];
			}else{
				var distanceStep = element["distance"];
				var nbPositionInStep = Math.trunc(element["geometry"]["coordinates"].length);
				var distancePositionInStep = Math.trunc(distanceStep/nbPositionInStep);
				var index = 0;
				while(distance + distancePositionInStep < 0.8*autonomieVoiture){
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
	while(index < pos.length)	{
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

function searchNearestStation(position){
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
			if(markerDepart != undefined)
				map.removeLayer(markerDepart);
			markerDepart = L.marker([e.latlng["lat"] , e.latlng["lng"]]).addTo(map);
		}
		if(num_click == 1)
		{
			if(markerArrivee != undefined)
				map.removeLayer(markerArrivee);
			markerArrivee = L.marker([e.latlng["lat"] , e.latlng["lng"]]).addTo(map);
			document.getElementById("end_geocoder").value = adresse;
		}
		num_click++;

		
	});
}

function displayItineraire(itineraire){
	puissanceStation = 40;
	var duration = 0;
	//on vide l'itinérair av de recharger le nouveau
	$('#itindata').html('');
	$('#pointilé').html('');
	
	console.log(itineraire);
	
	itineraire[0]["routes"][0]["legs"].forEach(function(legs, index) {
		legs["steps"].forEach(function(steps) {
			steps["maneuver"]["instruction"];
			var tempDistance;
			if(Math.trunc(steps["distance"]) >= 1000)
				tempDistance = Math.trunc(Math.trunc(steps["distance"])/1000) + "," + Math.trunc(steps["distance"]%1000) + " km ";
			else
				tempDistance = (steps["distance"]/1000).toFixed(2) + "m";
			$('#itindata').append('' +
				'<div class="directions-mode-separator">' +
					'<div class="directions-mode-line"></div>' +
					'<div class="directions-mode-distance-time">' + tempDistance + '</div>' +
				'</div>' +
				'<div class="itin_list">' +
					'<i class="fa fa-directions" '+ ((steps["maneuver"]["modifier"]=="left")?'style=" transform: scaleX(-1);"':'')+'></i> ' + steps["maneuver"]["instruction"] +
				'</div>'
			);
		});

		if(index + 1 != (itineraire[0]["routes"][0]["legs"]).length){
			var autonomieRestanteKm = autonomieVoiture - legs["distance"];
			puissanceVoiture  = Math.trunc((autonomieRestanteKm * 100)/autonomieVoiture);
			var tempTempsRechargement = getTempsRechargement();
			duration = duration + tempTempsRechargement;
			console.log(duration);
			$('#itindata').append('<div><i class="fas fa-charging-station faInfo"></i> <span id="info_station_recharge" > Temps de rechargement: ' + tempTempsRechargement + ' min</span></div>')
		}
	});

	var blocItineraire = document.getElementById("itinbloc");
	
	
	var distance = Math.trunc(itineraire[0]["routes"][0]["distance"]/1000).toFixed(2) ;
	duration = duration + itineraire[0]["routes"][0]["duration"]/60;
	duration = Math.trunc(duration);
	
	
	if(duration >= 60)
		duration = Math.trunc(Math.trunc(duration)/60) + "h" + Math.trunc(duration%60);
	else
		duration = duration + "mn";
	document.getElementById("info_dure_distance").innerHTML = " " + distance + " km (" + duration + ")";
	
	
	var nbRechargement = (itineraire[0]["routes"][0]["legs"]).length - 1;
	
	if(nbRechargement == 1)
		document.getElementById("info_station_recharge").innerHTML = " 1 rechargement nécessaire";
	else if(nbRechargement == 0)
		document.getElementById("info_station_recharge").innerHTML = " Pas de recharge nécessaire";
	else
		document.getElementById("info_station_recharge").innerHTML = " " + nbRechargement + " rechargements nécessaires";		



	$(".first_div .fa_arrive").html('&nbsp'+$("#end_geocoder").val());
	$(".first_div .fa_depart").html('&nbsp'+$("#start_geocoder").val());
	$('#divider_with_itin').show();
	$("#itinbloc").show();

	//on rajoute les petits pointilé pour chaque step
	var heigh=parseInt( $("#itindata").css("height"));
	for(var i=0;i<heigh; i=i+(heigh/20)){
		$('#pointilé').append('<i class="fas fa-circle fa-liaison-itineraire" style="margin-bottom : 10px"></i>');
	}

}

function getPalierByPuissance(puissance){
	if(puissance > 40)
		return 75;
	else if(35 <= puissance < 40)
		return 81;
	else if(30 <= puissance < 35)
		return 83;
	else if(25 <= puissance < 30)
		return 85;
	else if(20 <= puissance < 25)
		return 88;
	else if(15 <= puissance < 20)
		return 92;
	else if(10 <= puissance < 15)
		return 95;
	else
		return 98;	
}

function getTempsRechargement(){
	var tempsRechargement = 0;
	
	if(puissanceStation > puissanceMaximaleVoiture)
		puissanceStation = puissanceMaximaleVoiture;
	
	var palier = getPalierByPuissance(puissanceStation);
	if(puissanceVoiture < palier)
	{
		tempsRechargement = tempsRechargement + 60*((palier - puissanceVoiture)/100)*(capaciteVoiture/puissanceStation);
		puissanceVoiture = palier;
	}

	
	palier = getPalierByPuissance(0.75*puissanceStation);
	if(puissanceVoiture < palier)
	{
		tempsRechargement = tempsRechargement + 60*((((palier + 100)/2)-palier)/100)*(capaciteVoiture/(0.75*puissanceStation));
		puissanceVoiture = palier;

	} 
	else if(puissanceVoiture < (palier + 100)/2)
	{
		tempsRechargement = tempsRechargement + 60*((((palier + 100)/2)-puissanceVoiture)/100)*(capaciteVoiture/(0.75*puissanceStation));
		puissanceVoiture = palier;
	}
	
	
	palier = getPalierByPuissance(0.5*puissanceStation);
	if(puissanceVoiture < (palier + 100)/2)
	{
		tempsRechargement = tempsRechargement + 60 * ((((palier + 500)/6) - ((palier + 100)/2))/100)*(capaciteVoiture/(0.5 * puissanceStation));
		puissanceVoiture = palier;
	} 
	else if(puissanceVoiture < (palier + 500)/6)
	{
		tempsRechargement = tempsRechargement + 60 * ((((palier + 500)/6) - puissanceVoiture)/100) * (capaciteVoiture/(0.5 * puissanceStation));
		puissanceVoiture = palier;
	}

	
	palier = getPalierByPuissance(0.25*puissanceStation);
	if(puissanceVoiture < (palier + 500)/6)
	{
		tempsRechargement = tempsRechargement + 60*((100 - ((palier+ 500)/6))/100)*(capaciteVoiture/(0.25*puissanceStation));
		puissanceVoiture = palier;
	} 
	else if(puissanceVoiture < (palier + 100)/2)
	{
		tempsRechargement = tempsRechargement = 60 * ((100 - palier)/100) * (capaciteVoiture/(0.25 * puissanceStation));
		puissanceVoiture = palier;
	}
	return Math.trunc(tempsRechargement);
}
