\
// V4 fixed: 無登入、自動載入行程 + 基礎 debug

var STORAGE_KEY = "sydneyDiaryTripsV4";
var THEME_KEY = "sydneyDiaryThemeV1";

var stateTrips = null;
var currentTripIndex = 0;
var currentDayIndex = 0;
var isEditMode = false;

// 僅放一個簡化行程，先確認能否顯示
var baseTrips = [
  {
    id: "sydney-10d",
    name: "雪梨跨年 10 日遊",
    dateRange: "2025/12/23 – 2026/01/02",
    days: [
      {
        id: "depart",
        title: "出發日｜TPE → SYD",
        date: "2025/12/23",
        subtitle: "晚班機飛往雪梨，在機上休息調時差",
        stay: {
          name: "機上過夜"
        },
        weather: {
          icon: "✈️",
          label: "查看桃園機場天氣",
          linkUrl: "https://www.google.com/search?q=taoyuan+airport+weather+2025-12-23"
        },
        health: {
          highCalorie: false,
          walkingTarget: 3000,
          balanced: true
        },
        schedule: [
          {
            time: "20:30",
            endTime: "22:30",
            title: "前往桃園機場・辦理登機",
            detail: "抵達機場、報到、托運行李，通過安檢與出境。",
            transport: "自行前往桃園機場。",
            photoSpot: false
          },
          {
            time: "23:50",
            endTime: "",
            title: "23:50 TPE → SYD",
            detail: "上機後調整時差，盡量在機上睡覺休息。",
            transport: "飛機。",
            photoSpot: false
          }
        ],
        meals: {
          breakfast: null,
          lunch: null,
          dinner: {
            name: "機場或機上餐",
            type: "輕食／飛機餐",
            needReservation: false,
            note: "依班機時間彈性用餐。"
          }
        }
      }
    ]
  }
];

// DOM 元素
var tripListEl = document.getElementById("trip-list");
var dayTabsEl = document.getElementById("day-tabs");
var dayHeaderEl = document.getElementById("day-header");
var dayScheduleEl = document.getElementById("day-schedule");
var dayMealsEl = document.getElementById("day-meals");

var themeColorInput = document.getElementById("theme-color");
var rRange = document.getElementById("r-range");
var gRange = document.getElementById("g-range");
var bRange = document.getElementById("b-range");
var resetThemeBtn = document.getElementById("reset-theme-btn");

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function loadTrips() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      stateTrips = JSON.parse(raw);
      if (stateTrips && stateTrips.length) {
        return;
      }
    }
  } catch (e) {
    console.warn("讀取 localStorage 失敗，使用預設行程。", e);
  }
  stateTrips = deepClone(baseTrips);
  saveTrips();
}

function saveTrips() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateTrips));
  } catch (e) {
    console.warn("寫入 localStorage 失敗。", e);
  }
}

// 主題
function applyTheme(theme) {
  var root = document.documentElement;
  root.style.setProperty("--primary-color", theme.primary);
  root.style.setProperty("--accent-color", theme.primary);
  root.style.setProperty("--bg-color", theme.bg || "#f5f5f7");

  if (themeColorInput) themeColorInput.value = theme.hex;
  if (rRange) rRange.value = theme.r;
  if (gRange) gRange.value = theme.g;
  if (bRange) bRange.value = theme.b;
}

function defaultTheme() {
  return {
    primary: "rgb(17,24,39)",
    r: 17,
    g: 24,
    b: 39,
    hex: "#111827",
    bg: "#f5f5f7"
  };
}

function loadTheme() {
  try {
    var raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      var t = JSON.parse(raw);
      if (t && t.primary) {
        applyTheme(t);
        return;
      }
    }
  } catch (e) {
    console.warn("讀取主題失敗，使用預設。", e);
  }
  var t2 = defaultTheme();
  applyTheme(t2);
  saveTheme(t2);
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  } catch (e) {}
}

function rgbToHex(r, g, b) {
  function toHex(x) {
    var h = x.toString(16);
    return h.length === 1 ? "0" + h : h;
  }
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function initThemeControls() {
  if (themeColorInput) {
    themeColorInput.addEventListener("input", function (e) {
      var hex = e.target.value;
      var r = parseInt(hex.slice(1, 3), 16);
      var g = parseInt(hex.slice(3, 5), 16);
      var b = parseInt(hex.slice(5, 7), 16);
      var theme = {
        primary: "rgb(" + r + "," + g + "," + b + ")",
        r: r,
        g: g,
        b: b,
        hex: hex,
        bg: "#f5f5f7"
      };
      applyTheme(theme);
      saveTheme(theme);
    });
  }

  [rRange, gRange, bRange].forEach(function (range) {
    if (range) {
      range.addEventListener("input", function () {
        var r = parseInt(rRange.value || "17", 10);
        var g = parseInt(gRange.value || "24", 10);
        var b = parseInt(bRange.value || "39", 10);
        var hex = rgbToHex(r, g, b);
        var theme = {
          primary: "rgb(" + r + "," + g + "," + b + ")",
          r: r,
          g: g,
          b: b,
          hex: hex,
          bg: "#f5f5f7"
        };
        applyTheme(theme);
        saveTheme(theme);
      });
    }
  });

  if (resetThemeBtn) {
    resetThemeBtn.addEventListener("click", function () {
      var t = defaultTheme();
      applyTheme(t);
      saveTheme(t);
    });
  }
}

// 旅程列表
function initTrips() {
  if (!stateTrips || !stateTrips.length) {
    tripListEl.innerHTML = "<li>（沒有行程資料）</li>";
    return;
  }
  tripListEl.innerHTML = "";
  stateTrips.forEach(function (trip, index) {
    var li = document.createElement("li");
    li.className = "trip-item";
    li.textContent = trip.name + "｜" + trip.dateRange;
    li.setAttribute("data-trip-index", index);
    li.addEventListener("click", function () {
      selectTrip(index);
    });
    tripListEl.appendChild(li);
  });
  selectTrip(0);
}

function selectTrip(index) {
  currentTripIndex = index;
  var trip = stateTrips[index];
  var items = document.querySelectorAll(".trip-item");
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    it.classList.toggle("active", parseInt(it.getAttribute("data-trip-index"), 10) === index);
  }
  if (trip.days && trip.days.length) {
    selectDay(0);
  } else {
    dayTabsEl.innerHTML = "";
    dayHeaderEl.innerHTML = "<p>尚未有行程</p>";
    dayScheduleEl.innerHTML = "";
    dayMealsEl.innerHTML = "";
  }
}

function renderDayTabs(trip, activeIndex) {
  dayTabsEl.innerHTML = "";
  if (!trip || !trip.days) return;
  for (var i = 0; i < trip.days.length; i++) {
    var day = trip.days[i];
    var btn = document.createElement("button");
    btn.className = "day-tab" + (i === activeIndex ? " active" : "");
    var labelPrefix;
    if (i === 0) labelPrefix = "出發日";
    else if (i === trip.days.length - 1) labelPrefix = "回家日";
    else labelPrefix = "D" + i;
    btn.textContent = labelPrefix + "｜" + day.date;
    (function (idx) {
      btn.addEventListener("click", function () {
        selectDay(idx);
      });
    })(i);
    dayTabsEl.appendChild(btn);
  }
}

function selectDay(dayIndex) {
  currentDayIndex = dayIndex;
  var trip = stateTrips[currentTripIndex];
  var day = trip.days[dayIndex];
  renderDayTabs(trip, dayIndex);
  renderDay(day);
}

// 渲染單日（簡化）
function renderDay(day) {
  if (!day) {
    dayHeaderEl.innerHTML = "<p>尚未有行程</p>";
    dayScheduleEl.innerHTML = "";
    dayMealsEl.innerHTML = "";
    return;
  }

  var bannerHtml = "";
  if (day.stay || day.weather) {
    bannerHtml += '<div class="day-banner">';
    bannerHtml += "<div>";
    if (day.stay) {
      bannerHtml += '<span class="banner-label">🏨 今晚住宿</span>';
      bannerHtml += "<span>" + (day.stay.name || "") + "</span>";
    }
    bannerHtml += "</div>";
    if (day.weather) {
      var url = day.weather.linkUrl || "#";
      var icon = day.weather.icon || "⛅";
      var label = day.weather.label || "查看今日天氣";
      bannerHtml += '<div class="banner-weather">';
      bannerHtml += '<span class="weather-icon">' + icon + "</span>";
      bannerHtml += '<a href="' + url + '" target="_blank" rel="noopener noreferrer">';
      bannerHtml += '<span class="weather-text">' + label + "</span>";
      bannerHtml += "</a></div>";
    }
    bannerHtml += "</div>";
  }

  var subtitleText = day.date + "｜" + (day.subtitle || "");

  dayHeaderEl.innerHTML =
    bannerHtml +
    '<div class="day-title">' +
    day.title +
    "</div>" +
    '<div class="day-subtitle">' +
    subtitleText +
    "</div>";

  // 時間軸
  dayScheduleEl.innerHTML = '<div class="section-title">📋 行程時間軸（測試版）</div>';
  if (!day.schedule || !day.schedule.length) {
    dayScheduleEl.innerHTML += '<p style="font-size:13px;color:#6b7280;">這一天還沒有填寫行程。</p>';
  } else {
    for (var i = 0; i < day.schedule.length; i++) {
      var b = day.schedule[i];
      var row = document.createElement("div");
      row.className = "schedule-row";
      var timeText = b.time + (b.endTime ? "–" + b.endTime : "");
      row.innerHTML =
        '<div class="time-cell">' +
        timeText +
        "</div>" +
        "<div>" +
        '<div class="block-title">' +
        b.title +
        "</div>" +
        '<div class="block-detail">' +
        (b.detail || "") +
        "</div>" +
        '<div class="block-meta">' +
        (b.transport || "") +
        "</div>" +
        "</div>";
      dayScheduleEl.appendChild(row);
    }
  }

  // 三餐簡化
  dayMealsEl.innerHTML = '<div class="section-title">🍽️ 今日三餐（測試版）</div>';
  var mealsWrap = document.createElement("div");
  mealsWrap.className = "meals-grid";

  var mealOrder = [
    ["breakfast", "早餐"],
    ["lunch", "午餐"],
    ["dinner", "晚餐"]
  ];

  for (var j = 0; j < mealOrder.length; j++) {
    var key = mealOrder[j][0];
    var label = mealOrder[j][1];
    var card = document.createElement("div");
    card.className = "meal-card";
    var meal = day.meals ? day.meals[key] : null;
    if (meal) {
      card.innerHTML =
        '<div class="meal-title">' +
        label +
        "</div>" +
        '<div class="meal-restaurant">' +
        meal.name +
        "</div>" +
        '<div class="meal-note">類型：' +
        (meal.type || "—") +
        "</div>";
    } else {
      card.innerHTML =
        '<div class="meal-title">' +
        label +
        "</div>" +
        '<div class="meal-note" style="font-size:12px;color:#9ca3af;">尚未安排。</div>';
    }
    mealsWrap.appendChild(card);
  }

  dayMealsEl.appendChild(mealsWrap);
}

// 初始化
window.addEventListener("DOMContentLoaded", function () {
  loadTheme();
  initThemeControls();
  loadTrips();
  initTrips();
});
