const App = (() => {
  	const CONFIG = {
		DEFAULT_CITY: 'Краснодар',
		GEO_API_URL: 'https://nominatim.openstreetmap.org',
		WEATHER_API_URL: 'https://api.open-meteo.com/v1/forecast',
		STORAGE_KEY: 'city',
		TASKS_STORAGE_KEY: 'tasks',
		BACKGROUND_IMAGES: [
			{ startHour: 0, endHour: 6, image: 'img/01.jpg' },
			{ startHour: 6, endHour: 12, image: 'img/02.jpg' },
			{ startHour: 12, endHour: 18, image: 'img/03.jpg' },
			{ startHour: 18, endHour: 24, image: 'img/04.jpg' }
		],
		WEATHER_CODES: {
			0: "Ясно",
			1: "Преимущественно ясно",
			2: "Переменная облачность",
			3: "Пасмурно",
			45: "Туман",
			48: "Морось",
			51: "Лёгкая морось",
			61: "Слабый дождь",
			63: "Умеренный дождь",
			65: "Сильный дождь",
			71: "Слабый снег",
			73: "Умеренный снег",
			75: "Сильный снег",
			80: "Кратковременный дождь",
			81: "Кратковременный ливень",
			82: "Сильный ливень"
		}
	};

	const DOM = {
		cityInput: document.getElementById("city-input"),
		cityDisplay: document.querySelector(".city"),
		temperatureDisplay: document.querySelector(".temperature"),
		weatherDescriptionDisplay: document.querySelector(".weather-description"),
		errorMessage: document.querySelector(".weather-widget .error-message"),
		timeElement: document.querySelector('.time'),
		dateElement: document.querySelector('.date'),
		taskInput: document.getElementById("new-task-input"),
		taskList: document.getElementById("task-list"),
		taskErrorMessage: document.querySelector(".popup--tasks .error-message"),
		clearCompletedButton: document.getElementById("delete-completed-tasks"),
		openPopupButton: document.getElementById('open-popup'),
		popup: document.querySelector('.popup'),
		closePopupButton: document.querySelector('.popup .close-btn')
	};

	// Время и Дата
	const TimeModule = (() => {
		const updateTimeAndDate = () => {
			const now = new Date();
			DOM.timeElement.textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
			DOM.dateElement.textContent = formatDate(now);
		};

		const formatDate = (date) => {
			const day = date.getDate().toString().padStart(2, '0');
			const month = date.toLocaleString('ru-RU', { month: 'long' });
			const weekday = date.toLocaleString('ru-RU', { weekday: 'long' });
			return `${day} ${month}, ${weekday}`;
		};

		return {
			init: () => {
				updateTimeAndDate();
				setInterval(updateTimeAndDate, 1000);
			}
		};
	})();

  	// Слайдер изображений
  	const BackgroundModule = (() => {
		const setBodyBackground = (imageUrl) => {
		  document.body.style.cssText = `
			background-image: url(${imageUrl});
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
			`;
		};

		const getBackgroundForHour = (hour) => {
			const background = CONFIG.BACKGROUND_IMAGES.find(bg => hour >= bg.startHour && hour < bg.endHour);
			return background ? background.image : CONFIG.BACKGROUND_IMAGES[0].image;
		};

		const updateBackgroundImage = () => {
			const currentHour = new Date().getHours();
			const backgroundImage = getBackgroundForHour(currentHour);
			setBodyBackground(backgroundImage);
		};

		return {
			init: () => {
				updateBackgroundImage();
				setInterval(updateBackgroundImage, 60 * 60 * 1000);
			}
		};
	})();

	// Блок погоды
	const WeatherModule = (() => {
		const fetchCityByCoordinates = async (lat, lon) => {
			try {
				const response = await fetch(`${CONFIG.GEO_API_URL}/reverse?format=json&lat=${lat}&lon=${lon}`);
				const data = await response.json();
				return data.address.city || data.address.town || data.address.village || CONFIG.DEFAULT_CITY;
			} catch (error) {
				console.error('Ошибка при получении города:', error);
				return CONFIG.DEFAULT_CITY;
			}
		};

		const fetchCoordinates = async (city) => {
			const response = await fetch(`${CONFIG.GEO_API_URL}/search?format=json&q=${encodeURIComponent(city)}`);
			const data = await response.json();
			if (!data || data.length === 0) {
				throw new Error('Город не найден');
			}
			return { lat: data[0].lat, lon: data[0].lon };
		};

		const fetchWeatherData = async (lat, lon) => {
			const response = await fetch(`${CONFIG.WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current_weather=true`);
			return response.json();
		};

		const updateWeatherDisplay = (weatherData) => {
			const { temperature, weathercode } = weatherData.current_weather;
			DOM.temperatureDisplay.textContent = `${temperature}°C`;
			DOM.weatherDescriptionDisplay.textContent = CONFIG.WEATHER_CODES[weathercode] || "Неизвестно";
			showWeatherElements();
		};

		const showWeatherElements = () => {
			DOM.errorMessage.style.display = "none";
			DOM.temperatureDisplay.style.display = "inline";
			DOM.weatherDescriptionDisplay.style.display = "inline";
		};

		const hideWeatherElements = () => {
			DOM.temperatureDisplay.style.display = "none";
			DOM.weatherDescriptionDisplay.style.display = "none";
		};

		const handleError = (message, error) => {
			console.error(message, error);
			DOM.errorMessage.style.display = "block";
			hideWeatherElements();
		};

		const fetchWeather = async (city) => {
			try {
				const { lat, lon } = await fetchCoordinates(city);
				const weatherData = await fetchWeatherData(lat, lon);
				updateWeatherDisplay(weatherData);
			} catch (error) {
				handleError('Ошибка при получении погоды:', error);
			}
		};

		const updateCityDisplay = (city) => {
			localStorage.setItem(CONFIG.STORAGE_KEY, city);
			DOM.cityDisplay.textContent = city;
			DOM.cityInput.value = city;
		};

		const handleCityChange = () => {
			const newCity = DOM.cityInput.value.trim();
			if (newCity) {
				updateCityDisplay(newCity);
				fetchWeather(newCity);
			}
		};

		return {
			init: () => {
				const savedCity = localStorage.getItem(CONFIG.STORAGE_KEY) || CONFIG.DEFAULT_CITY;
				updateCityDisplay(savedCity);
				fetchWeather(savedCity);
				DOM.cityInput.addEventListener("change", handleCityChange);
			
				if (navigator.geolocation) {
					navigator.geolocation.getCurrentPosition(
						async ({ coords }) => {
							const city = await fetchCityByCoordinates(coords.latitude, coords.longitude);
							updateCityDisplay(city);
							fetchWeather(city);
						},
						(error) => {
							console.error('Ошибка геолокации:', error);
							fetchWeather(savedCity);
						}
					);
				}
			}
		};
	})();

	// Блок задач
	const TaskModule = (() => {
		const addTask = (taskName, isCompleted = false) => {
			const li = document.createElement("li");
			const checkbox = document.createElement("input");
			checkbox.type = "checkbox";
			checkbox.checked = isCompleted;
			const taskText = document.createElement("span");
			taskText.textContent = taskName;
			const deleteButton = document.createElement("div");
			deleteButton.classList.add("delete-task");
			deleteButton.innerHTML = "×";

			deleteButton.addEventListener("click", () => {
				li.remove();
				saveTasks();
			});

			checkbox.addEventListener("change", () => {
				li.classList.toggle("completed", checkbox.checked);
				saveTasks();
			});
		
			li.append(checkbox, taskText, deleteButton);
			DOM.taskList.appendChild(li);

			if (isCompleted) {
				li.classList.add("completed");
			}
		}

		const saveTasks = () => {
			const tasks = Array.from(DOM.taskList.querySelectorAll("li")).map(task => ({
				name: task.querySelector("span").textContent,
				completed: task.querySelector("input[type='checkbox']").checked,
			}));
			localStorage.setItem(CONFIG.TASKS_STORAGE_KEY, JSON.stringify(tasks));
		};

		const loadTasks = () => {
			const tasks = JSON.parse(localStorage.getItem(CONFIG.TASKS_STORAGE_KEY)) || [];
			tasks.forEach(task => addTask(task.name, task.completed));
		};

		return {
			init: () => {
				loadTasks();
				DOM.taskInput.addEventListener("keydown", (event) => {
					if (event.key === "Enter") {
						const taskName = DOM.taskInput.value.trim();
						if (taskName === "") {
							DOM.taskErrorMessage.style.display = "block";
						} else {
							DOM.taskErrorMessage.style.display = "none";
							addTask(taskName);
							saveTasks();
							DOM.taskInput.value = "";
						}
					}
				});

				DOM.clearCompletedButton.addEventListener("click", () => {
					DOM.taskList.querySelectorAll("li").forEach((task) => {
						if (task.querySelector("input[type='checkbox']").checked) {
							task.remove();
						}
					});
					saveTasks();
				});
			}
		};
	})();

	// popup
	const PopupModule = (() => {
		return {
			init: () => {
				DOM.openPopupButton.addEventListener("click", () => DOM.popup.classList.add("active"));
				DOM.closePopupButton.addEventListener("click", () => DOM.popup.classList.remove("active"));
			}
		};
	})();

	return {
		init: () => {
			document.addEventListener("DOMContentLoaded", () => {
				TimeModule.init();
				BackgroundModule.init();
				WeatherModule.init();
				TaskModule.init();
				PopupModule.init();
			});
		}
	};
})();

App.init();