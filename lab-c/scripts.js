const form = document.querySelector("#weather-form");
const cityInput = document.querySelector("#city");
const statusElement = document.querySelector("#status");
const resultsElement = document.querySelector("#results");
const weatherElement = document.querySelector("#weather");
const apiKey = "9709fe63668f78a498ca57256c07c2b5";

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const query = new URLSearchParams({
        q: cityInput.value,
        appid: apiKey,
        units: "metric",
        lang: "pl"
    });
    const baseUrl = "https://api.openweathermap.org/data/2.5";
    const currentUrl = `${baseUrl}/weather?${query}`;
    const forecastUrl = `${baseUrl}/forecast?${query}`;

    resultsElement.hidden = false;
    statusElement.textContent = "Pobieranie pogody…";
    weatherElement.replaceChildren();

    try {
        const [current, forecast] = await Promise.all([
            getCurrentWeather(currentUrl),
            getForecast(forecastUrl)
        ]);
        showWeather(current, forecast);
        statusElement.textContent = "";
    } catch {
        statusElement.textContent = "Nie udało się pobrać pogody dla tego miasta.";
    }
});

function getCurrentWeather(url) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("GET", url);
        request.onload = () => {
            if (request.status !== 200) {
                reject(new Error("Current weather request failed"));
                return;
            }
            resolve(JSON.parse(request.responseText));
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
    return response.json();
}

function showWeather(current, forecast) {
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

    const forecastSection = document.createElement("section");
    forecastSection.className = "forecast";
    forecastSection.append(createText("h2", "Prognoza na 5 dni"));
    const forecastGrid = document.createElement("div");
    forecastGrid.className = "forecast-grid";

    const days = new Map();
    forecast.list.forEach((entry) => {
        const date = entry.dt_txt.slice(0, 10);
        if (!days.has(date)) {
            days.set(date, {
                min: entry.main.temp_min,
                max: entry.main.temp_max,
                description: entry.weather[0].description,
                icon: entry.weather[0].icon,
                condition: entry.weather[0].id,
                precipitation: entry.pop
            });
        } else {
            const day = days.get(date);
            day.min = Math.min(day.min, entry.main.temp_min);
            day.max = Math.max(day.max, entry.main.temp_max);
            day.precipitation = Math.max(day.precipitation, entry.pop);
            if (entry.dt_txt.includes("12:00:00")) {
                day.description = entry.weather[0].description;
                day.icon = entry.weather[0].icon;
                day.condition = entry.weather[0].id;
            }
        }
    });

    [...days.entries()].slice(0, 5).forEach(([date, day]) => {
        const card = document.createElement("article");
        card.className = "weather-card forecast-card";
        card.append(
            createText("h3", formatDate(date)),
            createIcon(day.icon, day.description),
            createText("p", day.description, "description"),
            createText("p", `${Math.round(day.min)}° – ${Math.round(day.max)}°C`, "temperature"),
            createText("p", `Szansa opadów: ${Math.round(day.precipitation * 100)}%`, "precipitation"),
            createRecommendations(day.condition, day.precipitation)
        );
        forecastGrid.append(card);
    });

    forecastSection.append(forecastGrid);
    weatherElement.replaceChildren(currentCard, forecastSection);
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
