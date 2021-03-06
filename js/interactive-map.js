///////////////////////////// This is the barchart with ttl distances ///////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////
	function draw_distances(data) {

		var margin = {top: 20, right: 20, bottom: 20, left: 40},
				width = 600 - margin.left - margin.right,
				height = 100 - margin.top - margin.bottom;

		var yTextPadding = 12; // For the bar tip on top

		var x = d3.scaleBand()
							.domain(data.map(function(d,i) { return i; }))
							.rangeRound([0, width])
							.padding(0.1);

		var y = d3.scaleLinear()
							.domain([0, d3.max(data, function(d) { return d.ttl_dist; })])
							.range([height, 0]);

		var xAxis = d3.axisBottom()
									.scale(x)
									.tickFormat(function(d) {return data[d].day_no;});

		var yAxis = d3.axisLeft()
									.scale(y)
									.ticks(5);

		var svg = d3.select("#bar")
								.append("g")
								.attr("transform", "translate(" + margin.left + "," + margin.top*2 + ")");

			// The x-axis
			svg.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);
			// The x-axis title
			svg.append("text")
					.attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
					.attr("transform", "translate("+ (width/2) +","+(height+(margin.bottom*2))+")")  // centre below axis
					.text("Day");
			 // The y-axis title
			svg.append("text")
					.attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
					.attr("transform", "translate("+ (-margin.left/2) +","+(height/2)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
					.text("Distance in km");

			// The bars
			svg.selectAll(".bar")
					.data(data)
				.enter().append("rect")
					.attr("class", "bar")
					.attr("x", function(d, ix) { return x(ix); })
					.attr("width", x.bandwidth())
					.attr("y", function(d) { return y(d.ttl_dist); })
					.attr("height", function(d) { return height - y(d.ttl_dist); })

			// The tips on top of bars
			svg.selectAll(".bartext")
					.data(data)
					.enter().append("text")
					.attr("class", "bartext")
					.attr("text-anchor", "middle")
					.attr("font", "10px sans-serif")
					.attr("fill", "#fef6cd")
					.attr("x", function(d,ix) { return x(ix)+x.bandwidth()/2; })
					.attr("y", function(d) { return y(d.ttl_dist)+yTextPadding; })
					.text(function(d){ return d.ttl_dist+" km"; });

			//Setting onMouseOver event handler for bars
			svg.selectAll(".bar").on("mouseover", function(d){
				$(".active").removeClass("active");
				$(this).addClass("active");
				draw_graphs(d);
				draw_map_route(d);
			});
	}

	////////////////////////////////// This is the elevation linegraph ///////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////////////////////
	function draw_graphs(day_data) {
		var margin = {top: 20, right: 20, bottom: 30, left: 50},
				width = 600 - margin.left - margin.right,
				height = 150 - margin.top - margin.bottom;

		// Define format of the text value on top of the moving circle
		var formatValue = d3.format(",.1f");

		// Define format for time
		var parseTime = d3.timeParse("%I:%M:%S");

		// Create a bisect to handle the position of the mouse in relation with the data on mousemove
		var bisect = d3.bisector(function(d){ return d.distance; }).left; // NEW STAFF

		// variable to hold our yscales
		var yarray = ['elevation','speed','heartrate'];

		// Intitialize new nested dataset
		var new_data_nest = [];

		// Create the nested dataset
		for ( var ix=0; ix<3; ix++) {
			// Create helper array to build the nested dataset
			var tmp = [];

			 for ( var i=0; i<day_data['elevation'].length; i++) {
			 tmp.push(
					{distance : day_data['distance'][i],
						time : day_data['time_form'][i],
						value : day_data[yarray[ix]][i],
						lat : day_data['path'][i][0],
						long : day_data['path'][i][1],
						symbol : yarray[ix]
				});
			}
			new_data_nest.push({
					key : yarray[ix],
					values:tmp
			});
		}
		// Add the SI symbol in the nested datasetfor each metric
		for ( var ix=0; ix<3; ix++) {
			if (new_data_nest[ix].key=='elevation'){
				for ( var i=0; i<new_data_nest[0].values.length; i++) {
						new_data_nest[ix].values[i]['si'] = 'm'
				}
			}
			else if (new_data_nest[ix].key=='speed'){
				for ( var i=0; i<new_data_nest[0].values.length; i++) {
						new_data_nest[ix].values[i]['si'] = 'km/h'
				}
			}
			else if (new_data_nest[ix].key=='heartrate'){
				for ( var i=0; i<new_data_nest[0].values.length; i++) {
						new_data_nest[ix].values[i]['si'] = 'bpm'
				}
			}
		}
		//console.log(parseTime(new_data_nest[0].values[0]['time']));
		// disctionary to hold our yscales
		var ys = {};

		// Remove previous elevation graph if loaded
		d3.select("#graphs").selectAll('*').remove();

		// Initialize the main are to put all graphs in
		var area = d3.area()
								 .x(function(d) { return xScale(d.distance);})
								 .y0(height)
								 .y1(function(d,i) {
										return ys[d.symbol](d.value); //<-- call the y function matched to our symbol
										//ys[yarray[i]](d.yarray);
									});
		// Initialize the line for each graph
		var line = d3.line()
								 .x(function(d) { return xScale(d.distance); })
								 .y(function(d,i) {
										return ys[d.symbol](d.value); //<-- call the y scale function matched to our symbol
										//ys[d.symbol](d.price);
								 });

		// Build the x scale
		var xScale = d3.scaleLinear()
									 .rangeRound([0, width]);

		// Build the x axis
		var xAxis = d3.axisBottom()
									.scale(xScale)
									.tickFormat(d3.format(".1s"));

		// Compute the maximum y-value per graph, needed for the y-domain.
		new_data_nest.forEach(function(s) {
			// Find the max value
			var maxValue = d3.max(s.values, function(d) { return d.value; });
			// Append the yscale of each line in the ys
			ys[s.key] = d3.scaleLinear() //<-- create a scale for each "symbol" (ie Sensor 1, etc...)
										.range([height, 0])
										.domain([0, maxValue]);
		});

		// Compute the minimum and maximum distance across y-elements.
		// We assume values are sorted
		xScale.domain([
			d3.min(new_data_nest, function(s) {
				return s.values[0].distance;
			}),
			d3.max(new_data_nest, function(s) {
				return s.values[s.values.length - 1].distance;
			})
		]);

		// Add an SVG element for each symbol, with the desired dimensions and margin.
		var svg1 = d3.select("#graphs").selectAll("svg")
			.data(new_data_nest)
			.enter().append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom);

		// Create the rect for the mouse to be tracked
		svg1.append("defs").append("svg:clipPath")
			.attr("id", "clip")
			.append("svg:rect")
			.attr("id", "clip-rect")
			.attr("x", "-40")
			.attr("y", "-10")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height  +margin.top-10);

		// Add all svg1 in the main svg
		var svg = svg1.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			// Add the area path elements. Note: the y-domain is set per element.
			svg.append("path")
				.attr("class", "area")
				.attr("d", area);

			// Add the line path elements. Note: the y-domain is set per element.
			svg.append("path")
				.attr("class", "line")
				.attr("d", function(d) {
					return line(d.values);
				});

		// Add the area path elements. Note: the y-domain is set per element.
		svg.append("path")
			.attr("class", "area")
			.attr("d", area);

		// Title for the y-axis
		svg.append("text")
			 .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
					.attr("transform", "translate("+ (-margin.left/1.6) +","+(height/2)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
					.text(function(d) {
							return capitalizeFirstLetter(d.key);
					});

		// The x-axis
		svg.append('g') // create a <g> element
			.attr('class', 'x axis') // specify classes
			.attr("transform", "translate(0," + height + ")")
			.call(xAxis); // let the axis do its thing

		// build 4 y axis
		var axisGs = svg.append("g"); //<-- create a collection of axisGs

			// Build the structure
			axisGs.attr("class", "y axis")
						.append("text")
						.attr("transform", "rotate(-90)")
						.attr("y", 6)
						.attr("dy", ".71em")
						.style("text-anchor", "end")
						.text(function(d) {
							return d.values[d.values.length - 1].value;
						});
			// For each axisG create an axis with it's scale
			axisGs.each(function(d, i) {
				var self = d3.select(this);
				self.call(
					d3.axisLeft()
					.scale(ys[d.key])
					.ticks(4)
				);
			});
		// Place each graph one after the other
		svg = svg.append("g").attr("clip-path", "url(#clip)");

		// Create a class for the mouse-move event
		var focus = svg.append("g")
			.attr("class", "focus")
			.style("display", "none");

			// Add the circle
			focus.append("circle")
						.style("stroke", "#47885e")
						.style("fill", "#fef6cd")
						.style("stroke-width", "1.5px")
						.attr("r", 4.5);

			// Add text on top of moving circle
			focus.append("text")
				.attr("x", 0)
				.attr("dy", "-.90em")
				.style("font-size", "12px")
				.style("fill", "grey")
				.style("text-anchor", "middle");

		// Create the area where the mouse will be tracked
		svg.append("rect")
			.attr("class", "overlay")
			.attr("width", width)
			.attr("height", height)
			.on("mouseover", function() {
				focus.style("display", null);
			})
			// .on("mouseout", function() {
			//   focus.style("display", "none");
			// })
			.on("mousemove", mousemove);

		// append the vertical line for each
		focus.append("line")
			.attr('id', 'focusLineX')
			.attr("class", "focusLine");

		function mousemove() {
			var xnew, posit, coordinates;
			coordinates = d3.mouse(this);
			xnew = xScale.invert( coordinates[0] );

			// Select focus class of all linegraphs
			var focus = svg.selectAll(".focus");

			/////////////////////////////////////////////////////////// Create the moving marker on map
			// Select map
			map = window.map;

			// Remove previous marker on move
			$(".marker").remove();

			// Create a new layer on map for the marker
			var svg2 = d3.select("#map").select("svg"),
			g2 = svg2.append("g").attr("class", "marker");

			// Find the position of the array according to mouse move
			posit1 = bisect(new_data_nest[0].values, xnew, 0, new_data_nest[0].values.length);

			var tmplat = new_data_nest[0].values[posit1]['lat']
			var tmplon = new_data_nest[0].values[posit1]['long']

			LatLng = new L.LatLng(tmplat,tmplon);

			// Sava coords into a variable object
			var coords2 = [{tmplat,tmplon,LatLng}]

			// This is the market point
			var feature = g2.selectAll("path")
					 .data(coords2)
					 .enter().append("circle")
					 .style("stroke", "#47885e")
					 .style("fill", "#fef6cd")
					 .style("stroke-width", "1.5px")
					 .attr("r", 4.5);

			// Up until here it is correct
			map.on("viewreset", update);
			update();

			// Create a function to handle the layers on zoum in and out
			function update() {
					feature.attr("transform",
					function(d) {
							return "translate("+
									map.latLngToLayerPoint(d.LatLng).x +","+
									map.latLngToLayerPoint(d.LatLng).y +")";
							}
					)
			} // close update
			//////////////////////////////////////// END Marker

			// Start the transform - translate function
			focus.attr("transform", function(d) {
					// Define the position of the mouse
					posit = bisect(d.values, xnew, 0, d.values.length);

					//Define the limits of the y-vertical mouseover axis with yDomain
					var yDomain = d3.extent(d.values, function(d) {
						return d.value;
					});
					// Define the position of the y-vertical line
					focus.select('#focusLineX')
						.attr("x1", 0)
						.attr("y1", 0)
						.attr("x2", 0)
						.attr("y2", ys[d.key](yDomain[0]-height));

					// Activate the text on top of the moving circle
					focus.selectAll("text").text(function(d) {
						return ("" + formatValue(d.values[posit].value)  + "" + d.values[posit].si)
					});

				// adjust mouseover to use appropriate scale
				return "translate(" + xScale(d.values[posit].distance) + "," + ys[d.key](d.values[posit].value) + ")"
			}); // End transform - translate function
		} // End mousemove


		} // End draw elevation
		function draw_base_map() {
			// The center must be updated whenever I put a new coordinate on the map
			var center = [55.6716,12.5714]  //[53.01,25.73]->Eastern Europe,  [37.77, -122.45]->California

			// The token is for access to the mapbox API
			var accessToken = 'pk.eyJ1Ijoib2lrb25hbmciLCJhIjoiY2ozM2RjcjIyMDBjODJ3bzh3bnRyOHBxMyJ9.nQH16WG-DcBB_TQEEJiuCA';

			// Default guidelines from Leaflet
			var mapboxTiles = L.tileLayer('https://api.mapbox.com/styles/v1/oikonang/cj33g56m9000k2roa18n92cr8/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoib2lrb25hbmciLCJhIjoiY2ozM2RjcjIyMDBjODJ3bzh3bnRyOHBxMyJ9.nQH16WG-DcBB_TQEEJiuCA', {
					attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
					maxZoom: 18,
					accessToken: accessToken
			});
			// Mapbox with leaflet
			var map = L.map('map').addLayer(mapboxTiles).setView(center, 12);

			// Initialize map
			window.map = map
		}

		// Draw lan lot on map
		function draw_map_route(day_data) {
			map = window.map;
			if (window.currentPath) {
				map.removeLayer(window.currentPath);
			};
			latlng = day_data['path'];
			var polyline = L.polyline(latlng, {color: 'red'}).addTo(map);
			window.currentPath = polyline;
		}

	function draw(data) {
		//data.reverse();
		draw_distances(data);
		draw_base_map();
	}
	// Function that capitalizes the first letter of a word
	function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
	}
