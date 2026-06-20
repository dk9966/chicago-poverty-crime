// Where Is Crime Highest in Chicago? — cross-filtered D3 dashboard.
//
// Map and scatter share the active metric for dot/polygon color (crime or poverty).
//
// Cross-filtering is bi-directional: click or brush on either chart filters the other.

const DATA_URL = "data/areas.json";
const GEO_URL = "data/community-areas.geojson";

const RATE_COLORS = ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"];
const POVERTY_COLORS = ["#edf8fb", "#b2df8a", "#66c2a4", "#2ca25f", "#006d2c"];
const ACCENT = "#2563eb";
const MAP_TRANSITION_MS = 500;

const fmtCount = d3.format(",");
const fmtRate = (v) => v.toFixed(1);
const fmtPct = (v) => `${v.toFixed(1)}%`;

const state = {
  brush: null,
  mapBrush: null,
  selectedArea: null,
  mapMetric: "crimeRate",
  transform: d3.zoomIdentity,
  suppressSelectionClear: false,
};

const tooltip = d3.select("#tooltip");
const statusEl = d3.select("#status");

let areas = [];
let geo;
let crimeColorScale;
let povertyColorScale;
let scatterChart;
let mapChart;
let areaCentroids = new Map();

const MAP_METRICS = {
  crimeRate: {
    label: "Crime rate",
    value: (d) => d.crimeRate,
    format: (v) => `${fmtRate(v)} / 1k`,
    colors: RATE_COLORS,
  },
  povertyPct: {
    label: "Poverty rate",
    value: (d) => d.povertyPct,
    format: (v) => fmtPct(v),
    colors: POVERTY_COLORS,
  },
};

init();

async function init() {
  const payload = await d3.json(DATA_URL);
  geo = await d3.json(GEO_URL);
  areas = payload.areas;

  crimeColorScale = d3
    .scaleQuantize()
    .domain([0, d3.max(areas, (d) => d.crimeRate)])
    .range(RATE_COLORS);

  povertyColorScale = d3
    .scaleQuantize()
    .domain([0, d3.max(areas, (d) => d.povertyPct)])
    .range(POVERTY_COLORS);

  buildColorLegend();
  scatterChart = createScatter();
  mapChart = createMap();
  wireControls();
  updateMapToggle();
  update();
}

function mapMetricConfig() {
  return MAP_METRICS[state.mapMetric];
}

function metricColor(row) {
  return state.mapMetric === "crimeRate"
    ? crimeColorScale(row.crimeRate)
    : povertyColorScale(row.povertyPct);
}

// Repaints `selection` with `colorOf`. attrTween only exists on transitions,
// so the non-animated path must use plain .attr to avoid throwing.
function applyFill(selection, animate, colorOf) {
  if (!animate) {
    selection.attr("fill", colorOf);
    return;
  }
  selection
    .transition()
    .duration(MAP_TRANSITION_MS)
    .ease(d3.easeCubicInOut)
    .attrTween("fill", function (d) {
      const interp = d3.interpolateRgb(
        d3.color(d3.select(this).attr("fill")),
        d3.color(colorOf(d))
      );
      return (t) => interp(t);
    });
}

function buildMetricLegend(containerSelector, metricId, gradientId) {
  const legend = d3.select(containerSelector);
  legend.html("");

  legend
    .append("span")
    .attr("class", "map-legend__metric")
    .attr("id", metricId)
    .text(mapMetricConfig().label);

  const svg = legend.append("svg").attr("width", 120).attr("height", 12);
  const linear = svg
    .append("defs")
    .append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("x2", "100%");

  mapMetricConfig().colors.forEach((c, i) => {
    linear
      .append("stop")
      .attr("offset", `${(100 * i) / (mapMetricConfig().colors.length - 1)}%`)
      .attr("stop-color", c);
  });

  svg
    .append("rect")
    .attr("class", "map-legend__swatch")
    .attr("width", 120)
    .attr("height", 12)
    .attr("rx", 4)
    .style("fill", `url(#${gradientId})`);

  legend.append("span").attr("class", "map-legend__label").text("Low");
  legend.append("span").attr("class", "map-legend__label").text("High");
}

function buildColorLegend() {
  buildMetricLegend("#color-legend", "color-legend-metric", "color-legend-gradient");
}

function updateColorLegend(animate = false) {
  const metricEl = d3.select("#color-legend-metric");
  const stops = d3.select("#color-legend-gradient").selectAll("stop");
  const nextColors = mapMetricConfig().colors;

  if (animate) {
    metricEl
      .transition()
      .duration(200)
      .style("opacity", 0)
      .on("end", () => {
        metricEl.text(mapMetricConfig().label);
        metricEl.transition().duration(200).style("opacity", 1);
      });

    stops
      .data(nextColors)
      .transition()
      .duration(MAP_TRANSITION_MS)
      .ease(d3.easeCubicInOut)
      .attr("stop-color", (c) => c);
  } else {
    metricEl.text(mapMetricConfig().label).style("opacity", 1);
    stops.data(nextColors).attr("stop-color", (c) => c);
  }
}

function setMapMetric(metric, animate = true) {
  if (state.mapMetric === metric) return;
  state.mapMetric = metric;
  updateMapToggle();
  updateColorLegend(animate);
  update({ animateMetric: animate });
}

function updateMapToggle() {
  d3.selectAll(".map-metric__btn").classed(
    "map-metric__btn--active",
    function () {
      return d3.select(this).attr("data-metric") === state.mapMetric;
    }
  );
  d3.select("#map-metric-indicator").classed(
    "map-metric__indicator--poverty",
    state.mapMetric === "povertyPct"
  );
}
function isHighlighted(d, zx, zy) {
  if (state.selectedArea && d.id !== state.selectedArea) return false;
  if (state.brush) {
    const [[x0, y0], [x1, y1]] = state.brush;
    const px = zx(d.povertyPct);
    const py = zy(d.crimeRate);
    if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  }
  if (state.mapBrush) {
    const [[x0, y0], [x1, y1]] = state.mapBrush;
    const [cx, cy] = areaCentroids.get(d.id);
    const xMin = Math.min(x0, x1);
    const xMax = Math.max(x0, x1);
    const yMin = Math.min(y0, y1);
    const yMax = Math.max(y0, y1);
    if (cx < xMin || cx > xMax || cy < yMin || cy > yMax) return false;
  }
  return true;
}

function anyFilterActive() {
  return state.brush || state.mapBrush || state.selectedArea;
}

function clearAllFilters() {
  state.selectedArea = null;
  scatterChart?.clearBrush();
  mapChart?.clearBrush();
}

function createScatter() {
  const width = 580;
  const height = 430;
  const margin = { top: 16, right: 18, bottom: 48, left: 62 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3
    .select("#scatter-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const x = d3
    .scaleLinear()
    .domain(padded(d3.extent(areas, (d) => d.povertyPct), 2))
    .range([0, innerW]);

  const y = d3
    .scaleLinear()
    .domain(padded(d3.extent(areas, (d) => d.crimeRate), 5))
    .range([innerH, 0]);

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const gGrid = root.append("g").attr("class", "chart__grid");
  const gTrend = root.append("g");
  const gBrush = root.append("g").attr("class", "brush");
  const clipId = "scatter-clip";
  root
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("width", innerW)
    .attr("height", innerH);
  const gDots = root.append("g").attr("clip-path", `url(#${clipId})`);

  const gx = root
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`);
  const gy = root.append("g").attr("class", "axis");

  root
    .append("text")
    .attr("class", "axis__label")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .text("Households below poverty (%)");

  root
    .append("text")
    .attr("class", "axis__label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -46)
    .attr("text-anchor", "middle")
    .text("Crimes per 1,000 residents / year");

  const trendLine = gTrend.append("line").attr("class", "chart__trend");

  const dots = gDots
    .selectAll("circle")
    .data(areas, (d) => d.id)
    .join("circle")
    .attr("class", "dot")
    .attr("r", 6)
    .attr("fill", (d) => metricColor(d))
    .on("click", (event, d) => {
      event.stopPropagation();
      state.selectedArea = state.selectedArea === d.id ? null : d.id;
      if (state.selectedArea) {
        state.suppressSelectionClear = true;
        gBrush.call(brush.move, null);
        state.brush = null;
        mapChart.clearBrush();
        state.suppressSelectionClear = false;
      }
      update();
    })
    .on("mouseover", (event, d) => showScatterTooltip(event, d))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  const brush = d3
    .brush()
    .extent([
      [0, 0],
      [innerW, innerH],
    ])
    .on("brush end", (event) => {
      if (event.selection) {
        state.brush = event.selection;
        state.selectedArea = null;
        mapChart.clearBrush();
      } else if (event.sourceEvent && !state.suppressSelectionClear) {
        clearAllFilters();
      } else {
        state.brush = null;
      }
      update();
    });
  gBrush.call(brush);

  const zoom = d3
    .zoom()
    .scaleExtent([1, 6])
    .translateExtent([
      [0, 0],
      [innerW, innerH],
    ])
    .extent([
      [0, 0],
      [innerW, innerH],
    ])
    .filter((event) => event.type === "wheel")
    .on("zoom", (event) => {
      state.transform = event.transform;
      update();
    });
  svg.call(zoom);

  function zoomedScales() {
    return {
      zx: state.transform.rescaleX(x),
      zy: state.transform.rescaleY(y),
    };
  }

  function render(animate = false) {
    const { zx, zy } = zoomedScales();

    gx.call(d3.axisBottom(zx).ticks(8).tickFormat((d) => `${d}%`));
    gy.call(d3.axisLeft(zy).ticks(7).tickFormat(fmtRate));
    gGrid.call(
      d3
        .axisLeft(zy)
        .ticks(7)
        .tickSize(-innerW)
        .tickFormat("")
    );
    gGrid.select(".domain").remove();

    const regression = linearRegression(areas);
    trendLine
      .attr("x1", zx(x.domain()[0]))
      .attr("y1", zy(regression.predict(x.domain()[0])))
      .attr("x2", zx(x.domain()[1]))
      .attr("y2", zy(regression.predict(x.domain()[1])));

    const anyFilter = anyFilterActive();
    dots
      .attr("cx", (d) => zx(d.povertyPct))
      .attr("cy", (d) => zy(d.crimeRate))
      .classed("dot--dimmed", (d) => anyFilter && !isHighlighted(d, zx, zy))
      .classed(
        "dot--active",
        (d) => anyFilter && isHighlighted(d, zx, zy)
      );

    applyFill(dots, animate, (d) => metricColor(d));
  }

  function clearBrush() {
    state.suppressSelectionClear = true;
    gBrush.call(brush.move, null);
    state.brush = null;
    state.suppressSelectionClear = false;
  }

  function resetView() {
    svg.call(zoom.transform, d3.zoomIdentity);
    clearBrush();
    state.transform = d3.zoomIdentity;
  }

  return { render, resetView, clearBrush, zoomedScales };
}

function createMap() {
  const width = 580;
  const height = 430;
  const margin = { top: 8, right: 8, bottom: 8, left: 8 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3
    .select("#map-chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  root
    .append("rect")
    .attr("class", "map-bg")
    .attr("width", innerW)
    .attr("height", innerH)
    .attr("fill", "transparent");

  const projection = d3.geoMercator().fitSize([innerW, innerH], geo);
  const path = d3.geoPath().projection(projection);
  const gMapBrush = root.append("g").attr("class", "brush");
  const gAreas = root.append("g");

  const areaById = new Map(areas.map((d) => [d.id, d]));

  geo.features.forEach((feature) => {
    const areaId = Number(feature.properties.area);
    if (areaById.has(areaId)) {
      areaCentroids.set(areaId, path.centroid(feature));
    }
  });

  const mapBrush = d3
    .brush()
    .extent([
      [0, 0],
      [innerW, innerH],
    ])
    .on("brush end", (event) => {
      if (event.selection) {
        state.mapBrush = event.selection;
        state.selectedArea = null;
        scatterChart.clearBrush();
      } else if (event.sourceEvent && !state.suppressSelectionClear) {
        clearAllFilters();
      } else {
        state.mapBrush = null;
      }
      update();
    });
  gMapBrush.call(mapBrush);

  const features = geo.features
    .map((feature) => {
      const areaId = Number(feature.properties.area);
      const row = areaById.get(areaId);
      return { feature, areaId, row };
    })
    .filter((d) => d.row);

  const paths = gAreas
    .selectAll("path.map-area")
    .data(features, (d) => d.areaId)
    .join("path")
    .attr("class", "map-area")
    .attr("d", (d) => path(d.feature))
    .attr("fill", (d) => metricColor(d.row))
    .on("click", (event, d) => {
      event.stopPropagation();
      state.selectedArea =
        state.selectedArea === d.areaId ? null : d.areaId;
      if (state.selectedArea) {
        state.suppressSelectionClear = true;
        gMapBrush.call(mapBrush.move, null);
        state.mapBrush = null;
        scatterChart.clearBrush();
        state.suppressSelectionClear = false;
      }
      update();
    })
    .on("mouseover", (event, d) => showMapTooltip(event, d.row))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  function render(animate = false) {
    const { zx, zy } = scatterChart.zoomedScales();
    const anyFilter = anyFilterActive();

    paths.attr("class", (d) => {
      let cls = "map-area";
      const highlighted = isHighlighted(d.row, zx, zy);
      if (anyFilter && !highlighted) cls += " map-area--dimmed";
      if (state.selectedArea === d.areaId) cls += " map-area--selected";
      return cls;
    });

    applyFill(paths, animate, (d) => metricColor(d.row));
  }

  function clearBrush() {
    state.suppressSelectionClear = true;
    gMapBrush.call(mapBrush.move, null);
    state.mapBrush = null;
    state.suppressSelectionClear = false;
  }

  return { render, clearBrush };
}

function wireControls() {
  d3.select("#reset").on("click", () => {
    clearAllFilters();
    scatterChart.resetView();
    update();
  });

  d3.selectAll(".map-metric__btn").on("click", function () {
    setMapMetric(d3.select(this).attr("data-metric"));
  });

  document.addEventListener("click", (event) => {
    if (!anyFilterActive()) return;
    const target = event.target;
    if (target.closest(".dot, .map-area")) return;
    if (target.closest("#scatter-chart, #map-chart")) return;
    if (target.closest(".controls__reset, .map-metric__btn")) return;
    clearAllFilters();
    update();
  });
}

function update({ animateMetric = false } = {}) {
  scatterChart.render(animateMetric);
  mapChart.render(animateMetric);
  renderStatus();
}

function renderStatus() {
  const { zx, zy } = scatterChart.zoomedScales();
  const highlighted = areas.filter((d) => isHighlighted(d, zx, zy));
  const parts = [`${highlighted.length} of ${areas.length} areas`];
  if (state.selectedArea) {
    parts.push(areas.find((d) => d.id === state.selectedArea).name);
  }
  if (state.brush || state.mapBrush) parts.push("brushed");
  if (highlighted.length) {
    parts.push(
      `avg rate ${fmtRate(d3.mean(highlighted, (d) => d.crimeRate))}/1k`
    );
  }
  statusEl.text(parts.join(" · "));
}

function showScatterTooltip(event, d) {
  const residual = d.crimeRate - linearRegression(areas).predict(d.povertyPct);
  const trendLabel =
    residual >= 0
      ? `+${fmtRate(residual)} above trend`
      : `${fmtRate(residual)} below trend`;

  tooltip
    .html(
      `<div class="tooltip__title">${d.name}</div>` +
        `<div class="tooltip__row"><span>Poverty</span><strong>${fmtPct(d.povertyPct)}</strong></div>` +
        `<div class="tooltip__row"><span>Crime rate</span><strong>${fmtRate(d.crimeRate)} / 1k</strong></div>` +
        `<div class="tooltip__row"><span>Total crimes</span><strong>${fmtCount(d.totalCrimes)}</strong></div>` +
        `<div class="tooltip__row"><span>Population</span><strong>${fmtCount(d.population)}</strong></div>` +
        `<div class="tooltip__row"><span>vs. trend</span><strong>${trendLabel}</strong></div>`
    )
    .classed("tooltip--visible", true)
    .attr("aria-hidden", "false");
  moveTooltip(event);
}

function showMapTooltip(event, d) {
  const metric = mapMetricConfig();
  const metricValue = metric.value(d);

  tooltip
    .html(
      `<div class="tooltip__title">${d.name}</div>` +
        `<div class="tooltip__row"><span>${metric.label}</span><strong>${metric.format(metricValue)}</strong></div>` +
        `<div class="tooltip__row"><span>Crime rate</span><strong>${fmtRate(d.crimeRate)} / 1k</strong></div>` +
        `<div class="tooltip__row"><span>Poverty</span><strong>${fmtPct(d.povertyPct)}</strong></div>` +
        `<div class="tooltip__row"><span>Total crimes</span><strong>${fmtCount(d.totalCrimes)}</strong></div>` +
        `<div class="tooltip__row"><span>Population</span><strong>${fmtCount(d.population)}</strong></div>`
    )
    .classed("tooltip--visible", true)
    .attr("aria-hidden", "false");
  moveTooltip(event);
}

function moveTooltip(event) {
  const pad = 14;
  const node = tooltip.node();
  const w = node.offsetWidth;
  const h = node.offsetHeight;
  let left = event.clientX + pad;
  let top = event.clientY + pad;
  if (left + w > window.innerWidth) left = event.clientX - w - pad;
  if (top + h > window.innerHeight) top = event.clientY - h - pad;
  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.classed("tooltip--visible", false).attr("aria-hidden", "true");
}

function linearRegression(rows) {
  const n = rows.length;
  const sumX = d3.sum(rows, (d) => d.povertyPct);
  const sumY = d3.sum(rows, (d) => d.crimeRate);
  const sumXY = d3.sum(rows, (d) => d.povertyPct * d.crimeRate);
  const sumXX = d3.sum(rows, (d) => d.povertyPct * d.povertyPct);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return {
    slope,
    intercept,
    predict: (x) => slope * x + intercept,
  };
}

function padded([min, max], pad) {
  return [Math.max(0, min - pad), max + pad];
}
