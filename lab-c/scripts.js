const form = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");
const weatherElement = document.querySelector("#weather");
const apiKey = "9709fe63668f78a498ca57256c07c2b5";

form.addEventListener("submit", (event) => {
    event.preventDefault();
    loadWeather({ q: cityInput.value });
});

loadWeatherFromLocation();

async function loadWeather(location) {
    const query = new URLSearchParams({
        ...location,
        appid: apiKey,
        units: "metric",
        lang: "pl"
    });
    const baseUrl = "https://api.openweathermap.org/data/2.5";
    resultsElement.hidden = false;
    statusElement.textContent = "Pobieranie pogody…";
    weatherElement.replaceChildren();

    try {
        const [current, forecast] = await Promise.all([
            getCurrentWeather(`${baseUrl}/weather?${query}`),
            getForecast(`${baseUrl}/forecast?${query}`)
        ]);
        showWeather(current, forecast);
        statusElement.textContent = "";
    } catch {
        statusElement.textContent = "Nie udało się pobrać pogody. Sprawdź miasto lub uprawnienia lokalizacji.";
    }
}

function loadWeatherFromLocation() {
    resultsElement.hidden = false;
    if (!navigator.geolocation) {
        statusElement.textContent = "Geolokalizacja nie jest dostępna. Wpisz miasto, aby sprawdzić pogodę.";
        return;
    }
    statusElement.textContent = "Ustalanie lokalizacji…";

    navigator.geolocation.getCurrentPosition(
        ({ coords }) => loadWeather({ lat: coords.latitude, lon: coords.longitude }),
        () => {
            statusElement.textContent = "Nie udało się ustalić lokalizacji. Wpisz miasto, aby sprawdzić pogodę.";
        },
        { timeout: 10000 }
    );
}

function getCurrentWeather(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.onload = () => {
            if (request.status !== 200) {
                reject(new Error("Current weather request failed"));
                return;
            }
            const data = JSON.parse(request.responseText);
            console.log("Current weather:", data);
            resolve(data);
        };
        request.onerror = () => reject(new Error("Current weather request failed"));
        request.send();
    });
}

async function getForecast(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Forecast request failed");
    }
    const data = await response.json();
    console.log("Forecast:", data);
    return data;
}

function showWeather(current, forecast) {
    const timezoneOffset = forecast.city.timezone;
    const today = new Date((current.dt + timezoneOffset) * 1000).toISOString().slice(0, 10);
    const entriesByDate = new Map();
    forecast.list.forEach((entry) => {
        const date = new Date((entry.dt + timezoneOffset) * 1000).toISOString().slice(0, 10);
        if (!entriesByDate.has(date)) entriesByDate.set(date, []);
        entriesByDate.get(date).push(entry);
    });

    const todayLayout = document.createElement("div");
    todayLayout.className = "today-layout";
    const currentSection = document.createElement("section");
    currentSection.className = "current-section";
    currentSection.append(createText("h2", "Pogoda na dziś"));
    const currentCard = document.createElement("article");
    currentCard.className = "weather-card current-weather";
    currentCard.append(
        createText("h2", `Teraz — ${current.name}`),
        createIcon(current.weather[0].icon, current.weather[0].description),
        createText("p", `${Math.round(current.main.temp)}°C`, "temperature"),
        createText("p", `Odczuwalna: ${Math.round(current.main.feels_like)}°C`, "feels-like"),
        createText("p", current.weather[0].description, "description"),
        createRecommendations(current.weather[0].id)
    );
    currentSection.append(currentCard);

    const todayForecast = document.createElement("section");
    todayForecast.className = "today-forecast";
    todayForecast.append(createText("h2", "Prognoza godzinowa"));
    const todayGrid = document.createElement("div");
    todayGrid.className = "today-forecast-grid";
    (entriesByDate.get(today) || []).forEach((entry) => {
        todayGrid.append(createForecastCard(entry, timezoneOffset));
    });
    todayForecast.append(todayGrid);
    todayLayout.append(currentSection, todayForecast);

    const forecastSection = document.createElement("section");
    forecastSection.className = "forecast";
    forecastSection.append(createText("h2", "Pogoda na najbliższe 5 dni"));
    const futureDays = [...entriesByDate.keys()].filter((date) => date > today).slice(0, 5);
    const dayPicker = document.createElement("div");
    dayPicker.className = "day-picker";
    dayPicker.setAttribute("role", "group");
    dayPicker.setAttribute("aria-label", "Wybierz dzień prognozy");

    const selectedForecast = document.createElement("div");
    selectedForecast.className = "forecast-grid selected-forecast";
    futureDays.forEach((date, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "day-button";
        button.textContent = formatDate(date);
        button.setAttribute("aria-pressed", String(index === 0));
        button.addEventListener("click", () => {
            dayPicker.querySelectorAll(".day-button").forEach((dayButton) => {
                dayButton.setAttribute("aria-pressed", String(dayButton === button));
            });
            renderDayForecast(selectedForecast, entriesByDate.get(date), timezoneOffset);
        });
        dayPicker.append(button);
    });
    forecastSection.append(dayPicker, selectedForecast);
    if (futureDays.length) {
        renderDayForecast(selectedForecast, entriesByDate.get(futureDays[0]), timezoneOffset);
    }

    weatherElement.replaceChildren(todayLayout, forecastSection);
}

function renderDayForecast(container, entries, timezoneOffset) {
    container.replaceChildren(...entries.map((entry) => createForecastCard(entry, timezoneOffset)));
}

function createForecastCard(entry, timezoneOffset) {
    const localDate = new Date((entry.dt + timezoneOffset) * 1000);
    const weather = entry.weather[0];
    const precipitation = entry.pop ?? 0;
    const card = document.createElement("article");
    card.className = "weather-card forecast-card";
    card.append(
        createText("h4", localDate.toISOString().slice(11, 16)),
        createIcon(weather.icon, weather.description),
        createText("p", `${Math.round(entry.main.temp)}°C`, "temperature"),
        createText("p", weather.description, "description"),
        createText("p", `Szansa opadów: ${Math.round(precipitation * 100)}%`, "precipitation"),
        createRecommendations(weather.id, precipitation)
    );
    return card;
}

function createText(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    return element;
}

function createIcon(code, description) {
    const icon = document.createElement("img");
    icon.className = "weather-icon";
    icon.src = `https://openweathermap.org/img/wn/${code}@2x.png`;
    icon.alt = description;
    return icon;
}

function createRecommendations(condition, precipitation = 0) {
    let recommendations;
    if (condition >= 200 && condition < 600) {
        recommendations = ["Uważaj na drodze — nawierzchnia może być mokra.", "Zabierz parasol."];
    } else if (condition >= 600 && condition < 700) {
        recommendations = ["Ubierz się ciepło.", "Zachowaj ostrożność na śliskiej nawierzchni."];
    } else if (condition >= 700 && condition < 800) {
        recommendations = ["Możliwa ograniczona widoczność — zachowaj ostrożność na drodze."];
    } else if (condition === 800) {
        recommendations = ["Jest słonecznie — okulary przeciwsłoneczne mogą się przydać."];
    } else {
        recommendations = ["Sprawdź warunki przed wyjściem."];
    }

    if (precipitation >= 0.3 && condition >= 700) {
        recommendations.push("Możliwe opady — zabierz parasol i uważaj na drodze.");
    }

    const list = document.createElement("ul");
    list.className = "recommendations";
    recommendations.forEach((recommendation) => {
        const item = document.createElement("li");
        item.textContent = recommendation;
        list.append(item);
    });
    return list;
}

function formatDate(date) {
    return new Intl.DateTimeFormat("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(new Date(`${date}T12:00:00`));
}
