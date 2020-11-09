function Pseudoobj () {}	Pseudoobj.prototype = { // оболочка псевдокласса
create: function (map) {
	this.map = map;
	this.p = {};
	this.point = {};
	this.point.dir = 's';

	this.geoCalc = {}; // Для хранения вычислимых параметров ракурса и обзора, в геодезической нотации
	this.layers = {};
	this.dir = [ // Индексы сторон света по долям в 11,25° 8 направлений
		'n', 'n',
		'ne', 'ne', 'ne', 'ne',
		'e', 'e', 'e', 'e',
		'se', 'se', 'se', 'se',
		's', 's', 's', 's',
		'sw', 'sw', 'sw', 'sw',
		'w', 'w', 'w', 'w',
		'nw', 'nw', 'nw', 'nw',
		'n', 'n'
	];
	/*	this.dir = [ // Индексы сторон света по долям в 11,25°, на 16 направлений
		'n', 'nne', 'nee', 'ne', 'ne', 'nee', 'nee', 'e',
		'e', 'see', 'see', 'se', 'se', 'sse', 'sse', 's',
		's', 'ssw', 'sww', 'sw', 'sw', 'sww', 'sww', 'w',
		'w', 'nww', 'nww', 'nw', 'nw', 'nnw', 'nnw', 'n'
	]; */
	this.dir_α = { // Default α for legacy directions
		null: null,
		n : 0.0,
		ne : 45.0,
		e : 90.0,
		se : 135.0,
		s : 180.0,
		sw : 225.0,
		w : 270.0,
		nw: 315.0,
		aero: NaN
	}
	this.marker_φλ0_mode1_tooltip = 'Это <b>точка съёмки</b>,</br> обозначаемая <b>φλ₀</b></br>Нажмите на значок для завершения, если</br>затруднительно определить направление вида';
	this.marker_φλ0_mode2_tooltip = 'Это точка <b>точка объекта на вертикальной оси</b> изображения,</br> обозначаемая <b>φλ₁</b></br>Нажмите на значок для завершения, если</br> затруднительно определить угол обзора';

	this.drawGeoSelectionLayers(); // Нарисовали то, для чего достаточно данных

	this.map.addEventListener('click', this.onMapGeoSelectionClick, this);
	this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	//// block of set functions for elements of image's geodesical data
	set_φλ0 : function (φλ0, stable) { // photographer's / artist point
		if (!φλ0){
			this.φλ0 = null;
			this.geoCalc = {};
			this.geoCalc.φλ0 = null;
			this.set_φλ1(null);
			return;
		} else {
			this.geoCalc.φλ0 = φλ0;
			if (stable)
				this.φλ0 = φλ0;
			this.drawGeoSelectionLayers();
		}
	},
	set_φλ1 : function (φλ1, stable) { // point of object on geomertic center of the image
		if (!this.φλ0)
			return;
		if (!φλ1){
			this.φλ1 = null;
			this.geoCalc.φλ1 = null;
			this.geoCalc.Δl_m = null; // Distance between points φλ0 and φλ1
			this.geoCalc.α = null;	// °, Geodezic azimuth from φλ0 to φλ1
			this.set_β(null);
			return;
		} else {
			this.geoCalc.φλ1 = φλ1;
			if (stable)
				this.φλ1 = φλ1;
			var rs = this.Δl_azimut(this.geoCalc.φλ0, this.geoCalc.φλ1);
			this.geoCalc.α = rs.α;
			this.geoCalc.Δl_m = rs.Δl_m;
			this.drawGeoSelectionLayers();
		}
	},
	set_β : function(β, stable) { // °, measure of observation
		if (!β){
			this.β = null;
			this.geoCalc.β = null;
			this.geoCalc.α0 = null;
			this.geoCalc.α1 = null;
			return;
		} else {
			this.geoCalc.β = β;
			if (stable)
				this.β = β;
			var Δβ = this.β / 2.0;
			this.geoCalc.α1 = (this.geoCalc.α - Δβ);
			this.geoCalc.α2 = (this.geoCalc.α + Δβ);
			this.drawGeoSelectionLayers();
		}
	},
	//// block for layers of elements of selection image's geodesical data
	draw_Layers_φλ0 : function() {
		if (this.layers.φλ0)
			this.map.removeLayer(this.layers.φλ0);
		if (this.layers.sector)
			this.map.removeLayer(this.layers.sector);
		if (!this.geoCalc.φλ0)
			return;
		this.layers.φλ0 = L.marker(
			this.φλ0, {
				draggable: true,
//				title: this.title_φλ0,
				icon: L.icon({
					iconSize: [26, 43],
					iconAnchor: [13, 36],
					iconUrl: 'pinEdit.png',
					className: 'pointMarkerEdit'
				})
			})
			.addEventListener('dragstart', this.dragStart_φλ0, this)
			.addEventListener('dragend', this.dragEnd_φλ0, this)
			.on('mouseover', function (e) {
        		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
	        }, this)
    	    .on('mouseout', function (e) {
				this.map.addEventListener('mousemove', this.onMapMouseMove, this);
		    }, this)
			.addEventListener('click', this.onCentralMarkerClick, this)
			.addTo(this.map);
		if (this.point.dir){
			var α = this.dir_α[this.point.dir];
			if (!α.isNaN && !this.layers.old_dir)
				L.sector({
					center: this.φλ0,
					innerRadius: 2.0,
					outerRadius: 250.0,
					startBearing: α - 15.0,
					endBearing :α + 15.0,
					fill: true,
					fillColor:'#f754e1',
					fillOpacity: 0.2,
					color: '#f754e1',
					opacity: 0.4,
					weight: 1
				})		
			.addTo(this.map);
		const R_m = 6371e3; // r ♁
		function rad (x)
			{ return x * Math.PI/180; }
		var φ1 = rad (this.φλ0[0]);
		var λ1 = rad (this.φλ0[1]);
		var α_rd = rad (α);
		var Δ_θ = 250.0 / R_m;
		var φ2 = Math.asin( Math.sin(φ1) * Math.cos(Δ_θ) + Math.cos(φ1) * Math.sin(Δ_θ) * Math.cos(α_rd) );
		if (Math.abs(Math.cos(φ2)) < 0.001)
			var λ2 = λ1;
		else
			var λ2 = ((λ1 - Math.asin( Math.sin(α_rd)* Math.sin(Δ_θ) / Math.cos(φ1) ) + Math.PI ) % (2*Math.PI) ) - Math.PI;
		φ2 = φ2/Math.PI*180.0;
		λ2 = λ2/Math.PI*180.0;
			L.polyline(
				[this.geoCalc.φλ0, [φ2, λ2]], {
					color: '#f754e1',
					weight: 2,
					dashArray: '5, 8'
				}
			)	
			.addTo(this.map);
			this.layers.old_dir = true;
		}
	},
	dragStart_φλ0 : function (e) {
		console.log('grag start φλ0');
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
		if (this.layers.sector)
			this.map.removeLayer(this.layers.sector);
		if (this.layers.line_φλ0_φλ1)
			this.map.removeLayer(this.layers.line_φλ0_φλ1);
		//if (this.layers.φλ1)			this.map.removeLayer(this.layers.φλ1);
	},
	dragEnd_φλ0 : function (e) {
		console.log('grag end φλ0');
		var ll = e.target.getLatLng();
		this.set_φλ0([ll.lat, ll.lng], true);
		this.set_φλ1(this.φλ1, true);
		this.set_β(this.β, true);
		this.map.removeLayer(this.layers.φλ0);
		this.drawGeoSelectionLayers();
		this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	draw_Layers_φλ1 : function() {
		if (this.layers.φλ1){
			this.map.removeLayer(this.layers.φλ1);
			if (this.layers.line_φλ0_φλ1)
				this.map.removeLayer(this.layers.line_φλ0_φλ1);
		}
		if (!this.geoCalc.φλ1)
			return;
		this.layers.φλ1 = L.marker(
			this.geoCalc.φλ1, {
				draggable: true,
		//		title: this.title_φλ1,
				icon: L.icon.glyph({
					prefix: '',
					cssClass:'sans-serif',
					glyph: '🠝'
				})
			})
			.addEventListener('dragstart', this.dragStart_φλ1, this)
			.addEventListener('dragend', this.dragEnd_φλ1, this)
			.on('mouseover', function (e) {
        		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
	        }, this)
    	    .on('mouseout', function (e) {
				this.map.addEventListener('mousemove', this.onMapMouseMove, this);
		    }, this)
			.addEventListener('click', this.geoSelectionComplete, this)
			.bindTooltip(this.marker_φλ0_mode2_tooltip)
			.addTo(this.map);
		this.layers.line_φλ0_φλ1 = L.polyline(
			[this.geoCalc.φλ0, this.geoCalc.φλ1], {
				draggable: true,
				color: '#FF0000',
				weight: 1
			}
		)
		.addEventListener('dragend', this.dragEnd_φλ1, this)
		.addTo(this.map);
	},
	dragStart_φλ1 : function (e) {
		console.log('grag start φλ1');
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
		// this.map.removeLayer(this.layers.φλ0);
		this.map.removeLayer(this.layers.line_φλ0_φλ1);
	},
	dragEnd_φλ1 : function (e) {
		console.log('grag end φλ1');
		var ll = e.target.getLatLng();
		this.set_φλ1([ll.lat, ll.lng], true);
		this.drawGeoSelectionLayers();
		this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	draw_Layers_β : function() {
		if (this.layers.sector){
			this.map.removeLayer(this.layers.sector);
		}
		if (!this.φλ0 || !this.geoCalc.α || !this.geoCalc.β)
			return;
		var Δβ = this.geoCalc.β / 2.0;
		this.geoCalc.α1 = (this.geoCalc.α - Δβ);
		this.geoCalc.α2 = (this.geoCalc.α + Δβ);
		if (Δβ > 180.0){
			this.geoCalc.α1 += 180.0;
			this.geoCalc.α2 -= 180.0;
		}
		this.layers.sector = L.sector({
			center: this.φλ0,
			innerRadius: 2.0,
			outerRadius: this.geoCalc.Δl_m,
			startBearing: this.geoCalc.α1,
			endBearing :this.geoCalc.α2,
			fill: true,
			fillColor:'#aa0000',
			fillOpacity: 0.3,
			color: '#ff0000',
			opacity: 0.1,
			weight: 1
		})
		.addEventListener('dragend', this.dragEnd_β, this)
		.addTo(this.map);
	},
	dragStart_β : function () {
		this.map.removeLayer(this.layers.sector);
	},
	dragEnd_β : function () {
		var ll = e.target.getLatLng();
		this.φλ1 = [ll.lat, ll.lng];
		this.draw_Layers_β();
	},
	drawGeoSelectionLayers : function (){ // Full drawing function for the object of image geodesical data
		this.draw_Layers_φλ0();
		this.draw_Layers_φλ1();
		this.draw_Layers_β();
	},
	onMapGeoSelectionClick : function (e) {
		var φλ = [e.latlng.lat, e.latlng.lng];
		if (!this.φλ0){
			this.set_φλ0(φλ, true);
			this.set_β(45.0, false);
		} else if (!this.φλ1) {
			this.set_φλ1(φλ, true);
		} else {
			var β = Math.abs(this.Δl_azimut(this.φλ0, φλ).α - this.geoCalc.α) * 2.0;
			this.set_β(β, true);
		}
		if (!this.φλ0)
			return;
		if (this.β){
			this.layers.φλ0.unbindTooltip();
			this.geoSelectionComplete();
		} else
			this.layers.φλ0.bindTooltip(!this.φλ1 ? this.marker_φλ0_mode1_tooltip : this.marker_φλ0_mode2_tooltip);
	},
	onMapMouseMove : function (e) {
		if (!this.φλ0)
			return;
		var φλ = [e.latlng.lat, e.latlng.lng];
		if (!this.φλ1)
			this.set_φλ1(φλ, false);
		else {
			var β = Math.abs(this.Δl_azimut(this.φλ0, φλ).α - this.geoCalc.α) * 2.0;
			this.set_β(β, false);
		}
	},
	onCentralMarkerClick : function (e) {
		if (!this.φλ0)
			return;
		this.geoSelectionComplete();
	},
	geoSelectionComplete : function (){
		this.map.removeEventListener('click', this.onMapGeoSelectionClick, this);		
		this.layers.φλ0.removeEventListener('dragstart', this.dragStart_φλ0, this);
		this.layers.φλ0.removeEventListener('dragend', this.dragEnd_φλ0, this);
		this.layers.φλ0.removeEventListener('mouseover');
		this.layers.φλ0.removeEventListener('mouseout');
		this.layers.φλ0.removeEventListener('click', this.onCentralMarkerClick, this);
		if (this.layers.φλ1){
			this.layers.φλ1.removeEventListener('dragstart', this.dragStart_φλ1, this);
			this.layers.φλ1.removeEventListener('dragend', this.dragEnd_φλ1, this);
			this.layers.φλ1.removeEventListener('mouseover');
			this.layers.φλ1.removeEventListener('mouseout');
   			this.map.removeLayer(this.layers.φλ1);
		}
        if (!this.φλ1 && this.layers.line_φλ0_φλ1)
			this.map.removeLayer(this.layers.line_φλ0_φλ1);
        if (!this.β && this.layers.sector)
			this.map.removeLayer(this.layers.sector);
		if (this.φλ0){
			this.layers.φλ0.remove();
			this.layers.φλ0.options.draggable = false;
			this.layers.φλ0.addTo(this.map);
		}
		if (!this.φλ1){
			this.geoCalc.φλ1 = null;
			this.geoCalc.Δl_m = null;
			this.geoCalc.α = null;
		}
		this.draw_Layers_β();
		delete this.geoCalc.φλ0;
		delete this.geoCalc.φλ1;
		delete this.geoCalc.β;
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);


		// Использование полученных данных
		// this.φλ0 - точка фотографа / художника
		// this.φλ1 - целевой / центральный объект
		// this.geoCalc.α - центральный азимут изображения
		// this.geoCalc.Δl_m - расстояние между точками в метрах по формуле гаверсинусов
		// this.β - угол обзора
		// this.geoCalc.α1 - начальный азимут обзора
		// this.geoCalc.α2 - конечный азимут обзора

		console.log('Результат выбора точек и угла обзора');
		console.log('основа' , this.φλ0);
		console.log('центр' , this.φλ1);
		console.log('обзор' , this.β);
		console.log(this.p.geoCalc);

		L.popup().setLatLng(this.φλ0)
			.setContent("Δl ≈" + (this.geoCalc.Δl_m ? this.geoCalc.Δl_m.toFixed(2) : null) + " м,</br> ∡ α≈" + (this.geoCalc.α ? this.geoCalc.α.toFixed(3) : null) + "°,</br> ⏿ β≈" + (this.β ? this.β.toFixed(3) : null) + "</br>Направление: " + this.geo_α(this.geoCalc.α))
			.openOn(this.map);
	},
	geo_α : function (α) { // Латинский индекс направления по значению азимутального угла
		return α ? this.dir[Math.floor(α/11.25)] : null;
	},
	Δl_azimut : function (φλ0, φλ1) { // Функция определения азимута линии из точки 0 в точку 1 и примерного расстояния
		function rad (x)
			{ return x * Math.PI/180; }
		var φ1 = rad (φλ0[0]); var λ1 = rad (φλ0[1]);
		var φ2 = rad (φλ1[0]); var λ2 = rad (φλ1[1]);
		var Δφ = rad (φλ1[0]-φλ0[0]);
		var Δλ = rad (φλ1[1]-φλ0[1]);

		var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
			  Math.cos(φ1) * Math.cos(φ2) *
			  Math.sin(Δλ/2) * Math.sin(Δλ/2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var y = Math.sin(λ2-λ1) * Math.cos(φ2);
		var x = Math.cos(φ1)*Math.sin(φ2) -
			  Math.sin(φ1)*Math.cos(φ2)*Math.cos(λ2-λ1);
		var θ = Math.atan2(y, x);

		const R_m = 6371e3; // r ♁
		return {
			Δl_m: R_m * c,
			α:(θ*180/Math.PI + 360) % 360 // °
		};
	}
};

