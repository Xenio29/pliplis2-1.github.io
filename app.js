// app.js - Script commun pour toutes les pages
const TASKS_KEY = 'home_tasks_v1';
const COURSES_KEY = 'home_courses_v1';
const THEME_KEY = 'home_theme_v1';

// Données par défaut
const DEFAULT_TASKS = [
    { id: 1, title: "Sortir les poubelles", frequency: {value: 1, unit: 'days'}, room: 'Extérieur', lastDone: Date.now() - 2*24*3600*1000, finished: false },
    { id: 2, title: "Passer l'aspirateur", frequency: {value: 7, unit: 'days'}, room: 'Salon', lastDone: Date.now() - 5*24*3600*1000, finished: false }
];

const DEFAULT_COURSES = [
    { id: 1, title: "Lait", quantity: "1L", category: "Boissons", note: "", bought: false },
    { id: 2, title: "Pain", quantity: "1", category: "Boulangerie", note: "", bought: false }
];

const CATEGORIES = ['Fruits', 'Légumes', 'Boulangerie', 'Épicerie', 'Boissons', 'Boucherie', 'Autres'];

// Gestion des données
function loadData() {
    const t = localStorage.getItem(TASKS_KEY);
    const c = localStorage.getItem(COURSES_KEY);
    let tasks = t ? JSON.parse(t) : DEFAULT_TASKS;
    let courses = c ? JSON.parse(c) : DEFAULT_COURSES;
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
    const total = msFromUnit(task.frequency.value, task.frequency.unit) || 1;
    const elapsed = Date.now() - (task.lastDone || 0);
    const remaining = total - elapsed;
    const remainingDays = Math.ceil(remaining / (24 * 3600 * 1000));
    const progress = Math.min(100, Math.floor((elapsed / total) * 100));
    return { progress, remainingDays };
}

function ensureTaskFrequency(task) {
    if (!task.frequency) {
        task.frequency = { value: 7, unit: 'days' };
    }
    if (!task.lastDone) {
        task.lastDone = Date.now() - 2*24*3600*1000;
    }
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
        frequency: {value: periodValue, unit: 'days'},
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

/* ===== API BACKEND (MySQL via PHP) ===== */
const API_BASE = 'backend/api.php';
const API_KEY  = '9f4c2d8e7a0b1f73c6d41ea0b9f58d3370b2c4f9e6d1a3b487c0f5e29ab37d11';

async function apiRequest(entity, {method='GET', id=null, data=null} = {}){
	const url = new URL(API_BASE, window.location.href);
	url.searchParams.set('entity', entity);
	if(id) url.searchParams.set('id', id);
	const opt = {
		method,
		headers:{
			'X-API-KEY': API_KEY,
			'Accept':'application/json'
		}
	};
	if(data){
		opt.headers['Content-Type']='application/json';
		opt.body = JSON.stringify(data);
	}
	const r = await fetch(url.toString(), opt);
	if(!r.ok) throw new Error('api_error');
	return await r.json();
}

/* ===== Data layer override ===== */
async function fetchTasks(){
	try{
		const rows = await apiRequest('tasks');
		return rows.map(r=>({
			id:+r.id,
			title:r.title,
			frequency:{value:+r.freq_value, unit:r.freq_unit},
			room:r.room,
			lastDone:r.last_done? new Date(r.last_done).getTime(): Date.now(),
			finished:!!+r.finished
		}));
	}catch(e){
		// fallback local
		const d = loadData(); return d.tasks;
	}
}

async function fetchCourses(){
	try{
		const rows = await apiRequest('courses');
		return rows.map(r=>({
			id:+r.id,
			title:r.title,
			quantity:r.quantity,
			category:r.category,
			note:r.note,
			bought:!!+r.bought
		}));
	}catch(e){
		const d = loadData(); return d.courses;
	}
}

async function fetchMeals(){
	try{
		return await apiRequest('meals');
	}catch(e){
		return []; // plus de fallback local maintenant
	}
}

/* Remplace loadData (asynchrone) */
async function loadDataAsync(){
	const [tasks, courses] = await Promise.all([fetchTasks(), fetchCourses()]);
	return { tasks, courses };
}
// conserver l’ancien loadData sync pour compat héritée (mais déconseillé)
function loadData() {
    const t = localStorage.getItem(TASKS_KEY);
    const c = localStorage.getItem(COURSES_KEY);
    let tasks = t ? JSON.parse(t) : DEFAULT_TASKS;
    let courses = c ? JSON.parse(c) : DEFAULT_COURSES;
    return { tasks, courses };
}

/* ===== CRUD TASKS (API) ===== */
async function createTask(task){
	await apiRequest('tasks',{method:'POST', data:{
		title:task.title,
		freq_value:task.frequency.value,
		freq_unit:task.frequency.unit,
		room:task.room,
		last_done:new Date(task.lastDone).toISOString().slice(0,19).replace('T',' '),
		finished:task.finished?1:0
	}});
}
async function updateTask(task){
	await apiRequest('tasks',{method:'PUT', id:task.id, data:{
		title:task.title,
		freq_value:task.frequency.value,
		freq_unit:task.frequency.unit,
		room:task.room,
		last_done:new Date(task.lastDone).toISOString().slice(0,19).replace('T',' '),
		finished:task.finished?1:0
	}});
}
async function removeTask(id){
	await apiRequest('tasks',{method:'DELETE', id});
}

/* Hook existantes -> API */
const _origAddTaskFromForm = addTaskFromForm;
addTaskFromForm = async function(e){
	e.preventDefault();
	const title = document.getElementById('t-title').value.trim();
	const periodValue = parseInt(document.getElementById('t-period').value);
	const room = document.getElementById('t-room').value;
	const task = {
		title,
		frequency:{value:periodValue, unit:'days'},
		room,
		lastDone: Date.now(),
		finished:false
	};
	await createTask(task);
	if(typeof renderTasks==='function') renderTasks(true);
	e.target.reset();
};

markTaskToggle = async function(id){
	const tasks = await fetchTasks();
	const t = tasks.find(x=>x.id===id);
	if(!t) return;
	if(!t.finished){
		t.finished=true;
		t.lastDone=Date.now();
	}else{
		t.finished=false;
		t.lastDone=Date.now();
	}
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

/* ===== COURSES CRUD (API) ===== */
async function createCourse(item){
	await apiRequest('courses',{method:'POST', data:item});
}
async function updateCourse(item){
	await apiRequest('courses',{method:'PUT', id:item.id, data:item});
}
async function deleteCourseApi(id){
	await apiRequest('courses',{method:'DELETE', id});
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
	const title = c_title.value.trim();
	if(!title) return;
	await createCourse({
		title,
		quantity:c_qty.value.trim(),
		category:c_category.value,
		note:c_note.value.trim(),
		bought:0
	});
	e.target.reset();
	if(typeof renderCourses==='function') renderCourses(true);
};

/* ===== MEALS CRUD (API) ===== */
async function createMeal(day,moment,meal,week_offset){
	await apiRequest('meals',{method:'POST', data:{day,moment,meal,week_offset}});
}
async function updateMeal(id,day,moment,meal,week_offset){
	await apiRequest('meals',{method:'PUT', id, data:{day,moment,meal,week_offset}});
}
async function deleteMealApi(id){
	await apiRequest('meals',{method:'DELETE', id});
}

window.fetchMeals = fetchMeals;
window.createMeal = createMeal;
window.updateMeal = updateMeal;
window.deleteMealApi = deleteMealApi;

/* Export new async loader */
window.loadDataAsync = loadDataAsync;

// ...existing code...