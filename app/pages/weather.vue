
<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const API_KEY = '330f6ab158734dcb96e05901262610'
const API_URL = 'https://api.weatherapi.com/v1/forecast.json'

const location = ref('San Fernando, Pampanga')
const searchLocation = ref('')
const selectedDay = ref(0)
const selectedHour = ref(0)
const unit = ref('C')
const showLocationSearch = ref(false)
const showAllForecast = ref(false)
const loading = ref(false)
const refreshing = ref(false)
const errorMessage = ref('')
const weatherData = ref(null)
const forecast = ref([])
const hourly = ref([])

let refreshInterval

const currentWeather = computed(() => {
  if (!weatherData.value) return null

  return weatherData.value.current
})

const selectedForecast = computed(() => {
  return forecast.value[selectedDay.value] || null
})

const weather = computed(() => {
  if (!weatherData.value || !selectedForecast.value) return null

  const current = weatherData.value.current
  const day = selectedForecast.value
  const isToday = selectedDay.value === 0

  return {
    temperature: isToday ? current.temp_c : day.avgTemp,
    condition: isToday ? current.condition.text : day.condition,
    wind: isToday ? current.wind_kph : day.wind,
    humidity: isToday ? current.humidity : day.humidity,
    high: day.high,
    low: day.low,
    feelsLike: isToday ? current.feelslike_c : day.avgTemp,
    uv: isToday ? current.uv : day.uv,
    precipitation: isToday ? current.precip_mm : day.precipitation,
    isDay: isToday ? current.is_day : 1,
  }
})

const formattedDate = computed(() => {
  if (!weatherData.value) return ''

  const date = new Date(
    weatherData.value.location.localtime.replace(' ', 'T'),
  )

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
})

const activeHourly = computed(() => {
  return hourly.value[selectedHour.value] || {
    time: '--:--',
    temp: 0,
    condition: '',
    wind: 0,
    humidity: 0,
    isDay: 1,
  }
})

const chartPoints = computed(() => {
  if (!hourly.value.length) return []

  const temps = hourly.value.map(hour => hour.temp)
  const minTemp = Math.min(...temps) - 2
  const maxTemp = Math.max(...temps) + 2
  const range = Math.max(maxTemp - minTemp, 1)

  return hourly.value.map((hour, index) => ({
    x: hourly.value.length === 1
      ? 400
      : 25 + index * (750 / (hourly.value.length - 1)),
    y: 70 - ((hour.temp - minTemp) / range) * 45,
  }))
})

const temperaturePath = computed(() => {
  return chartPoints.value
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ')
})

const temperatureArea = computed(() => {
  if (!chartPoints.value.length) return ''

  const points = chartPoints.value
    .map(point => `L ${point.x} ${point.y}`)
    .join(' ')

  return `M 25 103 ${points} L 775 103 Z`
})

const selectedPoint = computed(() => {
  return chartPoints.value[selectedHour.value] || { x: 400, y: 70 }
})

// Celsius/Fahrenheit conversion
function displayTemp(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '--°'
  }

  const temperature = unit.value === 'C'
    ? Number(value)
    : (Number(value) * 9) / 5 + 32

  return `${Math.round(temperature)}°`
}

// Use vector icons instead of small raster weather images.
// These remain sharp when resized.
function getWeatherIcon(condition = '', isDay = 1) {
  const text = condition.toLowerCase()

  if (text.includes('thunder')) return 'mdi-weather-lightning-rainy'

  if (
    ['snow', 'sleet', 'ice pellets', 'blizzard', 'freezing'].some(
      word => text.includes(word),
    )
  ) {
    return 'mdi-weather-snowy'
  }

  if (
    ['rain', 'drizzle', 'shower'].some(word => text.includes(word))
  ) {
    return 'mdi-weather-pouring'
  }

  if (
    ['fog', 'mist'].some(word => text.includes(word))
  ) {
    return 'mdi-weather-fog'
  }

  if (text.includes('wind')) return 'mdi-weather-windy'

  if (
    text.includes('partly cloudy') ||
    text.includes('patchy clouds')
  ) {
    return isDay ? 'mdi-weather-partly-cloudy' : 'mdi-weather-night-partly-cloudy'
  }

  if (
    text.includes('cloudy') ||
    text.includes('overcast')
  ) {
    return 'mdi-weather-cloudy'
  }

  if (text.includes('clear') || text.includes('sunny')) {
    return isDay ? 'mdi-weather-sunny' : 'mdi-weather-night'
  }

  if (
    text.includes('cloud') ||
    text.includes('partly')
  ) {
    return isDay ? 'mdi-weather-partly-cloudy' : 'mdi-weather-night-partly-cloudy'
  }

  return 'mdi-weather-cloudy'
}

function getWeatherColor(condition = '', isDay = 1) {
  const text = condition.toLowerCase()

  if (text.includes('thunder')) return '#ffc44d'

  if (
    ['rain', 'drizzle', 'shower', 'snow', 'sleet', 'ice'].some(
      word => text.includes(word),
    )
  ) {
    return '#a8cfff'
  }

  if (text.includes('sunny') || text.includes('clear')) {
    return isDay ? '#ffc44d' : '#c3d7ff'
  }

  if (text.includes('fog') || text.includes('mist')) return '#c4cbd5'

  return '#e0e4ea'
}

function formatDay(dateString, index) {
  if (index === 0) return 'Today'

  return new Date(`${dateString}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
  })
}

function formatHour(timeString) {
  const time = timeString.split(' ')[1] || timeString
  const [hours, minutes] = time.split(':')
  const hour = Number(hours)

  return `${hour % 12 || 12}${minutes ? `:${minutes}` : ''} ${hour >= 12 ? 'PM' : 'AM'}`
}

function updateForecast() {
  if (!weatherData.value) return

  forecast.value = weatherData.value.forecast.forecastday.map(
    (item, index) => ({
      date: item.date,
      day: formatDay(item.date, index),
      avgTemp: item.day.avgtemp_c,
      high: item.day.maxtemp_c,
      low: item.day.mintemp_c,
      condition: item.day.condition.text,
      isDay: 1,
      humidity: item.day.avghumidity,
      wind: item.day.maxwind_kph,
      precipitation: item.day.totalprecip_mm,
      uv: item.day.uv,
    }),
  )
}

function updateHourly(index = 0) {
  if (!weatherData.value) return

  const selectedDate = weatherData.value.forecast.forecastday[index]

  if (!selectedDate) {
    hourly.value = []
    selectedHour.value = 0
    return
  }

  let hours = selectedDate.hour

  if (index === 0) {
    const currentEpoch = Math.floor(Date.now() / 1000)

    hours = hours.filter(hour => hour.time_epoch >= currentEpoch)
  }

  // Show the next eight hours.
  hourly.value = hours.slice(0, 8).map(hour => ({
    time: formatHour(hour.time),
    temp: hour.temp_c,
    condition: hour.condition.text,
    wind: hour.wind_kph,
    humidity: hour.humidity,
    isDay: hour.is_day,
  }))

  selectedHour.value = 0
}

async function fetchWeather(city = location.value, isRefresh = false) {
  if (loading.value) return

  loading.value = true
  refreshing.value = isRefresh
  errorMessage.value = ''

  try {
    const data = await $fetch(API_URL, {
      query: {
        key: API_KEY,
        q: city,
        days: 7,
        aqi: 'yes',
        alerts: 'no',
      },
    })

    weatherData.value = data

    location.value = [
      data.location.name,
      data.location.region || data.location.country,
    ].filter(Boolean).join(', ')

    selectedDay.value = 0
    updateForecast()
    updateHourly(0)
  } catch (error) {
    errorMessage.value =
      error?.data?.error?.message ||
      'Unable to load weather. Check your internet connection and try again.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function submitLocation() {
  const city = searchLocation.value.trim()

  if (!city || loading.value) return

  await fetchWeather(city)

  if (!errorMessage.value) {
    searchLocation.value = ''
    showLocationSearch.value = false
  }
}

function selectDay(index) {
  selectedDay.value = index
  updateHourly(index)
}

function moveHour(direction) {
  const next = selectedHour.value + direction

  if (next >= 0 && next < hourly.value.length) {
    selectedHour.value = next
  }
}

function resetWeather() {
  selectDay(0)
}

onMounted(() => {
  fetchWeather('San Fernando, Pampanga')

  refreshInterval = setInterval(() => {
    if (!loading.value) fetchWeather(location.value, true)
  }, 600000)
})

onBeforeUnmount(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>

<template>
  <main class="weather-page">
    <section class="weather-dashboard">
      <!-- Header -->
      <header class="weather-header">
        <button
          class="location-button"
          type="button"
          @click="showLocationSearch = !showLocationSearch"
        >
          <v-icon size="18">mdi-map-marker-outline</v-icon>
          <span>{{ location }}</span>
          <v-icon size="16">mdi-chevron-down</v-icon>
        </button>

        <span class="date-label">{{ formattedDate }}</span>

        <div class="header-actions">
          <v-btn
            icon
            variant="text"
            size="small"
            aria-label="Refresh weather"
            :loading="refreshing"
            @click="fetchWeather(location, true)"
          >
            <v-icon>mdi-refresh</v-icon>
          </v-btn>

          <v-btn
            variant="outlined"
            size="small"
            class="unit-button"
            @click="unit = unit === 'C' ? 'F' : 'C'"
          >
            °{{ unit }}
          </v-btn>
        </div>
      </header>

      <!-- Location search -->
      <v-expand-transition>
        <div v-if="showLocationSearch" class="location-search">
          <v-text-field
            v-model="searchLocation"
            label="Search city or location"
            placeholder="e.g. Manila, Philippines"
            prepend-inner-icon="mdi-map-marker"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
            :loading="loading"
            @keyup.enter="submitLocation"
          />

          <v-btn
            color="amber"
            class="search-btn"
            :loading="loading"
            @click="submitLocation"
          >
            Search
          </v-btn>
        </div>
      </v-expand-transition>

      <!-- Loading -->
      <div v-if="loading && !weatherData" class="status-message">
        <v-progress-circular indeterminate color="amber" size="42" />
        <p>Loading weather data...</p>
      </div>

      <!-- Error -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        class="error-alert"
      >
        {{ errorMessage }}

        <v-btn
          variant="text"
          size="small"
          @click="fetchWeather(location)"
        >
          Retry
        </v-btn>
      </v-alert>

      <template v-if="weatherData && weather">
        <div class="weather-grid">
          <!-- Current conditions -->
          <section class="current-weather">
            <div class="temperature-line">
              <span class="main-temperature">
                {{ displayTemp(weather.temperature).replace('°', '') }}
              </span>
              <span class="temperature-unit">°{{ unit }}</span>
            </div>

            <h1 class="condition-title">{{ weather.condition }}</h1>

            <p class="feels-like">
              Feels like {{ displayTemp(weather.feelsLike) }}
            </p>

            <div class="weather-stats">
              <div class="stat-item">
                <div class="stat-label">
                  <v-icon size="17">mdi-weather-windy</v-icon>
                  Wind
                </div>
                <div class="stat-value">
                  {{ weather.wind.toFixed(1) }} km/h
                </div>
              </div>

              <div class="stat-item">
                <div class="stat-label">
                  <v-icon size="17">mdi-water-percent</v-icon>
                  Humidity
                </div>
                <div class="stat-value">{{ weather.humidity }}%</div>
              </div>
            </div>

            <div class="extra-stats">
              <div>
                <v-icon size="17">mdi-thermometer-low</v-icon>
                <span>Low {{ displayTemp(weather.low) }}</span>
              </div>

              <div>
                <v-icon size="17">mdi-thermometer-high</v-icon>
                <span>High {{ displayTemp(weather.high) }}</span>
              </div>

              <div>
                <v-icon size="17">mdi-weather-pouring</v-icon>
                <span>{{ weather.precipitation }} mm rain</span>
              </div>
            </div>
          </section>

          <!-- Sharp vector weather illustration -->
          <section class="weather-illustration">
            <div
              class="main-weather-icon-wrap"
              :class="{
                'icon-sunny': getWeatherIcon(weather.condition, weather.isDay) === 'mdi-weather-sunny',
                'icon-storm': weather.condition.toLowerCase().includes('thunder'),
                'icon-rain': weather.condition.toLowerCase().includes('rain'),
              }"
            >
              <v-icon
                class="main-weather-icon"
                :color="getWeatherColor(weather.condition, weather.isDay)"
                :icon="getWeatherIcon(weather.condition, weather.isDay)"
              />
            </div>

            <div class="illustration-caption">
              {{ weatherData.location.name }}
            </div>
          </section>

          <!-- Seven-day forecast -->
          <section class="forecast-column">
            <div class="forecast-heading">
              <span>7-day forecast</span>
              <v-icon size="18">mdi-calendar-week</v-icon>
            </div>

            <div class="forecast-panel">
              <button
                v-for="(day, index) in forecast"
                :key="day.date"
                type="button"
                class="forecast-day"
                :class="{ 'forecast-day--active': selectedDay === index }"
                @click="selectDay(index)"
              >
                <span class="forecast-indicator" />

                <v-icon
                  class="forecast-icon"
                  :icon="getWeatherIcon(day.condition, day.isDay)"
                  :color="getWeatherColor(day.condition, day.isDay)"
                  size="29"
                />

                <span class="forecast-info">
                  <span class="forecast-name">{{ day.day }}</span>
                  <span class="forecast-condition">{{ day.condition }}</span>
                </span>

                <span class="forecast-temps">
                  <strong>{{ displayTemp(day.high) }}</strong>
                  <span>{{ displayTemp(day.low) }}</span>
                </span>
              </button>
            </div>

            <button
              class="forecast-more"
              type="button"
              @click="showAllForecast = !showAllForecast"
            >
              {{ showAllForecast ? 'Hide details' : 'View details' }}
              <v-icon size="16">
                {{ showAllForecast ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
              </v-icon>
            </button>

            <v-expand-transition>
              <div v-if="showAllForecast" class="forecast-details">
                <div>
                  <span>Wind</span>
                  <strong>{{ selectedForecast?.wind }} km/h</strong>
                </div>
                <div>
                  <span>Humidity</span>
                  <strong>{{ selectedForecast?.humidity }}%</strong>
                </div>
                <div>
                  <span>Precipitation</span>
                  <strong>{{ selectedForecast?.precipitation }} mm</strong>
                </div>
                <div>
                  <span>UV index</span>
                  <strong>{{ selectedForecast?.uv }}</strong>
                </div>
              </div>
            </v-expand-transition>
          </section>
        </div>

        <!-- Hourly forecast -->
        <section class="hourly-section">
          <div class="section-heading">
            <div>
              <h2>{{ selectedForecast?.day }}'s forecast</h2>
              <p>Hourly temperature</p>
            </div>

            <button
              class="reset-button"
              type="button"
              @click="resetWeather"
            >
              <v-icon size="17">mdi-calendar-today</v-icon>
              Today
            </button>
          </div>

          <div v-if="hourly.length" class="hourly-chart">
            <svg
              class="temperature-svg"
              viewBox="0 0 800 112"
              preserveAspectRatio="none"
              role="img"
              aria-label="Hourly temperature graph"
            >
              <defs>
                <linearGradient
                  id="temperatureGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stop-color="#d4d4d4" stop-opacity="0.14" />
                  <stop offset="100%" stop-color="#d4d4d4" stop-opacity="0" />
                </linearGradient>
              </defs>

              <path :d="temperatureArea" fill="url(#temperatureGradient)" />

              <path
                :d="temperaturePath"
                fill="none"
                stroke="#858585"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

              <circle
                :cx="selectedPoint.x"
                :cy="selectedPoint.y"
                r="4"
                fill="#ffc44d"
              />
            </svg>

            <div class="hourly-points">
              <button
                v-for="(hour, index) in hourly"
                :key="`${hour.time}-${index}`"
                type="button"
                class="hour-point"
                :class="{ 'hour-point--active': selectedHour === index }"
                @click="selectedHour = index"
              >
                <span class="hour-temp">{{ displayTemp(hour.temp) }}</span>

                <v-icon
                  class="hour-icon"
                  :icon="getWeatherIcon(hour.condition, hour.isDay)"
                  :color="getWeatherColor(hour.condition, hour.isDay)"
                  size="25"
                />

                <span class="hour-time">{{ hour.time }}</span>
              </button>
            </div>
          </div>

          <div v-else class="status-message">
            No hourly forecast available.
          </div>

          <div class="hourly-navigation">
            <span class="selected-hour-info">
              <v-icon size="17">mdi-clock-outline</v-icon>
              {{ activeHourly.time }}
              <span>· {{ displayTemp(activeHourly.temp) }}</span>
              <span>· {{ activeHourly.condition }}</span>
            </span>

            <div class="navigation-buttons">
              <v-btn
                icon
                size="small"
                variant="outlined"
                aria-label="Previous hour"
                :disabled="selectedHour === 0"
                @click="moveHour(-1)"
              >
                <v-icon>mdi-chevron-left</v-icon>
              </v-btn>

              <v-btn
                icon
                size="small"
                variant="outlined"
                aria-label="Next hour"
                :disabled="selectedHour >= hourly.length - 1"
                @click="moveHour(1)"
              >
                <v-icon>mdi-chevron-right</v-icon>
              </v-btn>
            </div>
          </div>
        </section>

        <!-- Additional weather details -->
        <section class="details-grid">
          <article class="detail-card">
            <v-icon size="24">mdi-thermometer</v-icon>
            <span>Feels like</span>
            <strong>{{ displayTemp(weather.feelsLike) }}</strong>
          </article>

          <article class="detail-card">
            <v-icon size="24">mdi-water-percent</v-icon>
            <span>Humidity</span>
            <strong>{{ weather.humidity }}%</strong>
          </article>

          <article class="detail-card">
            <v-icon size="24">mdi-weather-windy</v-icon>
            <span>Wind speed</span>
            <strong>{{ weather.wind.toFixed(1) }} km/h</strong>
          </article>

          <article class="detail-card">
            <v-icon size="24">mdi-weather-sunny</v-icon>
            <span>UV index</span>
            <strong>{{ weather.uv }}</strong>
          </article>
        </section>

        <footer class="weather-footer">
          <span>
            Last updated: {{ currentWeather.last_updated }}
          </span>
          <span>Weather data by WeatherAPI</span>
        </footer>
      </template>
    </section>
  </main>
</template>

<style>
.weather-page {
  --weather-accent: #ffc44d;

  width: 100%;
  max-width: none !important;
  min-width: 0;
  min-height: calc(100vh - var(--v-layout-top, 64px));
  min-height: calc(100dvh - var(--v-layout-top, 64px));
  margin: 0 !important;
  padding: 0 !important;
  color: #f5f5f5;
  background: #0a0a0a;
  font-family: Inter, Roboto, Arial, sans-serif;
  box-sizing: border-box;
}

.weather-page *,
.weather-page *::before,
.weather-page *::after {
  box-sizing: border-box;
}

.weather-dashboard {
  display: flex;
  flex-direction: column;
  width: 100% !important;
  max-width: none !important;
  min-width: 0;
  min-height: calc(100vh - var(--v-layout-top, 64px));
  min-height: calc(100dvh - var(--v-layout-top, 64px));
  margin: 0 !important;
  padding: clamp(20px, 3vw, 48px);
  overflow: hidden;
  color: #f5f5f5;
  border: 0;
  border-radius: 0;
  background:
    radial-gradient(ellipse at 52% 24%, rgba(90, 90, 90, 0.12), transparent 36%),
    linear-gradient(135deg, #191919 0%, #101010 54%, #080808 100%);
}

.weather-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  width: 100%;
  min-height: 34px;
  margin-bottom: clamp(24px, 4vh, 48px);
}

.location-button,
.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 7px 0;
  color: #ededed;
  font: inherit;
  font-size: 12px;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.location-button span {
  overflow-wrap: anywhere;
}

.location-button:hover,
.reset-button:hover {
  color: var(--weather-accent);
}

.date-label {
  color: #999;
  font-size: 11px;
}

.header-actions {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.header-actions :deep(.v-btn) {
  color: #ddd;
}

.unit-button {
  border-color: #444;
}

.location-search {
  display: flex;
  gap: 10px;
  width: min(100%, 500px);
  margin: 0 auto 24px;
}

.location-search :deep(.v-field) {
  color: #eee;
  background: rgba(255, 255, 255, 0.035);
}

.search-btn {
  align-self: center;
  flex-shrink: 0;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  min-height: 40vh;
  color: #aaa;
  text-align: center;
}

.error-alert {
  margin-bottom: 20px;
}

.weather-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) minmax(280px, 0.95fr);
  align-items: center;
  gap: clamp(20px, 3vw, 48px);
  width: 100%;
  max-width: none;
  flex: 1;
}

.current-weather {
  min-width: 0;
  padding: 15px 0;
}

.temperature-line {
  display: flex;
  align-items: flex-start;
  line-height: 0.95;
}

.main-temperature {
  font-size: clamp(72px, 8vw, 132px);
  font-weight: 300;
  letter-spacing: -0.075em;
  overflow-wrap: anywhere;
}

.temperature-unit {
  margin: 7px 0 0 9px;
  font-size: clamp(17px, 2vw, 26px);
  font-weight: 300;
}

.condition-title {
  margin: 18px 0 0;
  color: #c4c4c4;
  font-size: clamp(22px, 2.4vw, 36px);
  font-weight: 300;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.feels-like {
  margin: 10px 0 0;
  color: #8e8e8e;
  font-size: 12px;
}

.weather-stats {
  display: flex;
  flex-wrap: wrap;
  gap: clamp(18px, 2.5vw, 34px);
  margin-top: clamp(24px, 4vh, 46px);
}

.stat-item {
  min-width: 0;
}

.stat-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
  color: #aaa;
  font-size: 11px;
}

.stat-value {
  font-size: clamp(17px, 1.8vw, 25px);
  font-weight: 400;
  overflow-wrap: anywhere;
}

.extra-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 24px;
  color: #aaa;
  font-size: 11px;
}

.extra-stats > div {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Vector-based main weather icon */
.weather-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-width: 0;
  min-height: 260px;
  text-align: center;
}

.main-weather-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: clamp(180px, 25vw, 360px);
  height: clamp(180px, 25vw, 360px);
  max-width: 100%;
  overflow: visible;
}

.main-weather-icon {
  width: 100%;
  height: 100%;
  font-size: clamp(150px, 20vw, 290px);
  filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.3));
  transition: transform 0.25s ease, color 0.25s ease;
}

.main-weather-icon-wrap:hover .main-weather-icon {
  transform: translateY(-5px) scale(1.035);
}

.illustration-caption {
  margin-top: -5px;
  color: #777;
  font-size: 11px;
}

.forecast-column {
  min-width: 0;
  width: 100%;
  padding: 12px 0;
}

.forecast-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  color: #eee;
  font-size: 13px;
  font-weight: 500;
}

.forecast-heading :deep(.v-icon) {
  color: #aaa;
}

.forecast-panel {
  width: 100%;
  padding: 7px 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.025);
}

.forecast-day {
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  color: #eee;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;
}

.forecast-day:hover,
.forecast-day--active {
  background: rgba(255, 255, 255, 0.065);
}

.forecast-indicator {
  position: absolute;
  top: 20%;
  bottom: 20%;
  left: 3px;
  width: 3px;
  border-radius: 5px;
  background: transparent;
}

.forecast-day--active .forecast-indicator {
  background: var(--weather-accent);
}

.forecast-icon {
  flex-shrink: 0;
}

.forecast-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.forecast-name {
  font-size: 11px;
  font-weight: 500;
}

.forecast-condition {
  overflow: hidden;
  color: #929292;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.forecast-temps {
  display: flex;
  align-items: flex-end;
  flex-direction: column;
  gap: 3px;
  flex-shrink: 0;
  font-size: 11px;
}

.forecast-temps strong {
  font-weight: 500;
}

.forecast-temps span {
  color: #888;
  font-size: 10px;
}

.forecast-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  color: #aaa;
  background: transparent;
  border: 0;
  font-size: 11px;
  cursor: pointer;
}

.forecast-more:hover {
  color: var(--weather-accent);
}

.forecast-details {
  padding: 8px 13px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.forecast-details > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 9px;
  color: #999;
  font-size: 11px;
}

.forecast-details strong {
  color: #eee;
  font-weight: 500;
}

.hourly-section {
  width: 100%;
  margin-top: clamp(28px, 5vh, 55px);
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.section-heading h2 {
  color: #eee;
  font-size: 15px;
  font-weight: 500;
}

.section-heading p {
  margin-top: 4px;
  color: #777;
  font-size: 11px;
}

.hourly-chart {
  position: relative;
  width: 100%;
  height: clamp(130px, 17vh, 185px);
}

.temperature-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.hourly-points {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: space-between;
}

.hour-point {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 0;
  color: #eee;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.hour-temp {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  font-size: clamp(13px, 1.5vw, 19px);
  font-weight: 300;
}

.hour-point:hover .hour-temp,
.hour-point--active .hour-temp {
  color: var(--weather-accent);
}

.hour-icon {
  margin-top: 6px;
}

.hour-time {
  position: absolute;
  bottom: 7px;
  padding: 4px 5px;
  color: #999;
  border-radius: 4px;
  font-size: clamp(8px, 1vw, 10px);
  white-space: nowrap;
}

.hour-point--active .hour-time {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.hourly-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.selected-hour-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 7px;
  min-width: 0;
  color: #999;
  font-size: 11px;
}

.navigation-buttons {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.navigation-buttons :deep(.v-btn) {
  color: #ddd;
  border-color: #444;
  border-radius: 9px;
}

.navigation-buttons :deep(.v-btn:hover) {
  color: var(--weather-accent);
  border-color: var(--weather-accent);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: clamp(25px, 4vh, 40px);
}

.detail-card {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: clamp(13px, 1.8vw, 22px);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.025);
}

.detail-card :deep(.v-icon) {
  color: #bbb;
}

.detail-card span {
  color: #888;
  font-size: 11px;
}

.detail-card strong {
  color: #eee;
  font-size: clamp(15px, 1.8vw, 22px);
  font-weight: 400;
  overflow-wrap: anywhere;
}

.weather-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
  padding-top: 15px;
  color: #666;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 10px;
}

/* Tablet and smaller desktop */
@media (max-width: 1100px) {
  .weather-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px;
  }

  .current-weather {
    grid-column: 1;
    grid-row: 1;
  }

  .weather-illustration {
    grid-column: 2;
    grid-row: 1;
  }

  .forecast-column {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .forecast-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-weather-icon-wrap {
    width: clamp(160px, 30vw, 270px);
    height: clamp(160px, 30vw, 270px);
  }

  .main-weather-icon {
    font-size: clamp(140px, 24vw, 230px);
  }
}

/* Mobile */
@media (max-width: 600px) {
  .weather-page {
    min-height: calc(100dvh - var(--v-layout-top, 56px));
  }

  .weather-dashboard {
    min-height: calc(100dvh - var(--v-layout-top, 56px));
    padding: 16px 13px;
  }

  .weather-header {
    justify-content: flex-start;
    gap: 5px 10px;
    margin-bottom: 18px;
  }

  .location-button {
    max-width: calc(100% - 95px);
    font-size: 11px;
  }

  .date-label {
    width: 100%;
    font-size: 10px;
  }

  .header-actions {
    top: 0;
    right: 0;
  }

  .location-search {
    flex-direction: column;
    gap: 8px;
  }

  .search-btn {
    width: 100%;
  }

  .weather-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .current-weather {
    grid-column: 1;
    grid-row: 1;
    padding: 12px 0 0;
  }

  .main-temperature {
    font-size: clamp(75px, 22vw, 110px);
  }

  .condition-title {
    margin-top: 12px;
    font-size: clamp(21px, 6vw, 28px);
  }

  .weather-stats {
    gap: 24px;
    margin-top: 24px;
  }

  .stat-value {
    font-size: 18px;
  }

  .weather-illustration {
    grid-column: 1;
    grid-row: 2;
    min-height: 150px;
    padding: 0;
  }

  .main-weather-icon-wrap {
    width: clamp(145px, 48vw, 200px);
    height: clamp(145px, 48vw, 200px);
  }

  .main-weather-icon {
    font-size: clamp(125px, 42vw, 180px);
  }

  .illustration-caption {
    margin-top: -10px;
  }

  .forecast-column {
    grid-column: 1;
    grid-row: 3;
    padding-top: 8px;
  }

  .forecast-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .forecast-day {
    padding: 8px 12px;
  }

  .hourly-section {
    margin-top: 25px;
    padding-top: 16px;
  }

  .hourly-chart {
    height: 135px;
  }

  .hour-temp {
    font-size: 12px;
  }

  .hour-time {
    padding: 3px;
    font-size: 8px;
  }

  .hourly-navigation {
    align-items: flex-start;
  }

  .selected-hour-info {
    font-size: 10px;
  }

  .details-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 24px;
  }

  .detail-card {
    gap: 8px;
    padding: 13px;
  }

  .detail-card strong {
    font-size: 17px;
  }

  .weather-footer {
    align-items: flex-start;
    flex-direction: column;
    margin-top: 22px;
  }
}

@media (max-width: 360px) {
  .weather-dashboard {
    padding: 12px 9px;
  }

  .weather-stats {
    gap: 16px;
  }

  .forecast-condition {
    max-width: 145px;
  }

  .selected-hour-info {
    gap: 4px;
  }
}
</style>
