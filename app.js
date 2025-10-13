// app.js - Script commun pour toutes les pages
const TASKS_KEY = 'home_tasks_v1';
const COURSES_KEY = 'home_courses_v1';
const THEME_KEY = 'home_theme_v1';

// Données par défaut désormais vides (plus de données seed locales)
const DEFAULT_TASKS = [];
const DEFAULT_COURSES = [];

const CATEGORIES = ['Fruits', 'Légumes', 'Boulangerie', 'Épicerie', 'Boissons', 'Boucherie', 'Autres'];

// Gestion des données
function loadData() {
	const t = localStorage.getItem(TASKS_KEY);
	const c = localStorage.getItem(COURSES_KEY);
	let tasks = t ? JSON.parse(t) : DEFAULT_TASKS;
	let courses = c ? JSON.parse(c) : DEFAULT_COURSES;
	tasks.forEach(ensureTaskPeriodicity);
	return { tasks, courses };
}

function saveData(tasks, courses) {
	localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
	localStorage.setItem(COURSES_KEY, JSON.stringify(courses));
}

// Utilities
function nextId(list) {
	return list.length ? Math.max(...list.map(i => i.id)) + 1 : 1;
}

function msFromUnit(value, unit) {
	const v = Number(value) || 1;
	if (unit === 'hours') return v * 3600 * 1000;
	if (unit === 'days') return v * 24 * 3600 * 1000;
	return v * 24 * 3600 * 1000;
}

function progressPercent(task) {
	task = ensureTaskPeriodicity(task);
	const total = msFromUnit(task.periodicity.value, task.periodicity.unit) || 1;
	const elapsed = Date.now() - (task.lastDone || 0);
	const remaining = total - elapsed;
	const remainingDays = Math.ceil(remaining / (24 * 3600 * 1000));
	const progress = Math.min(100, Math.floor((elapsed / total) * 100));
	return { progress, remainingDays };
}

function ensureTaskPeriodicity(task) {
	if (!task.periodicity) {
		// migration locale ancienne structure (frequency) si existante
		if (task.frequency) {
			task.periodicity = { value: task.frequency.value, unit: task.frequency.unit };
			delete task.frequency;
		} else {
			task.periodicity = { value: 7, unit: 'days' };
		}
	}
	if (!task.lastDone) task.lastDone = Date.now() - 2*24*3600*1000;
	return task;
}

// Fonctions pour les tâches
function markTaskToggle(id) {
	const data = loadData();
	const task = data.tasks.find(t => t.id === id);
	if (task) {
		if (!task.finished) {
			task._prevLastDone = task.lastDone || 0;
			task.finished = true;
			task.lastDone = Date.now();
		} else {
			if (typeof task._prevLastDone !== 'undefined') {
				task.lastDone = task._prevLastDone;
				delete task._prevLastDone;
			}
			task.finished = false;
		}
		saveData(data.tasks, data.courses);
		if (typeof renderTasks === 'function') renderTasks();
		if (typeof renderHome === 'function') renderHome();
	}
}

function deleteTask(id) {
	const data = loadData();
	data.tasks = data.tasks.filter(t => t.id !== id);
	saveData(data.tasks, data.courses);
	if (typeof renderTasks === 'function') renderTasks();
	if (typeof renderHome === 'function') renderHome();
}

function resetTaskTimer(id) {
	const data = loadData();
	const task = data.tasks.find(t => t.id === id);
	if (task) {
		task.lastDone = Date.now();
		task.finished = false;
		if (typeof task._prevLastDone !== 'undefined') delete task._prevLastDone;
		saveData(data.tasks, data.courses);
		if (typeof renderTasks === 'function') renderTasks();
		if (typeof renderHome === 'function') renderHome();
	}
}

function addTaskFromForm(e) {
	e.preventDefault();
	const title = document.getElementById('t-title').value.trim();
	const periodValue = parseInt(document.getElementById('t-period').value);
	const room = document.getElementById('t-room').value;
	const data = loadData();
	const id = nextId(data.tasks);
	data.tasks.push({
		id,
		title,
		periodicity: { value: periodValue, unit: 'days' },
		room,
		lastDone: Date.now() - 1*24*3600*1000,
		finished: false
	});
	saveData(data.tasks, data.courses);
	if (typeof renderTasks === 'function') renderTasks();
	document.getElementById('task-form').reset();
}

// Fonctions pour les courses
function toggleBought(id) {
	const data = loadData();
	const item = data.courses.find(c => c.id === id);
	if (item) {
		item.bought = !item.bought;
		saveData(data.tasks, data.courses);
		if (typeof renderCourses === 'function') renderCourses();
		if (typeof renderHome === 'function') renderHome();
	}
}

function deleteCourse(id) {
	const data = loadData();
	data.courses = data.courses.filter(c => c.id !== id);
	saveData(data.tasks, data.courses);
	if (typeof renderCourses === 'function') renderCourses();
	if (typeof renderHome === 'function') renderHome();
}

function clearBought() {
	const data = loadData();
	data.courses = data.courses.filter(c => !c.bought);
	saveData(data.tasks, data.courses);
	if (typeof renderCourses === 'function') renderCourses();
	if (typeof renderHome === 'function') renderHome();
}

function addCourseFromForm(e) {
	e.preventDefault();
	const title = document.getElementById('c-title').value.trim();
	const quantity = document.getElementById('c-qty').value.trim();
	const category = document.getElementById('c-category').value;
	const note = document.getElementById('c-note').value.trim();
	if (!title) return;
	const data = loadData();
	const id = nextId(data.courses);
	data.courses.push({ id, title, quantity, category, note, bought: false });
	saveData(data.tasks, data.courses);
	if (typeof renderCourses === 'function') renderCourses();
	document.getElementById('course-form').reset();
}

/* === OVERRIDE addCourseFromForm (fix c_title undefined) === */
window.addCourseFromForm = async function(e){
	e.preventDefault();
	const titleEl = document.getElementById('c-title');
	const qtyEl   = document.getElementById('c-qty');
	const catEl   = document.getElementById('c-category');
	const noteEl  = document.getElementById('c-note');
	if(!titleEl) return;
	const title = titleEl.value.trim();
	if(!title) return;

	await createCourse({
		title,
		quantity: qtyEl ? qtyEl.value.trim() : '',
		category: catEl && catEl.value ? catEl.value : 'Autres',
		note: noteEl ? noteEl.value.trim() : '',
		bought:false
	});
	e.target.reset();
	if(typeof renderCourses==='function') await renderCourses(true);
	if(typeof renderHome==='function') renderHome();
};

// Gestion du thème
function applyTheme(mode) {
	if (mode === 'system') {
		document.documentElement.removeAttribute('data-theme');
	} else {
		document.documentElement.setAttribute('data-theme', mode);
	}
	localStorage.setItem(THEME_KEY, mode);
}

function initTheme() {
	const sel = document.getElementById('theme-select');
	if (!sel) return;
	
	const saved = localStorage.getItem(THEME_KEY) || 'system';
	sel.value = saved;
	applyTheme(saved);
	
	sel.addEventListener('change', e => applyTheme(e.target.value));
	
	// Répondre aux changements du système en mode 'system'
	const mq = window.matchMedia('(prefers-color-scheme: dark)');
	mq.addEventListener && mq.addEventListener('change', () => {
		if ((localStorage.getItem(THEME_KEY) || 'system') === 'system') {
			document.documentElement.removeAttribute('data-theme');
		}
	});
}

// Initialisation des catégories pour le formulaire des courses
function initCategories() {
	const sel = document.getElementById('c-category');
	if (!sel) return;
	
	sel.innerHTML = '';
	CATEGORIES.forEach(c => {
		const opt = document.createElement('option');
		opt.value = c;
		opt.textContent = c;
		sel.appendChild(opt);
	});
}

// Initialisation générale
function initApp() {
	initTheme();
	initCategories();
}

// Fonction pour le nettoyage automatique des repas (exécutée au chargement)
function cleanupOldMeals() {
	const MEALS_KEY = 'home_meals_v1';
	const meals = JSON.parse(localStorage.getItem(MEALS_KEY) || '[]');
	
	const getWeekOffset = (date) => {
		const startOfYear = new Date(date.getFullYear(), 0, 1);
		const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
		return Math.floor(days / 7);
	};
	
	const currentWeek = getWeekOffset(new Date());
	const updatedMeals = meals.filter(meal => {
		const mealWeek = currentWeek + (meal.weekOffset || 0);
		// Garder les repas de la semaine actuelle et la suivante
		return mealWeek >= currentWeek && mealWeek <= currentWeek + 1;
	});
	
	if (updatedMeals.length !== meals.length) {
		localStorage.setItem(MEALS_KEY, JSON.stringify(updatedMeals));
	}
}

// Exécuter le nettoyage au chargement de l'app
document.addEventListener('DOMContentLoaded', cleanupOldMeals);

/* ================== METEO (Open-Meteo) ================== */
const WEATHER_CACHE_KEY = 'home_weather_cache_v1';
const WEATHER_CACHE_TTL = 15 * 60 * 1000; // 15 min

const WEATHER_CODE_MAP = {
	0: "Ciel dégagé",
	1: "Principalement clair",
	2: "Partiellement nuageux",
	3: "Couvert",
	45: "Brouillard",
	48: "Brouillard givrant",
	51: "Bruine légère",
	53: "Bruine modérée",
	55: "Bruine dense",
	56: "Bruine verglaçante légère",
	57: "Bruine verglaçante dense",
	61: "Pluie faible",
	63: "Pluie modérée",
	65: "Pluie forte",
	66: "Pluie verglaçante légère",
	67: "Pluie verglaçante forte",
	71: "Neige faible",
	73: "Neige modérée",
	75: "Neige forte",
	77: "Grains de neige",
	80: "Averses faibles",
	81: "Averses modérées",
	82: "Averses fortes",
	85: "Averses de neige faible",
	86: "Averses de neige fortes",
	95: "Orages",
	96: "Orages grêle léger",
	99: "Orages grêle fort"
};

function getCachedWeather() {
	const raw = localStorage.getItem(WEATHER_CACHE_KEY);
	if (!raw) return null;
	try {
		const data = JSON.parse(raw);
		if (Date.now() - data.timestamp < WEATHER_CACHE_TTL) return data.payload;
	} catch(e){}
	return null;
}

async function fetchWeatherData(lat, lon) {
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
	const r = await fetch(url);
	if(!r.ok) throw new Error('Weather fetch error');
	return await r.json();
}

async function resolveLocation(query = null) {
	// Si pas de query on tente géolocalisation
	return new Promise((resolve) => {
		if (query) {
			fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=fr`)
				.then(r=>r.json()).then(j=>{
					if(j && j.results && j.results.length){
						const g = j.results[0];
						resolve({ name: g.name, lat: g.latitude, lon: g.longitude, country: g.country });
					} else resolve(null);
				}).catch(()=>resolve(null));
		} else if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				pos => resolve({ name: 'Position actuelle', lat: pos.coords.latitude, lon: pos.coords.longitude, country:'' }),
				()=> resolve({ name:'Paris', lat:48.8566, lon:2.3522, country:'France' })
			);
		} else {
			resolve({ name:'Paris', lat:48.8566, lon:2.3522, country:'France' });
		}
	});
}

function weatherIcon(code){
	// Icône simple (emoji) fallback rapide
	if([0].includes(code)) return "☀️";
	if([1,2].includes(code)) return "🌤️";
	if([3].includes(code)) return "☁️";
	if([45,48].includes(code)) return "🌫️";
	if([51,53,55,56,57].includes(code)) return "🌦️";
	if([61,63,65,80,81,82].includes(code)) return "🌧️";
	if([71,73,75,77,85,86].includes(code)) return "❄️";
	if([95,96,99].includes(code)) return "⛈️";
	return "🌡️";
}

async function loadWeather(force=false){
	if(!force){
		const cached = getCachedWeather();
		if(cached) return cached;
	}
	const loc = await resolveLocation();
	if(!loc) throw new Error('Location error');
	const data = await fetchWeatherData(loc.lat, loc.lon);
	const payload = { loc, data };
	localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), payload }));
	return payload;
}

function renderWeather(containerId){
	const el = document.getElementById(containerId);
	if(!el) return;
	el.innerHTML = '<div class="weather-loading">Chargement météo...</div>';
	loadWeather().then(({loc, data})=>{
		const c = data.current;
		const daily = data.daily;
		const descToday = WEATHER_CODE_MAP[c.weather_code] || 'N/A';
		const todayMax = Math.round(daily.temperature_2m_max[0]);
		const tomorrowMax = Math.round(daily.temperature_2m_max[1]);
		const descTomorrow = WEATHER_CODE_MAP[daily.weather_code[1]] || '';
		const iconToday = weatherIcon(c.weather_code);

		// Compact home variant
		if(containerId === 'home-weather'){
			el.innerHTML = `
				<div class="weather-compact">
					<div class="wc-header">
						<h2 class="wc-title">MÉTÉO</h2>
						<a href="weather.html" class="wc-btn">DÉTAILS →</a>
					</div>
					<div class="wc-block wc-today">
						<div class="wc-icon">${iconToday}</div>
						<div class="wc-info">
							<div class="wc-line"><span>Aujourd'hui</span><strong>${todayMax}°C</strong></div>
							<div class="wc-desc">${descToday}</div>
							<div class="wc-loc">${loc.name}${loc.country?', '+loc.country:''}</div>
						</div>
					</div>
					<div class="wc-block wc-next">
						<div class="wc-line"><span>Demain</span><strong>${tomorrowMax}°C</strong></div>
						<div class="wc-desc">${descTomorrow}</div>
					</div>
				</div>
			`;
			return;
		}

		// === Widget complet (page weather.html) ===
		const hourly = data.hourly;
		const desc = descToday;
		const icon = iconToday;

		// Si pas d'heure future trouvée, utiliser index 0
		let nowIndex = hourly.time.findIndex(t => new Date(t).getTime() >= Date.now());
		if(nowIndex === -1) nowIndex = 0;

		const hoursSlice = hourly.time.slice(nowIndex, nowIndex+6);
		const hourTemps = hourly.temperature_2m.slice(nowIndex, nowIndex+6);
		const hourCodes = hourly.weather_code.slice(nowIndex, nowIndex+6);

		let hoursHtml = hoursSlice.map((t,i)=>{
			const dt = new Date(t);
			const hh = dt.getHours().toString().padStart(2,'0')+'h';
			return `<div class="wh-hour">
				<div>${hh}</div>
				<div class="wh-ico">${weatherIcon(hourCodes[i])}</div>
				<div class="wh-temp">${Math.round(hourTemps[i])}°</div>
			</div>`;
		}).join('');

		let next2Days = '';
		for(let i=0;i<2;i++){
			const code = daily.weather_code[i];
			const tmax = Math.round(daily.temperature_2m_max[i]);
			const tmin = Math.round(daily.temperature_2m_min[i]);
			const dayLabel = i===0?'Aujourd\'hui': i===1?'Demain':'Jour '+(i+1);
			next2Days += `<div class="wh-day">
				<span class="wh-day-name">${dayLabel}</span>
				<span class="wh-day-ico">${weatherIcon(code)}</span>
				<span class="wh-day-temp">${tmin}° / ${tmax}°</span>
			</div>`;
		}

		el.innerHTML = `
			<div class="weather-widget">
				<div class="ww-header">
					<div>
						<div class="ww-location">${icon} ${loc.name}${loc.country? ', '+loc.country:''}</div>
						<div class="ww-desc">${desc}</div>
					</div>
					<div class="ww-temp-main">${Math.round(c.temperature_2m)}°</div>
				</div>
				<div class="ww-stats">
					<div><span>Ressenti</span><strong>${Math.round(c.apparent_temperature)}°</strong></div>
					<div><span>Humidité</span><strong>${c.relative_humidity_2m}%</strong></div>
					<div><span>Vent</span><strong>${Math.round(c.wind_speed_10m)} km/h</strong></div>
				</div>
				<div class="ww-days">${next2Days}</div>
				<div class="ww-hours">${hoursHtml}</div>
				<button class="btn ww-refresh" onclick="forceRefreshWeather('${containerId}')"><span>↻ Actualiser</span></button>
			</div>
		`;
		// STYLE SPÉCIAL ACCUEIL
		if(containerId === 'home-weather'){
			const w = el.querySelector('.weather-widget');
			if(w) w.classList.add('weather-home');
		}
	}).catch(()=>{
		el.innerHTML = '<div class="weather-error">Impossible de charger la météo.</div>';
	});
}

function forceRefreshWeather(containerId){
	localStorage.removeItem(WEATHER_CACHE_KEY);
	renderWeather(containerId);
}

/* ===== SIDEBAR RESPONSIVE ===== */
function toggleSidebar(open){
	const sidebar = document.querySelector('.sidebar');
	const overlay = document.getElementById('sidebar-overlay');
	if(!sidebar) return;
	const willOpen = (typeof open === 'boolean') ? open : !sidebar.classList.contains('sidebar--open');
	if(willOpen){
		sidebar.classList.add('sidebar--open');
		overlay && overlay.classList.add('active');
		document.body.classList.add('no-scroll');
	} else {
		sidebar.classList.remove('sidebar--open');
		overlay && overlay.classList.remove('active');
		document.body.classList.remove('no-scroll');
	}
}

function initResponsiveSidebar(){
	const overlay = document.getElementById('sidebar-overlay');
	overlay && overlay.addEventListener('click', ()=>toggleSidebar(false));
	document.addEventListener('keyup', e=>{
		if(e.key === 'Escape') toggleSidebar(false);
	});
	window.addEventListener('resize', ()=>{
		if(window.innerWidth > 900){
			toggleSidebar(false);
			const overlay = document.getElementById('sidebar-overlay');
			overlay && overlay.classList.remove('active');
		}
	});
	// auto-hide on load if small
	if(window.innerWidth <= 900){
		const sb = document.querySelector('.sidebar');
		sb && sb.classList.remove('sidebar--open');
	}
}

document.addEventListener('DOMContentLoaded', initResponsiveSidebar);
window.toggleSidebar = toggleSidebar;

/* ===== SUPABASE (GitHub Pages) ===== */
// Inclure dans chaque page AVANT app.js:
// <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
const SUPABASE_URL = 'https://krvjftzgfqloxuxcncms.supabase.co'; // <-- remplacer
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtydmpmdHpnZnFsb3h1eGNuY21zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MDE4MTEsImV4cCI6MjA3NDM3NzgxMX0.XiFQDOX2w7LDWwiQLlZRnVlOc-2J9z-GYSo82-YkOCI';            // <-- remplacer
let supabaseClient = null;
if (window.supabase) {
	supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
	console.warn('Supabase library not loaded (ajoute le script CDN avant app.js)');
}

/* ===== (Ancienne API PHP désactivée) ===== */
// const API_BASE = 'backend/api.php'; // obsolète sur GitHub Pages

/* ===== Data layer via Supabase (avec fallback localStorage) ===== */
async function fetchTasks(){
	if(!supabaseClient) { const d = loadData(); return d.tasks; }
	const { data, error } = await supabaseClient
		.from('tasks')
		.select('*')
		.order('created_at',{ ascending:false });
	if(error){
		console.warn('tasks fallback local', error);
		const d = loadData(); return d.tasks;
	}
	return data.map(r=>({
		id: r.id,
		title: r.title,
		periodicity: { value: r.period_value, unit: r.period_unit }, // <== nouveau
		room: r.room,
		lastDone: r.last_done ? Date.parse(r.last_done) : Date.now(),
		finished: !!r.finished
	}));
}

async function fetchCourses(){
	if(!supabaseClient){ const d = loadData(); return d.courses; }
	const { data, error } = await supabaseClient
		.from('courses')
		.select('*')
		.order('created_at',{ ascending:false });
	if(error){ console.warn('courses fallback local', error); const d = loadData(); return d.courses; }
	return data.map(r=>({
		id:r.id,
		title:r.title,
		quantity:r.quantity,
		category:r.category,
		note:r.note,
		bought:!!r.bought
	}));
}

async function fetchMeals(){
	if(!supabaseClient) return [];
	const { data, error } = await supabaseClient
		.from('meals')
		.select('*')
		.order('date_key',{ ascending:true }); // Tri par date_key au lieu de id
	if(error){ console.warn('meals error', error); return []; }
	
	const now = new Date();
	const mon = mondayOf(now);
	const nextMon = new Date(mon); nextMon.setDate(mon.getDate()+7);
	const weekAfter = new Date(mon); weekAfter.setDate(mon.getDate()+14);
	
	return (data||[])
		.filter(r => r.date_key) // Ignorer les anciens sans date_key
		.map(r=>{
			const m = { ...r };
			const dt = dateFromDateKey(m.date_key);
			
			// Dériver day et week_offset pour compatibilité UI
			let week_offset = -1; // par défaut = passé
			if(dt >= mon && dt < nextMon) week_offset = 0;
			else if(dt >= nextMon && dt < weekAfter) week_offset = 1;
			
			m.day = MEALS_DAYS[(dt.getDay()+6)%7]; // 0=lundi
			m.week_offset = week_offset;
			return m;
		})
		.filter(m => m.week_offset >= 0 && m.week_offset <= 1); // Vue 2 semaines
}

async function loadDataAsync(){
	const [tasks, courses] = await Promise.all([fetchTasks(), fetchCourses()]);
	return { tasks, courses };
}

/* ===== CRUD TASKS (Supabase) ===== */
async function createTask(task){
	if(!supabaseClient) return;
	task = ensureTaskPeriodicity(task);
	await supabaseClient.from('tasks').insert([{
		title: task.title,
		period_value: task.periodicity.value,
		period_unit: task.periodicity.unit,
		room: task.room,
		last_done: new Date(task.lastDone).toISOString(),
		finished: task.finished
	}]);
}
async function updateTask(task){
	if(!supabaseClient) return;
	task = ensureTaskPeriodicity(task);
	await supabaseClient.from('tasks').update({
		title: task.title,
		period_value: task.periodicity.value,
		period_unit: task.periodicity.unit,
		room: task.room,
		last_done: new Date(task.lastDone).toISOString(),
		finished: task.finished
	}).eq('id', task.id);
}
async function removeTask(id){
	if(!supabaseClient) return;
	await supabaseClient.from('tasks').delete().eq('id', id);
}

/* Hooks réécrits (UUID) */
addTaskFromForm = async function(e){
	e.preventDefault();
	const title = document.getElementById('t-title').value.trim();
	const periodValue = parseInt(document.getElementById('t-period').value);
	const room = document.getElementById('t-room').value;
	if(!title) return;
	await createTask({
		title,
		periodicity:{ value: periodValue, unit:'days' },
		room,
		lastDone: Date.now(),
		finished:false
	});
	if(typeof renderTasks==='function') renderTasks(true);
	if(typeof renderHome==='function') renderHome();
	e.target.reset();
};

markTaskToggle = async function(id){
	const tasks = await fetchTasks();
	const t = tasks.find(x=>x.id===id);
	if(!t) return;
	t.finished = !t.finished;
	t.lastDone = Date.now();
	await updateTask(t);
	if(typeof renderTasks==='function') renderTasks(true);
	if(typeof renderHome==='function') renderHome();
};

deleteTask = async function(id){
	await removeTask(id);
	if(typeof renderTasks==='function') renderTasks(true);
	if(typeof renderHome==='function') renderHome();
};

resetTaskTimer = async function(id){
	const tasks = await fetchTasks();
	const t = tasks.find(x=>x.id===id);
	if(!t) return;
	t.lastDone = Date.now();
	t.finished = false;
	await updateTask(t);
	if(typeof renderTasks==='function') renderTasks(true);
	if(typeof renderHome==='function') renderHome();
};

/* ===== COURSES CRUD (Supabase) ===== */
async function createCourse(item){
	if(!supabaseClient) return;
	await supabaseClient.from('courses').insert([item]);
}
async function updateCourse(item){
	if(!supabaseClient) return;
	await supabaseClient.from('courses').update(item).eq('id', item.id);
}
async function deleteCourseApi(id){
	if(!supabaseClient) return;
	await supabaseClient.from('courses').delete().eq('id', id);
}

toggleBought = async function(id){
	const list = await fetchCourses();
	const it = list.find(c=>c.id===id);
	if(!it) return;
	it.bought = !it.bought;
	await updateCourse(it);
	if(typeof renderCourses==='function') renderCourses(true);
	if(typeof renderHome==='function') renderHome();
};
deleteCourse = async function(id){
	await deleteCourseApi(id);
	if(typeof renderCourses==='function') renderCourses(true);
	if(typeof renderHome==='function') renderHome();
};
clearBought = async function(){
	const list = await fetchCourses();
	for(const it of list.filter(i=>i.bought)){
		await deleteCourseApi(it.id);
	}
	if(typeof renderCourses==='function') renderCourses(true);
	if(typeof renderHome==='function') renderHome();
};
addCourseFromForm = async function(e){
	e.preventDefault();
	const titleEl = document.getElementById('c-title');
	const qtyEl   = document.getElementById('c-qty');
	const catEl   = document.getElementById('c-category');
	const noteEl  = document.getElementById('c-note');
	if(!titleEl) return;
	const title = titleEl.value.trim();
	if(!title) return;

	await createCourse({
		title,
		quantity: qtyEl ? qtyEl.value.trim() : '',
		category: catEl && catEl.value ? catEl.value : 'Autres',
		note: noteEl ? noteEl.value.trim() : '',
		bought:false
	});
	e.target.reset();
	if(typeof renderCourses==='function') await renderCourses(true);
	if(typeof renderHome==='function') renderHome();
};

/* ===== MEALS CRUD (Supabase) - Système pur date_key ===== */
async function createMeal(day,moment,meal,week_offset){
	if(!supabaseClient) return;
	const date_key = computeDateKeyFromForm(day, week_offset ?? 0);
	await supabaseClient.from('meals').insert([{ moment, meal, date_key }]);
}

async function updateMeal(id,day,moment,meal,week_offset){
	if(!supabaseClient) return;
	const date_key = computeDateKeyFromForm(day, week_offset ?? 0);
	await supabaseClient.from('meals').update({ moment, meal, date_key }).eq('id', id);
}

async function deleteMealApi(id){
	if(!supabaseClient) return;
	await supabaseClient.from('meals').delete().eq('id', id);
}

/* === Rollover hebdomadaire === */
const MEALS_ROLLOVER_KEY = 'meals_rollover_weekkey_v1';
async function weeklyRolloverMeals(){
	if(!supabaseClient) return;
	
	const now = new Date();
	const mon = mondayOf(now);
	const currentWeekKey = dateKeyFromDate(mon);
	const lastKey = localStorage.getItem(MEALS_ROLLOVER_KEY);
	if(lastKey === currentWeekKey) return; // déjà traité

	// Nettoyage: supprimer repas > 2 semaines
	const twoWeeksAgo = new Date(mon);
	twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
	const cutoffKey = dateKeyFromDate(twoWeeksAgo);
	
	await supabaseClient
		.from('meals')
		.delete()
		.lt('date_key', cutoffKey);

	localStorage.setItem(MEALS_ROLLOVER_KEY, currentWeekKey);
}

/* ===== Helpers date_key (repas) - À définir AVANT fetchMeals ===== */
const MEALS_DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const DAY_INDEX = { lundi:0, mardi:1, mercredi:2, jeudi:3, vendredi:4, samedi:5, dimanche:6 };

function pad2(n){ return n.toString().padStart(2,'0'); }
function dateKeyFromDate(d){
	const x = new Date(d); x.setHours(0,0,0,0);
	return `${pad2(x.getDate())}${pad2(x.getMonth()+1)}${x.getFullYear()}`;
}
function dateFromDateKey(k){
	// k = 'DDMMYYYY'
	const dd = parseInt(k.slice(0,2),10);
	const mm = parseInt(k.slice(2,4),10);
	const yyyy = parseInt(k.slice(4,8),10);
	const d = new Date(yyyy, mm-1, dd);
	d.setHours(0,0,0,0);
	return d;
}
// Lundi de la semaine de 'base'
function mondayOf(base=new Date()){
	const d = new Date(base);
	const js = d.getDay(); // 0=dim,1=lun
	const delta = js===0 ? -6 : (1-js);
	d.setHours(0,0,0,0);
	d.setDate(d.getDate()+delta);
	return d;
}
// Déduit date_key à partir du (jour, week_offset) sélectionnés dans l'UI
function computeDateKeyFromForm(day, week_offset=0){
	const mon = mondayOf(new Date());
	const d = new Date(mon);
	d.setDate(d.getDate() + (week_offset*7) + (DAY_INDEX[day] ?? 0));
	return dateKeyFromDate(d);
}

/* ================== RENDU ACCUEIL (TASKS, COURSES, MEALS) ================== */
/* Conteneurs attendus dans index.html :
   <div id="home-tasks-list"></div>
   <div id="home-courses-list"></div>
   <div id="home-upcoming-meals"></div>
*/

async function renderHomeTasks(){
	const box = document.getElementById('home-tasks-list');
	if(!box) return;
	box.innerHTML = '<div class="small">Chargement des tâches...</div>';
	const tasks = await fetchTasks();
	const active = tasks.filter(t=>!t.finished);
	if(!active.length){
		box.innerHTML = '<div class="small"><em>Aucune tâche en cours.</em></div>';
		return;
	}
	const enriched = active.map(t=>{
		const { progress, remainingDays } = progressPercent(t);
		return { t, progress, remainingDays };
	}).sort((a,b)=> a.remainingDays - b.remainingDays);

	box.innerHTML = '';
	enriched.slice(0,3).forEach(({t,progress,remainingDays})=>{ // <-- 3 tâches max
		const row = document.createElement('div');
		row.className = 'home-task-row';
		row.innerHTML = `
			<div class="home-task-main">
				<strong>${t.title}</strong>
				<span class="home-task-meta">${remainingDays<=0?'À faire maintenant':('Restant: '+remainingDays+'j')}</span>
			</div>
			<div class="home-task-bar">
				<div class="home-task-bar-fill" style="width:${progress}%;"></div>
			</div>
			<div class="home-task-actions">
				<button class="btn-small" style="padding:4px 6px;font-size:.65rem;" onclick="markTaskToggle(${t.id})">✔</button>
			</div>
		`;
		box.appendChild(row);
	});
}

async function renderHomeCourses(){
	const box = document.getElementById('home-courses-list');
	if(!box) return;
	box.innerHTML = '<div class="small">Chargement des courses...</div>';
	const courses = await fetchCourses();
	const pending = courses.filter(c=>!c.bought);
	if(!pending.length){
		box.innerHTML = '<div class="small"><em>Aucun article à acheter.</em></div>';
		return;
	}
	// Regrouper par catégorie
	const groups = {};
	pending.forEach(c=>{ (groups[c.category||'Autres'] = groups[c.category||'Autres'] || []).push(c); });
	const orderedCats = Object.keys(groups).sort();
	box.innerHTML = '';
	let shown = 0;
	for(const cat of orderedCats){
		if(shown >= 4) break; // <-- max 4 articles
		const catBlock = document.createElement('div');
		catBlock.className = 'home-course-cat';
		catBlock.innerHTML = `<div class="home-course-cat-title">${cat}</div>`;
		for(const it of groups[cat]){
			if(shown >= 4) break;
			const line = document.createElement('div');
			line.className = 'home-course-item';
			line.innerHTML = `
				<label class="home-course-check">
					<input type="checkbox" onchange="toggleBought(${it.id})">
					<span>${it.title}${it.quantity? ' ('+it.quantity+')':''}</span>
				</label>
			`;
			catBlock.appendChild(line);
			shown++;
		}
		box.appendChild(catBlock);
	}
}

/* === HOMEPAGE UPCOMING === */
const MEAL_MOMENT_ORDER = { midi:0, soir:1 };
let MEALS_CACHE_SUP = { ts:0, data:[] };
const MEALS_CACHE_TTL = 30_000;

async function getMealsCached(){
	if(Date.now() - MEALS_CACHE_SUP.ts < MEALS_CACHE_TTL) return MEALS_CACHE_SUP.data;
	const rows = await fetchMeals();        // utilise déjà Supabase
	MEALS_CACHE_SUP = { ts:Date.now(), data:rows };
	return rows;
}

function mondayOfWeek(base = new Date()){
	const d = new Date(base);
	const jsDay = d.getDay(); // 0=dim
	const delta = jsDay === 0 ? -6 : (1 - jsDay);
	d.setHours(0,0,0,0);
	d.setDate(d.getDate()+delta);
	return d;
}

function mealToDate(meal){
	if(meal.date_key){
		return dateFromDateKey(meal.date_key);
	}
	// fallback legacy (day + week_offset)
	const baseMonday = mondayOfWeek();
	const dayIndex = MEALS_DAYS.indexOf(meal.day);
	if(dayIndex < 0) return null;
	const dt = new Date(baseMonday);
	dt.setDate(dt.getDate() + (meal.week_offset||0)*7 + dayIndex);
	dt.setHours(meal.moment === 'midi' ? 11 : 18, 0, 0, 0);
	return dt;
}

function formatFrDateLabel(iso){
	const d = new Date(iso);
	const opts = { weekday:'long', day:'numeric', month:'short' };
	let label = d.toLocaleDateString('fr-FR', opts);
	label = label.charAt(0).toUpperCase()+label.slice(1);
	const today = new Date(); today.setHours(0,0,0,0);
	if(d.getTime() === today.getTime()) label += " (Aujourd'hui)";
	return label;
}

async function renderHomeMeals(){
	const container = document.getElementById('home-upcoming-meals');
	if(!container) return;
	container.innerHTML = '<div class="home-meal-date">Chargement des repas...</div>';
	const meals = await getMealsCached();
	const { byDay, order } = groupUpcomingMeals(meals, 2); // <-- 2 jours seulement
	if(!order.length){
		container.innerHTML = '<div class="home-meal-date"><em>Aucun repas planifié.</em></div>';
		return;
	}
	container.innerHTML = '';
	order.forEach(dayIso=>{
		const block = document.createElement('div');
		block.className='home-meal-date';
		const header = document.createElement('div');
		header.className='home-meal-date-header';
		if(new Date(dayIso).toDateString() === new Date().toDateString()) header.classList.add('today');
		header.textContent = formatFrDateLabel(dayIso);
		block.appendChild(header);
		byDay[dayIso].forEach(m=>{
			const line = document.createElement('div');
			line.className='home-meal-item';
			line.innerHTML = `
				<div class="home-meal-moment">${m.moment === 'midi' ? 'Midi' : 'Soir'}</div>
				<div class="home-meal-text">${m.meal}</div>
			`;
			block.appendChild(line);
		});
		container.appendChild(block);
	});
}

/* Rendu accueil global (sécurise les appels existants) */
async function renderHome(force=false){
	// ...tu peux ajouter d'autres rendus (tâches, courses) si nécessaires...
	await renderHomeMeals();
}
window.renderHomeMeals = renderHomeMeals;
window.renderHome = renderHome;

// Relance après opérations modifiant les repas
async function refreshMealsHomeIfNeeded(){
	if(document.getElementById('home-upcoming-meals')) renderHomeMeals();
}
window.addEventListener('focus', refreshMealsHomeIfNeeded);

// Hook: quand repas modifiés dans d’autres pages, ces fonctions existent déjà (repas.html utilise createMeal/updateMeal/delete)
const _origCreateMeal = window.createMeal;
window.createMeal = async (...args)=>{ await _origCreateMeal(...args); MEALS_CACHE_SUP.ts=0; refreshMealsHomeIfNeeded(); };
const _origUpdateMeal = window.updateMeal;
window.updateMeal = async (...args)=>{ await _origUpdateMeal(...args); MEALS_CACHE_SUP.ts=0; refreshMealsHomeIfNeeded(); };
const _origDeleteMealApi = window.deleteMealApi;
window.deleteMealApi = async (...args)=>{ await _origDeleteMealApi(...args); MEALS_CACHE_SUP.ts=0; refreshMealsHomeIfNeeded(); };

// Initialisation: s’assurer que l’accueil se remplit si présent
document.addEventListener('DOMContentLoaded', ()=>{ if(document.getElementById('home-upcoming-meals')) renderHomeMeals(); });

/* === HOMEPAGE TASKS & COURSES === */
/* Conteneurs attendus dans index.html :
   <div id="home-tasks-list"></div>
   <div id="home-courses-list"></div>
*/

async function renderHomeTasks(){
	const box = document.getElementById('home-tasks-list');
	if(!box) return;
	box.innerHTML = '<div class="small">Chargement des tâches...</div>';
	const tasks = await fetchTasks();
	const active = tasks.filter(t=>!t.finished);
	if(!active.length){
		box.innerHTML = '<div class="small"><em>Aucune tâche en cours.</em></div>';
		return;
	}
	const enriched = active.map(t=>{
		const { progress, remainingDays } = progressPercent(t);
		return { t, progress, remainingDays };
	}).sort((a,b)=> a.remainingDays - b.remainingDays);

	box.innerHTML = '';
	enriched.slice(0,3).forEach(({t,progress,remainingDays})=>{ // <-- 3 tâches max
		const row = document.createElement('div');
		row.className = 'home-task-row';
		row.innerHTML = `
			<div class="home-task-main">
				<strong>${t.title}</strong>
				<span class="home-task-meta">${remainingDays<=0?'À faire maintenant':('Restant: '+remainingDays+'j')}</span>
			</div>
			<div class="home-task-bar">
				<div class="home-task-bar-fill" style="width:${progress}%;"></div>
			</div>
			<div class="home-task-actions">
				<button class="btn-small" style="padding:4px 6px;font-size:.65rem;" onclick="markTaskToggle(${t.id})">✔</button>
			</div>
		`;
		box.appendChild(row);
	});
}

async function renderHomeCourses(){
	const box = document.getElementById('home-courses-list');
	if(!box) return;
	box.innerHTML = '<div class="small">Chargement des courses...</div>';
	const courses = await fetchCourses();
	const pending = courses.filter(c=>!c.bought);
	if(!pending.length){
		box.innerHTML = '<div class="small"><em>Aucun article à acheter.</em></div>';
		return;
	}
	// Regrouper par catégorie
	const groups = {};
	pending.forEach(c=>{ (groups[c.category||'Autres'] = groups[c.category||'Autres'] || []).push(c); });
	const orderedCats = Object.keys(groups).sort();
	box.innerHTML = '';
	let shown = 0;
	for(const cat of orderedCats){
		if(shown >= 4) break; // <-- max 4 articles
		const catBlock = document.createElement('div');
		catBlock.className = 'home-course-cat';
		catBlock.innerHTML = `<div class="home-course-cat-title">${cat}</div>`;
		for(const it of groups[cat]){
			if(shown >= 4) break;
			const line = document.createElement('div');
			line.className = 'home-course-item';
			line.innerHTML = `
				<label class="home-course-check">
					<input type="checkbox" onchange="toggleBought(${it.id})">
					<span>${it.title}${it.quantity? ' ('+it.quantity+')':''}</span>
				</label>
			`;
			catBlock.appendChild(line);
			shown++;
		}
		box.appendChild(catBlock);
	}
}

/* Styles minimalistes injectés si pas encore présents (évite modifier CSS si oublié) */
(function ensureHomeMiniStyles(){
	if(document.getElementById('home-mini-styles')) return;
	const style = document.createElement('style');
	style.id = 'home-mini-styles';
	style.textContent = `
		#home-tasks-list, #home-courses-list { display:flex; flex-direction:column; gap:10px; }
		.home-task-row{
			background:color-mix(in srgb,var(--panel) 90%, transparent);
			border:1px solid var(--glass-border);
			padding:10px 12px 12px;
			border-radius:14px;
			display:grid;
			grid-template-columns:1fr auto;
			gap:8px 12px;
			align-items:center;
			position:relative;
		}
		.home-task-main{ display:flex; flex-direction:column; gap:4px; font-size:.8rem; }
		.home-task-main strong{ font-size:.82rem; }
		.home-task-meta{ font-size:.65rem; opacity:.7; letter-spacing:.5px; }
		.home-task-bar{
			grid-column:1 / span 2;
			height:6px;
			background:color-mix(in srgb,var(--accent) 15%, transparent);
			border-radius:4px;
			overflow:hidden;
			position:relative;
		}
		.home-task-bar-fill{
			height:100%;
			background:linear-gradient(90deg,var(--accent),var(--accent-mix));
			transition:width .5s;
		}
		.home-task-actions{ display:flex; gap:6px; }
		.home-course-cat{
			background:color-mix(in srgb,var(--panel) 92%, transparent);
			border:1px solid var(--glass-border);
			border-radius:14px;
			padding:10px 12px;
			display:flex;
			flex-direction:column;
			gap:6px;
		}
		.home-course-cat-title{
			font-weight:600;
			font-size:.75rem;
			text-transform:uppercase;
			letter-spacing:.6px;
			opacity:.75;
			margin-bottom:2px;
		}
		.home-course-item{
			font-size:.78rem;
			display:flex;
		}
		.home-course-check{
			display:flex;
			align-items:center;
			gap:6px;
			cursor:pointer;
			user-select:none;
		}
		.home-course-check input{ accent-color:var(--accent); width:14px; height:14px; }
	`;
	document.head.appendChild(style);
})();

/* Étendre renderHome pour inclure tasks & courses */
const _renderHomeOrig = typeof renderHome === 'function' ? renderHome : async function(){};
async function renderHome(force=false){
	await Promise.all([
		renderHomeMeals(),      // déjà présent
		renderHomeTasks(),
		renderHomeCourses()
	]);
}
window.renderHome = renderHome;

/* Auto-render si conteneurs présents */
document.addEventListener('DOMContentLoaded', ()=>{
	if(document.getElementById('home-tasks-list') || document.getElementById('home-courses-list'))
		renderHome();
});

// Après CRUD courses / tasks on appelait déjà renderHome -> mise à jour immédiate