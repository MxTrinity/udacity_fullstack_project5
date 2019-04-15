// location data model
function Location(name, pageTitle, location) {
	var self = this;
	self.name = ko.observable(name);
	self.pageTitle = ko.observable(pageTitle);
	self.location = ko.observable(location);
}

// the base info that makes the rest of the project run properly
var loc = [{
		name: 'Hull House',
		pageTitle: 'Hull_House',
		location: [41.871643, -87.647692]
	},
	{
		name: 'Shedd Aquarium',
		pageTitle: 'Shedd_Aquarium',
		location: [41.8675726, -87.614038]
	},
	{
		name: 'Pui Tak Center',
		pageTitle: 'Pui_Tak_Center',
		location: [41.8523969, -87.632291]
	},
	{
		name: 'Chicago Union Station',
		pageTitle: 'Chicago_Union_Station',
		location: [41.8786646, -87.6391997]
	},
	{
		name: 'Civic Opera House',
		pageTitle: 'Civic_Opera_House_(Chicago)',
		location: [41.882564, -87.6374246]
	}
];


var map;
var markers = [];

// the knockout MVVM viewmodel
var viewModel = function () {
	var self = this;

	// link up all the location data from the model into observables
	this.locationList = ko.observableArray([]);
	loc.forEach(function (obj) {
		self.locationList.push(new Location(obj.name, obj.pageTitle, obj.location));
	});

	// keep track of the currently selected location by the user
	this.selectedLocation = ko.observable(this.locationList()[0]);

	// update the selected location observable and open a infoWindow on the marker
	this.setLocation = function (location) {
		self.selectedLocation(location);
		var l = self.locationList.indexOf(location);
		var position = {
			'lat': loc[l].location[0],
			'lng': loc[l].location[1]
		}
		makeInfoWindow(markers[l], position);
	}

	// Observable that binds with the filter input text
	this.searchFilter = ko.observable('');

	// the filtered list of displayable text and markers
	this.filteredObjects = ko.computed(function () {
		var filter = this.searchFilter();
		// where filter is empty display each location and refresh it's inforwindows if needed
		if (!filter || filter === '') {
			if (markers) {
				markers.forEach(function (marker) {
					marker.setVisible(true);
					if (marker.infoWindow !== null) {
						makeInfoWindow(marker);
					}
				});
			}
			return this.locationList();

		} else {
			// if you have a non-empty filter match all locations  names contain the filter's text
			var filteredObjs = ko.utils.arrayFilter(self.locationList(), function (obj) {
				return (obj.name().toUpperCase().includes(filter.toUpperCase()));
			});
			// set every marker to hidden (as to avoid state management from previous filters)
			markers.forEach(function (marker) {
				marker.setVisible(false);
				if (marker.infoWindow !== null) {
					marker.infoWindow.close();
				}
			});
			// then slectively re-enable them if their name matches one of the locations in the filtered
			// array and clean up any infowindows open markers
			filteredObjs.forEach(function (location) {
				markers.forEach(function (marker) {
					if (marker.title === location.name()) {
						marker.setVisible(true);
						if (marker.infoWindow !== null) {
							makeInfoWindow(marker);
						}
					}
				});
			});
			return filteredObjs;
		}
	}, this);
}

// activate the data-bind attribute
ko.applyBindings(new viewModel());




function genMap() {
	// Create the map obj
	map = new google.maps.Map(document.getElementById('map'), {
		center: {
			lat: 41.8739993,
			lng: -87.6349082
		},
		zoom: 14,
		mapTypeControl: false
	});
	// creates the KO View Model and accesses all data for the markers, plus i like octopi
	var octopus = new viewModel();

	// The following group uses the location array to create an array 
	// of markers on initialization
	var locations = octopus.locationList();
	for (var i = 0; i < locations.length; i++) {
		var x = locations[i].location();
		var position = {
			'lat': x[0],
			'lng': x[1]
		}
		var title = locations[i].name();
		// Create a new marker at every location, and insert it into the markers array
		var marker = new google.maps.Marker({
			position: position,
			title: title,
			animation: google.maps.Animation.DROP,
			id: i,
			infoWindow: null,
			icon: 'img/marker-small.png'
		});

		// Push the marker to our array of markers. and bind a click event to generate infowindows
		markers.push(marker);
		marker.addListener('click', function () {
			makeInfoWindow(this, position);
		});
	}

	// Extend the boundaries of the map for each marker and display the marker
	var bounds = new google.maps.LatLngBounds();
	for (var i = 0; i < markers.length; i++) {
		markers[i].setMap(map);
		bounds.extend(markers[i].position);
	}
	map.fitBounds(bounds);
}

// define a callback for the google api if it fails
function mapFailed() {
	document.getElementById('map').innerHTML = '<h1>Fetching Google Maps failed.</h1>';
}

// creates infowindows and binds callback logic
function makeInfoWindow(marker) {
	var infoWindow = new google.maps.InfoWindow();
	marker.setAnimation(4);
	//
	if (marker.infoWindow === null) {
		//give the marker memory of this infowindow so we can close it during filtering and dont open another infoWindow
		marker.infoWindow = infoWindow;
		//give the infowindow memory of it's marker for binding the close callback
		infoWindow.marker = marker;
		// create the URL to call the wikipedia API
		let wikiApi = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + loc[marker.id].pageTitle;

		$.getJSON(wikiApi, function (data) {
			console.log(data);
			redirect_url = data.content_urls.desktop.page;
			// make a info window with the name of the place and a link to a wiki article
			infoWindow.setContent('<div style="align: center"><strong>' + marker.title + '</strong><br>Wikipedia Info: <a href="' + redirect_url + '">' + marker.title + '\'s page.' + '</a></div>');
			marker.Animation
			infoWindow.open(map, marker);
		}).fail(function () {
			// generate an infowindow with no url but keep the flow the same
			infoWindow.setContent('<div>' + marker.title + '<br><p>Failed to fetch Wikipedia artcles</p></div>');
			marker.Animation
			infoWindow.open(map, marker);
		});

		//make sure to clear the marker's reference to the infowindow on close so that we
		infoWindow.addListener('closeclick', function () {
			infoWindow.marker.infoWindow = null;
			infoWindow = null;
		});


	} else {
		//just to make sure we refresh the infowindow and don't have 
		marker.infoWindow.close();
		marker.infoWindow.open(map, marker);
	}
}