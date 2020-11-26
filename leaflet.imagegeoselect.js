function Pseudoobj () {}	Pseudoobj.prototype = { // оболочка псевдокласса
complete_test: function() {
		// Использование полученных данных
		// this.viewDir.φλ0 - точка фотографа / художника
		// this.viewDir.φλ1 - целевой / центральный объект
		// this.viewDir.geoCalc.α - центральный азимут изображения
		// this.viewDir.geoCalc.Δl_m - расстояние между точками в метрах по формуле гаверсинусов
		// this.viewDir.β - угол обзора
		// this.viewDir.geoCalc.α1 - начальный азимут обзора
		// this.viewDir.geoCalc.α2 - конечный азимут обзора

		console.log('Результат выбора точек и угла обзора');
		console.log('основа' , this.viewDir.φλ0);
		console.log('центр' , this.viewDir.φλ1);
		console.log('обзор' , this.viewDir.β);
		console.log(this.p.geoCalc);

		L.popup().setLatLng(this.viewDir.φλ0)
			.setContent("Δl ≈" + (this.viewDir.geoCalc.Δl_m ? this.viewDir.geoCalc.Δl_m.toFixed(2) : null) + " м,</br> ∡ α≈" + (this.viewDir.geoCalc.α ? this.viewDir.geoCalc.α.toFixed(3) : null) + "°,</br> ⏿ β≈" + (this.viewDir.β ? this.viewDir.β.toFixed(3) : null) + "</br>Направление: " + this.geo_α(this.viewDir.geoCalc.α))
			.openOn(this.map);
},
create: function (map) {
	this.map = map;
	this.p = {};
	this.point = {};
	this.point.dir = 'n';
// НАЧАЛО ФРАГМЕНТА ДЛЯ ВСТРАИВАНИЯ



	this.viewDir = {geoCalc: {}}; // Для хранения вычислимых параметров ракурса и обзора, в геодезической нотации
	this.direction_layers = {};
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
	this.marker_φλ0_tooltip = 'Это <b>точка съёмки</b>,</br> обозначаемая <b>φλ₀</b></br>Нажмите на значок для завершения, если</br>затруднительно определить направление вида';
	this.marker_φλ0_tooltip2 = 'Это <b>точка съёмки</b>,</br> обозначаемая <b>φλ₀</b></br>Нажмите на значок для завершения, если</br>затруднительно определить угол обзора';
	this.marker_φλ1_tooltip = 'Это <b>точка объекта на вертикальной оси</b> изображения,</br> обозначаемая <b>φλ₁</b></br>Нажмите на значок для завершения, если</br> затруднительно определить угол обзора';
	this.marker_β_tooltip = 'Эта <b>точка условный ограничитель угла обзора</b> изображения,</br> обозначаемого <b>β</b></br>Нажмите на значок для подтверждения выбора';

	this.addTooltipDelayed(); // Extended functional for tooltips for the main points
	this.drawGeoSelectionLayers(); // By current state of object if loaded from DB

	this.map.addEventListener('click', this.onMapGeoSelectionClick, this);
	this.map.addEventListener('mousemove', this.onMapMouseMove, this);	
	},
	get_e_φλ: function (e){ // get coordinates of event
		var ll = e.target.getLatLng();
		return [ll.lat, ll.lng];	
	},
	//// block of set functions for elements of image's geodesical data
	set_φλ0 : function (φλ0, stable) { // photographer's / artist point
		if (!φλ0){
			this.viewDir.φλ0 = null;
			this.viewDir.geoCalc = {};
			this.viewDir.geoCalc.φλ0 = null;
			this.set_φλ1(null);
			return;
		} else {
			this.viewDir.geoCalc.φλ0 = φλ0;
			if (stable)
				this.viewDir.φλ0 = φλ0;
			this.drawGeoSelectionLayers();
		}
	},
	set_φλ1 : function (φλ1, stable) { // point of object on geomertic center of the image
		if (!this.viewDir.φλ0)
			return;
		if (!φλ1){
			this.viewDir.φλ1 = null;
			this.viewDir.geoCalc.φλ1 = null;
			this.viewDir.geoCalc.Δl_m = null; // Distance between points φλ0 and φλ1
			this.viewDir.geoCalc.α = null;	// °, Geodezic azimuth from φλ0 to φλ1
			this.set_β(null);
			return;
		} else {
			this.viewDir.geoCalc.φλ1 = φλ1;
			if (stable)
				this.viewDir.φλ1 = φλ1;
			var rs = this.Δl_azimut(this.viewDir.geoCalc.φλ0, this.viewDir.geoCalc.φλ1);
			this.viewDir.geoCalc.α = rs.α;
			this.viewDir.geoCalc.Δl_m = rs.Δl_m;
			this.drawGeoSelectionLayers();
		}
	},
	set_β : function(β, stable, φλ) { // °, measure of observation
		if (!β){
			this.viewDir.β = null;
			this.viewDir.geoCalc.β = null;
			this.viewDir.geoCalc.α0 = null;
			this.viewDir.geoCalc.α1 = null;
			return;
		} else {
			this.viewDir.geoCalc.β = β;
			if (stable)
				this.viewDir.β = β;
			var Δβ = this.viewDir.β / 2.0;
			this.viewDir.geoCalc.α1 = (this.viewDir.geoCalc.α - Δβ);
			this.viewDir.geoCalc.α2 = (this.viewDir.geoCalc.α + Δβ);
			this.drawGeoSelectionLayers();
		}
		if (φλ)
			this.viewDir.geoCalc.φλ_ = φλ;
	},
	//// block for layers of elements of selection image's geodesical data
	draw_Layers_φλ0 : function() {
		if (this.direction_layers.φλ0)
			this.map.removeLayer(this.direction_layers.φλ0);
		if (this.direction_layers.sector)
			this.map.removeLayer(this.direction_layers.sector);
		if (this.direction_layers.β_marker)
			this.map.removeLayer(this.direction_layers.β_marker);
		if (!this.viewDir.geoCalc.φλ0)
			return;
		this.direction_layers.φλ0 = L.marker(
			this.viewDir.φλ0, {
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
			.addEventListener('click', this.on_φλ0_Click, this)
			.bindTooltipDelayed(this.viewDir.β ? null : (!this.viewDir.φλ1 ? this.marker_φλ0_tooltip : this.marker_φλ0_tooltip2))
			.addTo(this.map);
		if (this.point.dir){ // direction in old format -> unmoved pink sector
			var α = this.dir_α[this.point.dir];
			if (!α.isNaN && !this.direction_layers.old_dir)
				L.sector({
					center: this.viewDir.φλ0,
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
			L.polyline(
				[this.viewDir.geoCalc.φλ0, this.φλ_azimut(this.viewDir.geoCalc.φλ0, 250.0, α)], {
					color: '#f754e1',
					weight: 2,
					dashArray: '5, 8'
				}
			)
			.addTo(this.map);
			this.direction_layers.old_dir = true;
		}
	},
	dragStart_φλ0 : function (e) {
		console.log('grag start φλ0');
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
		if (this.direction_layers.sector)
			this.map.removeLayer(this.direction_layers.sector);
		if (this.direction_layers.β_marker)
			this.map.removeLayer(this.direction_layers.β_marker);
		if (this.direction_layers.line_φλ0_φλ1)
			this.map.removeLayer(this.direction_layers.line_φλ0_φλ1);
	},
	dragEnd_φλ0 : function (e) {
		console.log('grag end φλ0');
		var φλ0 = this.get_e_φλ(e);
		this.set_φλ0(φλ0, true);
		this.set_φλ1(this.viewDir.φλ1, true);
		this.set_β(this.viewDir.β, true, φλ0);
		this.map.removeLayer(this.direction_layers.φλ0);
		this.drawGeoSelectionLayers();
		this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	on_φλ0_Click : function (e) {
		if (!this.viewDir.φλ0)
			return;
		this.geoSelectionComplete();
	},
	draw_Layers_φλ1 : function() {
		if (this.direction_layers.φλ1){
			this.map.removeLayer(this.direction_layers.φλ1);
			if (this.direction_layers.line_φλ0_φλ1)
				this.map.removeLayer(this.direction_layers.line_φλ0_φλ1);
		}
		if (!this.viewDir.geoCalc.φλ1)
			return;
		this.direction_layers.φλ1 = L.marker(
			this.viewDir.geoCalc.φλ1, {
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
			.addEventListener('click', this.on_φλ1_Click, this)
			.bindTooltipDelayed(this.marker_φλ1_tooltip)
			.addTo(this.map);
		this.direction_layers.line_φλ0_φλ1 = L.polyline(
			[this.viewDir.geoCalc.φλ0, this.viewDir.geoCalc.φλ1], {
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
		// this.map.removeLayer(this.direction_layers.φλ0);
		this.map.removeLayer(this.direction_layers.line_φλ0_φλ1);
	},
	dragEnd_φλ1 : function (e) {
		console.log('grag end φλ1');
		this.set_φλ1(this.get_e_φλ(e), true);
		this.drawGeoSelectionLayers();
		this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	on_φλ1_Click : function (e) {		
		this.set_φλ1(this.get_e_φλ(e), true);
		if (!this.viewDir.φλ1)
			return;
		this.geoSelectionComplete();
	},
	draw_Layers_β : function(no_marker) {
		if (this.direction_layers.sector){
			this.map.removeLayer(this.direction_layers.sector);
		}
		if (this.direction_layers.β_marker)
			this.map.removeLayer(this.direction_layers.β_marker);
		if (!this.viewDir.φλ0 || !this.viewDir.geoCalc.α || !this.viewDir.geoCalc.β)
			return;
		var Δβ = this.viewDir.geoCalc.β / 2.0;
		this.viewDir.geoCalc.α1 = (this.viewDir.geoCalc.α - Δβ);
		this.viewDir.geoCalc.α2 = (this.viewDir.geoCalc.α + Δβ);
		if (Δβ > 180.0){
			this.viewDir.geoCalc.α1 += 180.0;
			this.viewDir.geoCalc.α2 -= 180.0;
		}
		this.direction_layers.sector = L.sector({
			center: this.viewDir.φλ0,
			innerRadius: 2.0,
			outerRadius: this.viewDir.geoCalc.Δl_m,
			startBearing: this.viewDir.geoCalc.α1,
			endBearing :this.viewDir.geoCalc.α2,
			fill: true,
			fillColor: this.viewDir.φλ1 ? '#aa0000' : '#000000',
			fillOpacity: 0.3,
			color: '#ff0000',
			opacity: 0.1,
			weight: 1
		})
		.addEventListener('dragend', this.dragEnd_β, this)
		.addTo(this.map);
		if (!this.viewDir.φλ1 || !this.viewDir.geoCalc.φλ_ || no_marker)
			return;
		var α_ = Math.abs(this.Δl_azimut(this.viewDir.φλ0, this.viewDir.geoCalc.φλ_).α);
		var φλ_β_marker = this.φλ_azimut(this.viewDir.φλ0, this.viewDir.geoCalc.Δl_m, -α_);
		this.direction_layers.β_marker = L.marker(
			φλ_β_marker, {
				draggable: true, // title: this.title,
				icon: L.icon.glyph({
					prefix: '',
					cssClass:'sans-serif',
					glyph: 'β'
				})
			})
			.addEventListener('dragstart', this.dragStart_β, this)
			.addEventListener('dragend', this.dragEnd_β, this)
			.addEventListener('mouseover', function (e) {
				this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
			}, this)
			.addEventListener('mouseout', function (e) {
				this.map.addEventListener('mousemove', this.onMapMouseMove, this);
			}, this)
			.addEventListener('click', this.on_β_marker_Click, this)
			.bindTooltipDelayed(this.marker_β_tooltip)
			.addTo(this.map);
	},
	dragStart_β : function (e) {
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
		this.map.removeLayer(this.direction_layers.sector);
	},
	dragEnd_β : function (e) {
		var β = Math.abs(this.Δl_azimut(this.viewDir.φλ0, this.get_e_φλ(e)).α - this.viewDir.geoCalc.α) * 2.0;

		this.set_β (β, true, this.get_e_φλ(e));
		this.draw_Layers_β();
		this.map.addEventListener('mousemove', this.onMapMouseMove, this);
	},
	on_β_marker_Click : function (e) {		
		this.geoSelectionComplete();
	},
	drawGeoSelectionLayers : function (){ // Full drawing function for the object of image geodesical data
		this.draw_Layers_φλ0();
		this.draw_Layers_φλ1();
		this.draw_Layers_β();
	},
	onMapGeoSelectionClick : function (e) {
		var φλ = [e.latlng.lat, e.latlng.lng];
		if (!this.viewDir.φλ0){
			this.set_φλ0(φλ, true);
			this.set_β(45.0, false);
		} else if (!this.viewDir.φλ1) {
			this.set_φλ1(φλ, true);
		} else {
			var β = Math.abs(this.Δl_azimut(this.viewDir.φλ0, φλ).α - this.viewDir.geoCalc.α) * 2.0;
			this.set_β(β, true, φλ);
		}
		if (!this.viewDir.φλ0)
			return;
		if (this.viewDir.β)
			this.geoSelectionComplete();
	},
	onMapMouseMove : function (e) {
		if (!this.viewDir.φλ0)
			return;
		var φλ = [e.latlng.lat, e.latlng.lng];
		if (!this.viewDir.φλ1)
			this.set_φλ1(φλ, false);
		else {
			var β = Math.abs(this.Δl_azimut(this.viewDir.φλ0, φλ).α - this.viewDir.geoCalc.α) * 2.0;
			this.set_β(β, false, φλ);
		}
	},
	geoSelectionComplete : function (){
		this.map.removeEventListener('mousemove', this.onMapMouseMove, this);
		this.map.removeEventListener('click', this.onMapGeoSelectionClick, this);
		this.direction_layers.φλ0.removeEventListener('dragstart', this.dragStart_φλ0, this)
			.removeEventListener('dragend', this.dragEnd_φλ0, this)
			.removeEventListener('mouseover')
			.removeEventListener('mouseout')
			.removeEventListener('click', this.on_φλ0_Click, this);
		if (this.direction_layers.φλ1){
			this.direction_layers.φλ1.removeEventListener('dragstart', this.dragStart_φλ1, this)
				.removeEventListener('dragend', this.dragEnd_φλ1, this)
				.removeEventListener('mouseover')
				.removeEventListener('mouseout');
				this.map.removeLayer(this.direction_layers.φλ1);
		}
		if (!this.viewDir.φλ1 && this.direction_layers.line_φλ0_φλ1)
			this.map.removeLayer(this.direction_layers.line_φλ0_φλ1);
		if (!this.viewDir.β && this.direction_layers.sector)
			this.map.removeLayer(this.direction_layers.sector);
		if (!this.viewDir.β && this.direction_layers.β_marker)
			this.map.removeLayer(this.direction_layers.β_marker);
		if (this.viewDir.φλ0){
			this.direction_layers.φλ0.remove();
			this.direction_layers.φλ0.options.draggable = false;
			this.direction_layers.φλ0.addTo(this.map);
		}
		if (!this.viewDir.φλ1){
			this.viewDir.geoCalc.φλ1 = null;
			this.viewDir.geoCalc.Δl_m = null;
			this.viewDir.geoCalc.α = null;
		}
		this.draw_Layers_β(true);

		delete this.viewDir.geoCalc.φλ0;
		delete this.viewDir.geoCalc.φλ1;
		delete this.viewDir.geoCalc.β;

		// Nomalize for geoJSON
		if (this.viewDir.φλ0){
			this.viewDir.type = 'LineString';
			if (this.viewDir.φλ1)
				this.viewDir.coordinates = [ this.viewDir.φλ0, this.viewDir.φλ1 ];
			else
				this.viewDir.coordinates = [ this.viewDir.φλ0 ];
			this.viewDir.viewAngle = Math.floor(this.viewDir.β);
		}

		if (this.viewDir.φλ0 && this.viewDir.φλ1 && this.viewDir.β){
			this.viewField = this.direction_layers.sector.toGeoJSON();
			// L.extend(this.viewField.properties, sector_prop_additional_obj)
		}
		this.complete_test(); // УДАЛИТЬ , ЭТО КОНЕЦ АЛГОРИТМА
	},
	geo_α : function (α) { // Latin letter for α
		return α ? this.dir[Math.floor(α/11.25)] : null;
	},
	Δl_azimut : function (φλ0, φλ1) { // From φλ0 to φλ1. Calculating azimuth α(φλ0,φλ1) and metrical Δl(φλ0,φλ1)
		function rad (x)
			{ return x * Math.PI/180.0; }
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
	},
	φλ_azimut : function (φλ0, Δl_m, α) { // From φλ0, Δl_m and α to φλ1. Calculating point by metrical distance and azimuth
		function rad (x)
			{ return x * Math.PI/180.0; }
		const R_m = 6371e3; // r ♁
		var φ0 = rad (φλ0[0]);
		var λ0 = rad (φλ0[1]);
		var α_rd = rad (α);
		var Δθ = Δl_m / R_m;
		var φ1 = Math.asin( Math.sin(φ0) * Math.cos(Δθ) + Math.cos(φ0) * Math.sin(Δθ) * Math.cos(α_rd) );
		if (Math.abs(Math.cos(φ1)) < 0.001)
			var λ1 = λ0;
		else
			var λ1 = ((λ0 - Math.asin( Math.sin(α_rd)* Math.sin(Δθ) / Math.cos(φ0) ) + Math.PI ) % (2*Math.PI) ) - Math.PI;
		φ1 = φ1/Math.PI*180.0;
		λ1 = λ1/Math.PI*180.0;
		return [φ1, λ1];
	},
	addTooltipDelayed: function () { // include delayed tooltips
	L.Layer.include({

		showDelay: 1000,
		hideDelay: 100,

		bindTooltipDelayed: function (content, options) {
	
				if (content instanceof L.Tooltip) {
					 L.setOptions(content, options);
					 this._tooltip = content;
					 content._source = this;
				} else {
					 if (!this._tooltip || options) {
						this._tooltip = new L.Tooltip(options, this);
					 }
					 this._tooltip.setContent(content);
	
				}
	
				this._initTooltipInteractionsDelayed();
	
				if (this._tooltip.options.permanent && this._map && this._map.hasLayer(this)) {
					 this.openTooltipWithDelay();
				}
	
				return this;
		},
	
		_openTooltipDelayed: function (e) {
				var layer = e.layer || e.target;
	
				if (!this._tooltip || !this._map) {
					 return;
				}
				this.openTooltipWithDelay(layer, this._tooltip.options.sticky ? e.latlng : undefined);
		},
	
		openTooltipDelayed: function (layer, latlng) {
				if (!(layer instanceof L.Layer)) {
					 latlng = layer;
					 layer = this;
				}
				if (layer instanceof L.FeatureGroup) {
					 for (var id in this._layers) {
						layer = this._layers[id];
						break;
					 }
				}
				if (!latlng) {
					 latlng = layer.getCenter ? layer.getCenter() : layer.getLatLng();
				}
				if (this._tooltip && this._map) {
					 this._tooltip._source = layer;
					 this._tooltip.update();
					 this._map.openTooltip(this._tooltip, latlng);
					 if (this._tooltip.options.interactive && this._tooltip._container) {
						addClass(this._tooltip._container, 'leaflet-clickable');
						this.addInteractiveTarget(this._tooltip._container);
					 }
				}
				if (typeof lastMouseEvent != 'undefined')
					layer.fireEvent('mousemove', lastMouseEvent);
	
				return this;
		},
		openTooltipWithDelay: function (t, i) {
				this._delay(this.openTooltipDelayed, this, this.showDelay, t, i);
		},
		closeTooltipDelayed: function () {
				if (this._tooltip) {
					 this._tooltip._close();
					 if (this._tooltip.options.interactive && this._tooltip._container) {
						removeClass(this._tooltip._container, 'leaflet-clickable');
						this.removeInteractiveTarget(this._tooltip._container);
					 }
				}
				return this;
		},
		closeTooltipWithDelay: function () {
				clearTimeout(this._timeout);
				this._delay(this.closeTooltipDelayed, this, this.hideDelay);
		},
		_delay: function (func, scope, delay, t, i) {
				var me = this;
				if (this._timeout) {
					 clearTimeout(this._timeout)
				}
				this._timeout = setTimeout(function () {
					 func.call(scope, t, i);
					 delete me._timeout
				}, delay)
		},
		_initTooltipInteractionsDelayed: function (remove$$1) {
				if (!remove$$1 && this._tooltipHandlersAdded) { return; }
				var onOff = remove$$1 ? 'off' : 'on',
					events = {
						 remove: this.closeTooltipWithDelay,
						 move: this._moveTooltip
					};
				if (!this._tooltip.options.permanent) {
					 events.mouseover = this._openTooltipDelayed;
					 events.mouseout = this.closeTooltipWithDelay;
					 events.click = this.closeTooltipWithDelay;
					 if (this._tooltip.options.sticky) {
						events.mousemove = this._moveTooltip;
					 }
					 if (L.touch) {
						events.click = this._openTooltipDelayed;
					 }
				} else {
					 events.add = this._openTooltipDelayed;
				}
				this[onOff](events);
				this._tooltipHandlersAdded = !remove$$1;
		}
	});
	}

// end of code block
};

