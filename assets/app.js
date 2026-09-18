(() => {
  "use strict";

  /* =========================================================================
     Constants & data model
  ========================================================================= */

  const STORAGE_KEY = "finch.v1";
  const THEME_KEY = "finch.theme";

  const CATEGORIES = [
    { id: "housing",       label: "Housing",           color: "--series-1" },
    { id: "food",          label: "Food & Dining",     color: "--series-2" },
    { id: "transport",     label: "Transportation",    color: "--series-3" },
    { id: "shopping",      label: "Shopping",          color: "--series-4" },
    { id: "entertainment", label: "Entertainment",     color: "--series-5" },
    { id: "health",        label: "Health",            color: "--series-6" },
    { id: "bills",         label: "Bills & Utilities", color: "--series-7" },
    { id: "other",         label: "Other",             color: "--series-8" },
  ];
  const INCOME_CATEGORIES = [
    { id: "salary",     label: "Salary" },
    { id: "freelance",  label: "Freelance" },
    { id: "investment", label: "Investments" },
    { id: "other-inc",  label: "Other income" },
  ];
  const CAT_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
  const INC_BY_ID = new Map(INCOME_CATEGORIES.map((c) => [c.id, c]));

  function categoryLabel(id) {
    return CAT_BY_ID.get(id)?.label || INC_BY_ID.get(id)?.label || id;
  }
  function categoryColorVar(id, type) {
    if (type === "income") return "--good";
    return CAT_BY_ID.get(id)?.color || "--series-8";
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* =========================================================================
     Utilities
  ========================================================================= */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  const currencyFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const currencyCompactFmt = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1,
  });
  const pctFmt = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

  function formatCurrency(n, compact = false) {
    const f = compact ? currencyCompactFmt : currencyFmt;
    return f.format(n);
  }
  function formatDate(d, style = "short") {
    const date = d instanceof Date ? d : new Date(d);
    if (style === "short") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (style === "med") return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (style === "month") return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    return date.toISOString().slice(0, 10);
  }
  function isoDay(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toISOString().slice(0, 10);
  }
  function monthKey(d) {
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function niceMax(value) {
    if (value <= 0) return 10;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const norm = value / magnitude;
    let step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 5) step = 5;
    else step = 10;
    return step * magnitude;
  }

  /* =========================================================================
     Seeded sample data
  ========================================================================= */

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DESCS = {
    housing: ["Monthly rent", "Renters insurance", "HOA fee"],
    food: ["Groceries — Fresh Market", "Groceries — Trader Joe's", "Coffee shop", "Takeout dinner", "Farmers market"],
    transport: ["Gas station", "Transit pass", "Rideshare", "Parking", "Car maintenance"],
    shopping: ["Clothing store", "Online order", "Home goods", "Electronics", "Bookstore"],
    entertainment: ["Streaming subscription", "Movie tickets", "Concert tickets", "Video game", "Music subscription"],
    health: ["Pharmacy", "Gym membership", "Doctor visit", "Dental checkup"],
    bills: ["Electric bill", "Internet & phone", "Water bill", "Insurance premium"],
    other: ["Gift", "Donation", "Miscellaneous", "Bank fee"],
    salary: ["Paycheck — Acme Corp"],
    freelance: ["Freelance project", "Consulting invoice"],
    investment: ["Dividend payout", "Interest income"],
    "other-inc": ["Refund", "Cash gift", "Side sale"],
  };

  function randChoice(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
  function randBetween(rng, lo, hi) { return lo + rng() * (hi - lo); }

  function generateSampleData() {
    const rng = mulberry32(20240914);
    const txns = [];
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 12, 1);

    for (let cursor = new Date(start); cursor <= today; cursor.setMonth(cursor.getMonth() + 1)) {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const monthEnd = new Date(y, m + 1, 0);
      const lastDay = Math.min(monthEnd.getDate(), today.getMonth() === m && today.getFullYear() === y ? today.getDate() : monthEnd.getDate());
      const push = (day, type, category, amount, desc) => {
        const d = new Date(y, m, Math.min(day, lastDay));
        if (d > today) return;
        txns.push({ id: uid(), date: isoDay(d), type, category, amount: Math.round(amount * 100) / 100, description: desc });
      };

      // Income
      push(1, "income", "salary", randBetween(rng, 2350, 2550), randChoice(rng, DESCS.salary));
      if (lastDay >= 15) push(15, "income", "salary", randBetween(rng, 2350, 2550), randChoice(rng, DESCS.salary));
      if (rng() < 0.3) push(Math.ceil(randBetween(rng, 5, 25)), "income", "freelance", randBetween(rng, 200, 950), randChoice(rng, DESCS.freelance));
      if (rng() < 0.4) push(Math.ceil(randBetween(rng, 3, 20)), "income", "investment", randBetween(rng, 40, 310), randChoice(rng, DESCS.investment));
      if (rng() < 0.15) push(Math.ceil(randBetween(rng, 5, 25)), "income", "other-inc", randBetween(rng, 30, 220), randChoice(rng, DESCS["other-inc"]));

      // Fixed expenses
      push(1, "expense", "housing", randBetween(rng, 1400, 1520), randChoice(rng, DESCS.housing));
      push(5, "expense", "bills", randBetween(rng, 110, 230), "Electric bill");
      push(8, "expense", "bills", randBetween(rng, 60, 95), "Internet & phone");

      // Groceries — weekly
      for (let w = 0; w < 4; w++) {
        push(Math.min(3 + w * 7 + Math.floor(randBetween(rng, 0, 3)), 28), "expense", "food", randBetween(rng, 35, 105), randChoice(rng, DESCS.food));
      }
      if (rng() < 0.5) push(Math.ceil(randBetween(rng, 1, 28)), "expense", "food", randBetween(rng, 8, 35), "Coffee shop");

      // Transport
      const transportTrips = 2 + Math.floor(randBetween(rng, 0, 3));
      for (let t = 0; t < transportTrips; t++) {
        push(Math.ceil(randBetween(rng, 1, 28)), "expense", "transport", randBetween(rng, 22, 85), randChoice(rng, DESCS.transport));
      }

      // Entertainment
      push(Math.ceil(randBetween(rng, 1, 10)), "expense", "entertainment", randBetween(rng, 12, 20), "Streaming subscription");
      if (rng() < 0.6) push(Math.ceil(randBetween(rng, 10, 28)), "expense", "entertainment", randBetween(rng, 20, 110), randChoice(rng, DESCS.entertainment));

      // Shopping
      const shoppingTrips = Math.floor(randBetween(rng, 1, 4));
      for (let s = 0; s < shoppingTrips; s++) {
        push(Math.ceil(randBetween(rng, 1, 28)), "expense", "shopping", randBetween(rng, 25, 240), randChoice(rng, DESCS.shopping));
      }

      // Health
      if (rng() < 0.7) push(Math.ceil(randBetween(rng, 1, 28)), "expense", "health", randBetween(rng, 15, 75), "Gym membership");
      if (rng() < 0.35) push(Math.ceil(randBetween(rng, 1, 28)), "expense", "health", randBetween(rng, 20, 190), randChoice(rng, DESCS.health));

      // Other
      if (rng() < 0.4) push(Math.ceil(randBetween(rng, 1, 28)), "expense", "other", randBetween(rng, 10, 150), randChoice(rng, DESCS.other));
    }

    txns.sort((a, b) => a.date.localeCompare(b.date));
    const budgets = { housing: 1550, food: 500, transport: 280, shopping: 300, entertainment: 150, health: 150, bills: 260, other: 100 };
    return { transactions: txns, budgets };
  }

  /* =========================================================================
     State
  ========================================================================= */

  let state = {
    transactions: [],
    budgets: {},
    range: "all",
    theme: "auto",
    sort: { key: "date", dir: "desc" },
    filters: { search: "", category: "all", type: "all" },
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        state.budgets = parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {};
        return true;
      }
    } catch (e) { /* corrupted storage, fall through to seed */ }
    return false;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ transactions: state.transactions, budgets: state.budgets }));
  }

  function seedIfEmpty(force = false) {
    if (force || !loadState() || state.transactions.length === 0) {
      const sample = generateSampleData();
      state.transactions = sample.transactions;
      state.budgets = sample.budgets;
      saveState();
    }
  }

  /* =========================================================================
     Theme
  ========================================================================= */

  function applyTheme() {
    const theme = localStorage.getItem(THEME_KEY) || "auto";
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
  }
  function toggleTheme() {
    const current = localStorage.getItem(THEME_KEY) || "auto";
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    let next;
    if (current === "auto") next = sysDark ? "light" : "dark";
    else if (current === "light") next = "dark";
    else next = "auto";
    localStorage.setItem(THEME_KEY, next);
    applyTheme();
    showToast(`Theme: ${next}`);
    renderAll(); // colors read via cssVar need fresh computed values
  }

  /* =========================================================================
     Derived data / selectors
  ========================================================================= */

  function todayDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getRangeWindow(range) {
    const end = todayDate();
    let start;
    if (range === "30") start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    else if (range === "90") start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 89);
    else if (range === "ytd") start = new Date(end.getFullYear(), 0, 1);
    else {
      const dates = state.transactions.map((t) => t.date).sort();
      start = dates.length ? new Date(dates[0]) : new Date(end.getFullYear(), end.getMonth() - 12, 1);
    }
    const spanMs = end - start;
    const prevEnd = new Date(start.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    return { start, end, prevStart, prevEnd, isAll: range === "all" };
  }

  function inWindow(dateStr, start, end) {
    const t = new Date(dateStr).getTime();
    return t >= start.getTime() && t <= end.getTime() + 86399999;
  }

  function sumTotals(txns) {
    let income = 0, expense = 0;
    for (const t of txns) { if (t.type === "income") income += t.amount; else expense += t.amount; }
    return { income, expense, net: income - expense };
  }

  function currentBalance() {
    const { income, expense } = sumTotals(state.transactions);
    return income - expense;
  }

  function balanceSeries() {
    const sorted = [...state.transactions].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const byDay = new Map();
    for (const t of sorted) {
      running += t.type === "income" ? t.amount : -t.amount;
      byDay.set(t.date, running);
    }
    return Array.from(byDay.entries()).map(([date, value]) => ({ date, value }));
  }

  function balanceAt(dateObj, series) {
    const target = isoDay(dateObj);
    let val = 0;
    for (const p of series) { if (p.date <= target) val = p.value; else break; }
    return val;
  }

  function monthlyIncomeExpense(monthsCount) {
    const end = todayDate();
    const months = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: formatDate(d, "month"), income: 0, expense: 0 });
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));
    for (const t of state.transactions) {
      const k = monthKey(t.date);
      if (idx.has(k)) {
        const bucket = months[idx.get(k)];
        if (t.type === "income") bucket.income += t.amount; else bucket.expense += t.amount;
      }
    }
    return months;
  }

  function categoryBreakdown(txns) {
    const sums = new Map();
    for (const t of txns) {
      if (t.type !== "expense") continue;
      sums.set(t.category, (sums.get(t.category) || 0) + t.amount);
    }
    return CATEGORIES
      .map((c) => ({ ...c, amount: sums.get(c.id) || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  function currentMonthSpend() {
    const now = new Date();
    const k = monthKey(now);
    const sums = new Map();
    for (const t of state.transactions) {
      if (t.type !== "expense") continue;
      if (monthKey(t.date) !== k) continue;
      sums.set(t.category, (sums.get(t.category) || 0) + t.amount);
    }
    return sums;
  }

  /* =========================================================================
     Toast
  ========================================================================= */

  let toastTimer = null;
  function showToast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  /* =========================================================================
     SVG chart helpers
  ========================================================================= */

  const SVG_NS = "http://www.w3.org/2000/svg";
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  function roundedTopRectPath(x, y, w, h, r) {
    r = Math.min(r, w / 2, Math.max(h, 0));
    if (h <= 0) return `M${x},${y + h} h${w} v0 h${-w} Z`;
    if (h < r) r = h;
    return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
  }

  function ensureTooltip(wrap) {
    let tip = wrap.querySelector(".chart-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tooltip";
      wrap.appendChild(tip);
    }
    return tip;
  }
  function positionTooltip(tip, wrap, clientX, clientY) {
    const rect = wrap.getBoundingClientRect();
    let left = clientX - rect.left;
    let top = clientY - rect.top;
    left = clamp(left, 60, rect.width - 60);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(top, 70)}px`;
  }

  /* ---- Balance over time (single-series line + area) ---- */
  function renderBalanceChart(range) {
    const wrap = $("#balanceChart");
    wrap.innerHTML = "";
    const { start, end } = getRangeWindow(range);
    const series = balanceSeries();
    const startVal = balanceAt(start, series);
    const pointsInWindow = series.filter((p) => inWindow(p.date, start, end));
    const points = [{ date: isoDay(start), value: startVal }, ...pointsInWindow];
    if (points.length < 2) points.push({ date: isoDay(end), value: startVal });

    const endVal = points[points.length - 1].value;
    const prevVal = points[0].value;
    const delta = endVal - prevVal;
    $("#balanceSub").textContent = `${formatDate(start, "med")} – ${formatDate(end, "med")}`;

    const VW = 600, VH = 220, PAD_L = 46, PAD_R = 14, PAD_T = 16, PAD_B = 24;
    const plotW = VW - PAD_L - PAD_R, plotH = VH - PAD_T - PAD_B;

    const values = points.map((p) => p.value);
    const minV = Math.min(0, ...values);
    const maxV = niceMax(Math.max(...values, 1));
    const range_ = maxV - minV || 1;

    const x = (i) => PAD_L + (i / (points.length - 1)) * plotW;
    const y = (v) => PAD_T + plotH - ((v - minV) / range_) * plotH;

    const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: "none", width: "100%", height: "220" });

    // gridlines (4 steps)
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = minV + (range_ * i) / steps;
      const gy = y(v);
      svg.appendChild(svgEl("line", { class: i === 0 && minV === 0 ? "chart-baseline" : "chart-gridline", x1: PAD_L, x2: VW - PAD_R, y1: gy, y2: gy }));
      const label = svgEl("text", { class: "chart-axis-label", x: PAD_L - 8, y: gy + 3, "text-anchor": "end" });
      label.textContent = formatCurrency(v, true);
      svg.appendChild(label);
    }

    // x-axis labels (first, middle, last)
    [0, Math.floor((points.length - 1) / 2), points.length - 1].forEach((i) => {
      const lbl = svgEl("text", { class: "chart-axis-label", x: x(i), y: VH - 4, "text-anchor": i === 0 ? "start" : i === points.length - 1 ? "end" : "middle" });
      lbl.textContent = formatDate(points[i].date, "short");
      svg.appendChild(lbl);
    });

    // area
    const seriesColor = cssVar("--series-1");
    let areaD = `M${x(0)},${y(points[0].value)}`;
    points.forEach((p, i) => { if (i > 0) areaD += ` L${x(i)},${y(p.value)}`; });
    areaD += ` L${x(points.length - 1)},${y(minV)} L${x(0)},${y(minV)} Z`;
    svg.appendChild(svgEl("path", { d: areaD, fill: seriesColor, opacity: "0.1", stroke: "none" }));

    // line
    let lineD = `M${x(0)},${y(points[0].value)}`;
    points.forEach((p, i) => { if (i > 0) lineD += ` L${x(i)},${y(p.value)}`; });
    svg.appendChild(svgEl("path", { d: lineD, fill: "none", stroke: seriesColor, "stroke-width": "2", "stroke-linejoin": "round", "stroke-linecap": "round" }));

    // end dot + direct label
    const lastX = x(points.length - 1), lastY = y(points[points.length - 1].value);
    svg.appendChild(svgEl("circle", { cx: lastX, cy: lastY, r: 4, fill: seriesColor, stroke: cssVar("--surface-1"), "stroke-width": 2 }));
    const endLabel = svgEl("text", {
      class: "chart-value-label", x: clamp(lastX, PAD_L, VW - PAD_R - 60), y: lastY - 10,
      "text-anchor": lastX > VW - PAD_R - 40 ? "end" : "middle",
    });
    endLabel.textContent = formatCurrency(points[points.length - 1].value, true);
    svg.appendChild(endLabel);

    // crosshair + hit layer
    const crosshair = svgEl("line", { class: "chart-crosshair", x1: 0, x2: 0, y1: PAD_T, y2: VH - PAD_B, opacity: 0 });
    svg.appendChild(crosshair);
    const hoverDot = svgEl("circle", { r: 4.5, fill: seriesColor, stroke: cssVar("--surface-1"), "stroke-width": 2, opacity: 0 });
    svg.appendChild(hoverDot);

    const hit = svgEl("rect", { class: "chart-hit", x: PAD_L, y: PAD_T, width: plotW, height: plotH, tabindex: "0" });
    svg.appendChild(hit);
    wrap.appendChild(svg);
    const tip = ensureTooltip(wrap);

    function showAt(i, clientX, clientY) {
      const p = points[i];
      crosshair.setAttribute("x1", x(i)); crosshair.setAttribute("x2", x(i)); crosshair.setAttribute("opacity", 1);
      hoverDot.setAttribute("cx", x(i)); hoverDot.setAttribute("cy", y(p.value)); hoverDot.setAttribute("opacity", 1);
      tip.innerHTML = "";
      const title = document.createElement("div"); title.className = "chart-tooltip-title"; title.textContent = formatDate(p.date, "med");
      const row = document.createElement("div"); row.className = "chart-tooltip-row";
      const key = document.createElement("span"); key.className = "chart-tooltip-key"; key.style.background = seriesColor;
      const name = document.createElement("span"); name.className = "chart-tooltip-name"; name.textContent = "Balance";
      const val = document.createElement("span"); val.className = "chart-tooltip-value"; val.textContent = formatCurrency(p.value);
      row.append(key, name, val);
      tip.append(title, row);
      tip.classList.add("is-visible");
      positionTooltip(tip, wrap, clientX, clientY);
    }
    function hide() {
      crosshair.setAttribute("opacity", 0); hoverDot.setAttribute("opacity", 0); tip.classList.remove("is-visible");
    }
    function handleMove(evt) {
      const rect = svg.getBoundingClientRect();
      const relX = ((evt.clientX - rect.left) / rect.width) * VW;
      const i = clamp(Math.round(((relX - PAD_L) / plotW) * (points.length - 1)), 0, points.length - 1);
      showAt(i, evt.clientX, evt.clientY);
    }
    hit.addEventListener("pointermove", handleMove);
    hit.addEventListener("pointerleave", hide);
    hit.addEventListener("pointerdown", handleMove);
    hit.addEventListener("focus", () => showAt(points.length - 1, wrap.getBoundingClientRect().right, wrap.getBoundingClientRect().top));
    hit.addEventListener("blur", hide);
  }

  /* ---- Income vs expenses (grouped bars) ---- */
  function renderIELegend() {
    const el = $("#ieLegend");
    el.innerHTML = "";
    const items = [{ label: "Income", color: cssVar("--series-1") }, { label: "Expenses", color: cssVar("--series-2") }];
    for (const it of items) {
      const wrap = document.createElement("span"); wrap.className = "legend-item";
      const sw = document.createElement("span"); sw.className = "legend-swatch"; sw.style.background = it.color;
      const txt = document.createElement("span"); txt.textContent = it.label;
      wrap.append(sw, txt); el.appendChild(wrap);
    }
  }

  function renderIEChart(range) {
    const wrap = $("#ieChart");
    wrap.innerHTML = "";
    const monthsCount = range === "30" ? 3 : range === "90" ? 4 : range === "ytd" ? (new Date().getMonth() + 1) : 12;
    const months = monthlyIncomeExpense(clamp(monthsCount, 2, 12));

    const VW = 600, VH = 220, PAD_L = 46, PAD_R = 14, PAD_T = 16, PAD_B = 24;
    const plotW = VW - PAD_L - PAD_R, plotH = VH - PAD_T - PAD_B;
    const maxV = niceMax(Math.max(...months.map((m) => Math.max(m.income, m.expense)), 1));

    const bandW = plotW / months.length;
    const barW = clamp(bandW * 0.28, 6, 24);
    const gap = 2;
    const y = (v) => PAD_T + plotH - (v / maxV) * plotH;

    const svg = svgEl("svg", { class: "chart", viewBox: `0 0 ${VW} ${VH}`, preserveAspectRatio: "none", width: "100%", height: "220" });

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = (maxV * i) / steps;
      const gy = y(v);
      svg.appendChild(svgEl("line", { class: i === 0 ? "chart-baseline" : "chart-gridline", x1: PAD_L, x2: VW - PAD_R, y1: gy, y2: gy }));
      const label = svgEl("text", { class: "chart-axis-label", x: PAD_L - 8, y: gy + 3, "text-anchor": "end" });
      label.textContent = formatCurrency(v, true);
      svg.appendChild(label);
    }

    const incomeColor = cssVar("--series-1"), expenseColor = cssVar("--series-2");
    const tip = ensureTooltip(wrap);

    months.forEach((m, i) => {
      const cx = PAD_L + bandW * i + bandW / 2;
      const incX = cx - gap / 2 - barW;
      const expX = cx + gap / 2;
      const incH = (m.income / maxV) * plotH;
      const expH = (m.expense / maxV) * plotH;

      const incPath = svgEl("path", { class: "bar-mark", d: roundedTopRectPath(incX, y(m.income), barW, incH, 4), fill: incomeColor });
      const expPath = svgEl("path", { class: "bar-mark", d: roundedTopRectPath(expX, y(m.expense), barW, expH, 4), fill: expenseColor });
      svg.append(incPath, expPath);

      const label = svgEl("text", { class: "chart-axis-label", x: cx, y: VH - 4, "text-anchor": "middle" });
      label.textContent = m.label;
      svg.appendChild(label);

      const hitRect = svgEl("rect", {
        class: "chart-hit", x: PAD_L + bandW * i, y: PAD_T, width: bandW, height: plotH, tabindex: "0",
      });
      hitRect.addEventListener("pointerenter", () => { incPath.classList.add("is-hovered"); expPath.classList.add("is-hovered"); });
      hitRect.addEventListener("pointerleave", () => { incPath.classList.remove("is-hovered"); expPath.classList.remove("is-hovered"); tip.classList.remove("is-visible"); });
      hitRect.addEventListener("pointermove", (evt) => {
        tip.innerHTML = "";
        const title = document.createElement("div"); title.className = "chart-tooltip-title";
        title.textContent = new Date(m.key + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" });
        tip.appendChild(title);
        [["Income", incomeColor, m.income], ["Expenses", expenseColor, m.expense]].forEach(([name, color, val]) => {
          const row = document.createElement("div"); row.className = "chart-tooltip-row";
          const key = document.createElement("span"); key.className = "chart-tooltip-key"; key.style.background = color;
          const n = document.createElement("span"); n.className = "chart-tooltip-name"; n.textContent = name;
          const v = document.createElement("span"); v.className = "chart-tooltip-value"; v.textContent = formatCurrency(val);
          row.append(key, n, v); tip.appendChild(row);
        });
        tip.classList.add("is-visible");
        positionTooltip(tip, wrap, evt.clientX, evt.clientY);
      });
      svg.appendChild(hitRect);
    });

    wrap.appendChild(svg);
  }

  /* ---- Category ranked bars (HTML) ---- */
  function renderCategoryChart(range) {
    const { start, end } = getRangeWindow(range);
    const txns = state.transactions.filter((t) => inWindow(t.date, start, end));
    const cats = categoryBreakdown(txns);
    const total = cats.reduce((s, c) => s + c.amount, 0);
    $("#categorySub").textContent = total > 0 ? `${formatCurrency(total)} total spent` : "No expenses in this period";
    const el = $("#categoryChart");
    el.innerHTML = "";
    if (cats.length === 0) {
      const empty = document.createElement("p"); empty.className = "rank-empty"; empty.textContent = "No spending recorded yet.";
      el.appendChild(empty);
      return;
    }
    const max = cats[0].amount;
    for (const c of cats) {
      const row = document.createElement("div"); row.className = "rank-row";
      const label = document.createElement("div"); label.className = "rank-label"; label.textContent = c.label; label.title = c.label;
      const track = document.createElement("div"); track.className = "rank-track";
      const fill = document.createElement("div"); fill.className = "rank-fill";
      fill.style.width = `${clamp((c.amount / max) * 100, 2, 100)}%`;
      fill.style.background = cssVar(c.color);
      track.appendChild(fill);
      const value = document.createElement("div"); value.className = "rank-value"; value.textContent = formatCurrency(c.amount);
      value.title = `${pctFmt.format(c.amount / total)} of total`;
      row.append(label, track, value);
      el.appendChild(row);
    }
  }

  /* ---- Budgets (meters) ---- */
  function renderBudgets() {
    const el = $("#budgetList");
    el.innerHTML = "";
    const spend = currentMonthSpend();
    const rows = CATEGORIES
      .map((c) => ({ ...c, budget: Number(state.budgets[c.id]) || 0, spent: spend.get(c.id) || 0 }))
      .filter((c) => c.budget > 0)
      .sort((a, b) => (b.spent / b.budget) - (a.spent / a.budget));

    if (rows.length === 0) {
      const empty = document.createElement("p"); empty.className = "budget-empty";
      empty.textContent = "No budgets set yet. Click Edit to set monthly limits per category.";
      el.appendChild(empty);
      return;
    }

    for (const r of rows) {
      const ratio = r.spent / r.budget;
      const row = document.createElement("div"); row.className = "budget-row";
      const head = document.createElement("div"); head.className = "budget-row-head";
      const catEl = document.createElement("div"); catEl.className = "budget-cat";
      const dot = document.createElement("span"); dot.className = "budget-dot"; dot.style.background = cssVar(r.color);
      catEl.append(dot, document.createTextNode(r.label));
      const figures = document.createElement("div"); figures.className = "budget-figures";
      const strong = document.createElement("strong"); strong.textContent = formatCurrency(r.spent);
      figures.append(strong, document.createTextNode(` of ${formatCurrency(r.budget)}`));
      head.append(catEl, figures);

      const track = document.createElement("div"); track.className = "meter-track"; track.style.background = cssVar("--grid");
      const fill = document.createElement("div"); fill.className = "meter-fill";
      fill.style.width = `${clamp(ratio * 100, 0, 100)}%`;
      fill.style.background = ratio >= 1 ? cssVar("--critical") : ratio >= 0.8 ? cssVar("--warning") : cssVar(r.color);
      track.appendChild(fill);

      row.append(head, track);

      if (ratio >= 1) {
        const status = document.createElement("p"); status.className = "budget-status is-critical";
        status.textContent = `Over budget by ${formatCurrency(r.spent - r.budget)}`;
        row.appendChild(status);
      } else if (ratio >= 0.8) {
        const status = document.createElement("p"); status.className = "budget-status is-warning";
        status.textContent = `${pctFmt.format(ratio)} of budget used`;
        row.appendChild(status);
      }
      el.appendChild(row);
    }
  }

  /* =========================================================================
     KPI tiles
  ========================================================================= */

  function sparkline(values, accentColor) {
    const VW = 120, VH = 30;
    if (values.length < 2) return "";
    const min = Math.min(...values), max = Math.max(...values);
    const spanV = max - min || 1;
    const x = (i) => (i / (values.length - 1)) * VW;
    const y = (v) => VH - ((v - min) / spanV) * (VH - 4) - 2;
    let d = `M${x(0)},${y(values[0])}`;
    values.forEach((v, i) => { if (i > 0) d += ` L${x(i)},${y(v)}`; });
    const lastX = x(values.length - 1), lastY = y(values[values.length - 1]);
    return `<svg class="kpi-spark" viewBox="0 0 ${VW} ${VH}" preserveAspectRatio="none">
      <path d="${d}" fill="none" stroke="${cssVar('--text-muted')}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.55"/>
      <circle cx="${lastX}" cy="${lastY}" r="2.5" fill="${accentColor}"/>
    </svg>`;
  }

  function deltaBadge(pct, invert = false) {
    if (pct === null) return `<span class="kpi-delta flat">—</span>`;
    const isUp = pct > 0.001, isDown = pct < -0.001;
    const cls = !isUp && !isDown ? "flat" : (isUp ? (invert ? "down" : "up") : (invert ? "up" : "down"));
    const arrow = isUp ? "▲" : isDown ? "▼" : "•";
    return `<span class="kpi-delta ${cls}">${arrow} ${pctFmt.format(Math.abs(pct))}</span>`;
  }

  function renderKPIs(range) {
    const { start, end, prevStart, prevEnd, isAll } = getRangeWindow(range);
    const windowTxns = state.transactions.filter((t) => inWindow(t.date, start, end));
    const prevTxns = isAll ? [] : state.transactions.filter((t) => inWindow(t.date, prevStart, prevEnd));

    const cur = sumTotals(windowTxns);
    const prev = sumTotals(prevTxns);
    const balance = currentBalance();
    const series = balanceSeries();
    const balance30ago = balanceAt(new Date(todayDate().getTime() - 30 * 86400000), series);

    const savingsRate = cur.income > 0 ? (cur.income - cur.expense) / cur.income : 0;
    const prevSavingsRate = prev.income > 0 ? (prev.income - prev.expense) / prev.income : null;

    const pct = (a, b) => (b === 0 || b === null || isAll ? null : (a - b) / Math.abs(b));

    // sparkline series: last 8 balance snapshots (weekly-ish) and monthly income/expense
    const balSpark = [];
    for (let i = 7; i >= 0; i--) balSpark.push(balanceAt(new Date(todayDate().getTime() - i * 7 * 86400000), series));
    const months6 = monthlyIncomeExpense(6);
    const incomeSpark = months6.map((m) => m.income);
    const expenseSpark = months6.map((m) => m.expense);

    const tiles = [
      {
        label: "Net balance", value: formatCurrency(balance, true),
        delta: isAll ? null : deltaBadge(pct(balance, balance30ago)),
        spark: sparkline(balSpark, cssVar("--series-1")),
      },
      {
        label: "Income", value: formatCurrency(cur.income, true),
        delta: deltaBadge(pct(cur.income, prev.income)),
        spark: sparkline(incomeSpark, cssVar("--series-1")),
      },
      {
        label: "Expenses", value: formatCurrency(cur.expense, true),
        delta: deltaBadge(pct(cur.expense, prev.expense), true),
        spark: sparkline(expenseSpark, cssVar("--series-2")),
      },
      {
        label: "Savings rate", value: pctFmt.format(savingsRate),
        delta: deltaBadge(prevSavingsRate === null || isAll ? null : savingsRate - prevSavingsRate),
        spark: "",
      },
    ];

    const row = $("#kpiRow");
    row.innerHTML = tiles.map((t) => `
      <div class="kpi-tile">
        <div class="kpi-label">${t.label}</div>
        <div class="kpi-value-row">
          <span class="kpi-value">${t.value}</span>
          ${t.delta || ""}
        </div>
        ${t.spark}
      </div>
    `).join("");
  }

  /* =========================================================================
     Transactions table
  ========================================================================= */

  function populateCategorySelects() {
    const filterSel = $("#txnCategoryFilter");
    const formSel = $("#txnCategory");
    const optionsHtml = (withAll) => {
      let html = withAll ? `<option value="all">All categories</option>` : "";
      html += `<optgroup label="Income">` + INCOME_CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("") + `</optgroup>`;
      html += `<optgroup label="Expense">` + CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("") + `</optgroup>`;
      return html;
    };
    filterSel.innerHTML = optionsHtml(true);
    formSel.innerHTML = optionsHtml(false);
  }

  function syncCategoryOptionsForType() {
    const type = $("#txnType").value;
    const formSel = $("#txnCategory");
    Array.from(formSel.querySelectorAll("optgroup")).forEach((g) => {
      g.hidden = (type === "income") !== (g.label === "Income");
    });
    const firstVisible = formSel.querySelector(`optgroup[label="${type === "income" ? "Income" : "Expense"}"] option`);
    if (firstVisible && formSel.selectedOptions[0]?.closest("optgroup")?.hidden !== false) {
      formSel.value = firstVisible.value;
    }
  }

  function getFilteredSortedTransactions() {
    const { search, category, type } = state.filters;
    let list = state.transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (category !== "all" && t.category !== category) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const { key, dir } = state.sort;
    const mult = dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (key === "amount") return (a.amount - b.amount) * mult;
      if (key === "category") return categoryLabel(a.category).localeCompare(categoryLabel(b.category)) * mult;
      if (key === "description") return a.description.localeCompare(b.description) * mult;
      return a.date.localeCompare(b.date) * mult;
    });
    return list;
  }

  function renderTxnTable() {
    const list = getFilteredSortedTransactions();
    const body = $("#txnTableBody");
    body.innerHTML = "";
    $("#txnEmpty").hidden = list.length > 0;
    $("#txnSub").textContent = `${state.transactions.length} transaction${state.transactions.length === 1 ? "" : "s"} total`;

    for (const t of list) {
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td"); tdDate.textContent = formatDate(t.date, "med");
      const tdDesc = document.createElement("td"); tdDesc.textContent = t.description;
      const tdCat = document.createElement("td");
      const chip = document.createElement("span"); chip.className = "txn-cat-chip";
      const dot = document.createElement("span"); dot.className = "txn-cat-dot"; dot.style.background = cssVar(categoryColorVar(t.category, t.type));
      chip.append(dot, document.createTextNode(categoryLabel(t.category)));
      tdCat.appendChild(chip);

      const tdAmt = document.createElement("td"); tdAmt.className = "num";
      const amtSpan = document.createElement("span"); amtSpan.className = `txn-amount ${t.type}`;
      amtSpan.textContent = `${t.type === "income" ? "+" : "−"}${formatCurrency(t.amount)}`;
      tdAmt.appendChild(amtSpan);

      const tdActions = document.createElement("td"); tdActions.className = "col-actions";
      const editBtn = document.createElement("button"); editBtn.className = "row-edit-btn"; editBtn.type = "button"; editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openTxnDialog(t));
      tdActions.appendChild(editBtn);

      tr.append(tdDate, tdDesc, tdCat, tdAmt, tdActions);
      body.appendChild(tr);
    }
  }

  /* =========================================================================
     Dialogs
  ========================================================================= */

  function openTxnDialog(txn = null) {
    const dialog = $("#txnDialog");
    $("#txnDialogTitle").textContent = txn ? "Edit transaction" : "Add transaction";
    $("#txnId").value = txn?.id || "";
    $("#txnDesc").value = txn?.description || "";
    $("#txnAmount").value = txn?.amount ?? "";
    $("#txnType").value = txn?.type || "expense";
    syncCategoryOptionsForType();
    $("#txnCategory").value = txn?.category || "housing";
    $("#txnDate").value = txn?.date || isoDay(todayDate());
    $("#txnDelete").hidden = !txn;
    dialog.showModal();
    $("#txnDesc").focus();
  }

  function closeTxnDialog() { $("#txnDialog").close(); }

  function handleTxnSubmit(evt) {
    evt.preventDefault();
    const id = $("#txnId").value || uid();
    const record = {
      id,
      description: $("#txnDesc").value.trim() || "Untitled",
      amount: Math.abs(Number($("#txnAmount").value)) || 0,
      type: $("#txnType").value,
      category: $("#txnCategory").value,
      date: $("#txnDate").value || isoDay(todayDate()),
    };
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) state.transactions[idx] = record; else state.transactions.push(record);
    saveState();
    closeTxnDialog();
    showToast(idx >= 0 ? "Transaction updated" : "Transaction added");
    renderAll();
  }

  function handleTxnDelete() {
    const id = $("#txnId").value;
    if (!id) return;
    state.transactions = state.transactions.filter((t) => t.id !== id);
    saveState();
    closeTxnDialog();
    showToast("Transaction deleted");
    renderAll();
  }

  function openBudgetDialog() {
    const container = $("#budgetFormFields");
    container.innerHTML = "";
    for (const c of CATEGORIES) {
      const row = document.createElement("div"); row.className = "budget-field-row";
      const label = document.createElement("label");
      const dot = document.createElement("span"); dot.className = "budget-dot"; dot.style.background = cssVar(c.color);
      label.append(dot, document.createTextNode(c.label));
      const input = document.createElement("input");
      input.type = "number"; input.min = "0"; input.step = "10"; input.placeholder = "0";
      input.dataset.cat = c.id;
      input.value = state.budgets[c.id] || "";
      row.append(label, input);
      container.appendChild(row);
    }
    $("#budgetDialog").showModal();
  }

  function handleBudgetSubmit(evt) {
    evt.preventDefault();
    $$("#budgetFormFields input").forEach((input) => {
      const v = Number(input.value);
      if (v > 0) state.budgets[input.dataset.cat] = v; else delete state.budgets[input.dataset.cat];
    });
    saveState();
    $("#budgetDialog").close();
    showToast("Budgets saved");
    renderAll();
  }

  /* =========================================================================
     Import / export
  ========================================================================= */

  function exportData() {
    const blob = new Blob([JSON.stringify({ transactions: state.transactions, budgets: state.budgets }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `finch-export-${isoDay(todayDate())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast("Exported JSON");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.transactions)) throw new Error("Invalid file");
        const cleaned = parsed.transactions
          .filter((t) => t && typeof t.amount === "number" && typeof t.date === "string")
          .map((t) => ({
            id: typeof t.id === "string" ? t.id : uid(),
            description: String(t.description || "Untitled").slice(0, 200),
            amount: Math.abs(Number(t.amount)) || 0,
            type: t.type === "income" ? "income" : "expense",
            category: String(t.category || "other"),
            date: String(t.date).slice(0, 10),
          }));
        state.transactions = cleaned;
        state.budgets = parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {};
        saveState();
        showToast(`Imported ${cleaned.length} transactions`);
        renderAll();
      } catch (e) {
        showToast("Import failed — invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  /* =========================================================================
     Render orchestration
  ========================================================================= */

  function renderAll() {
    renderKPIs(state.range);
    renderBalanceChart(state.range);
    renderIELegend();
    renderIEChart(state.range);
    renderCategoryChart(state.range);
    renderBudgets();
    renderTxnTable();
  }

  /* =========================================================================
     Event wiring
  ========================================================================= */

  function wireEvents() {
    $$(".range-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".range-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        state.range = btn.dataset.range;
        renderKPIs(state.range);
        renderBalanceChart(state.range);
        renderIEChart(state.range);
        renderCategoryChart(state.range);
      });
    });

    $("#addTxnBtn").addEventListener("click", () => openTxnDialog(null));
    $("#txnForm").addEventListener("submit", handleTxnSubmit);
    $("#txnCancel").addEventListener("click", closeTxnDialog);
    $("#txnDelete").addEventListener("click", handleTxnDelete);
    $("#txnType").addEventListener("change", syncCategoryOptionsForType);

    $("#editBudgetsBtn").addEventListener("click", openBudgetDialog);
    $("#budgetForm").addEventListener("submit", handleBudgetSubmit);
    $("#budgetCancel").addEventListener("click", () => $("#budgetDialog").close());

    $("#menuBtn").addEventListener("click", (e) => {
      e.stopPropagation();
      const panel = $("#menuPanel");
      const willShow = panel.hidden;
      panel.hidden = !willShow;
      $("#menuBtn").setAttribute("aria-expanded", String(willShow));
    });
    document.addEventListener("click", (e) => {
      const menu = $(".menu");
      if (!menu.contains(e.target)) { $("#menuPanel").hidden = true; $("#menuBtn").setAttribute("aria-expanded", "false"); }
    });
    $("#themeToggle").addEventListener("click", () => { toggleTheme(); $("#menuPanel").hidden = true; });
    $("#exportBtn").addEventListener("click", () => { exportData(); $("#menuPanel").hidden = true; });
    $("#importInput").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) importData(file);
      e.target.value = "";
      $("#menuPanel").hidden = true;
    });
    $("#resetBtn").addEventListener("click", () => {
      if (confirm("Reset all data and reload the sample dataset? This cannot be undone.")) {
        seedIfEmpty(true);
        showToast("Sample data restored");
        renderAll();
      }
      $("#menuPanel").hidden = true;
    });

    $("#txnSearch").addEventListener("input", (e) => { state.filters.search = e.target.value; renderTxnTable(); });
    $("#txnCategoryFilter").addEventListener("change", (e) => { state.filters.category = e.target.value; renderTxnTable(); });
    $("#txnTypeFilter").addEventListener("change", (e) => { state.filters.type = e.target.value; renderTxnTable(); });

    $$("#txnTable th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.sort.key === key) state.sort.dir = state.sort.dir === "asc" ? "desc" : "asc";
        else { state.sort.key = key; state.sort.dir = key === "date" ? "desc" : "asc"; }
        $$("#txnTable th").forEach((h) => { h.classList.remove("is-sorted"); h.removeAttribute("aria-sort"); });
        th.classList.add("is-sorted");
        th.setAttribute("aria-sort", state.sort.dir === "asc" ? "ascending" : "descending");
        renderTxnTable();
      });
    });

    window.addEventListener("resize", debounce(() => {
      renderBalanceChart(state.range);
      renderIEChart(state.range);
    }, 200));

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if ((localStorage.getItem(THEME_KEY) || "auto") === "auto") renderAll();
    });
  }

  function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  /* =========================================================================
     Init
  ========================================================================= */

  function init() {
    applyTheme();
    seedIfEmpty(false);
    populateCategorySelects();
    wireEvents();
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
