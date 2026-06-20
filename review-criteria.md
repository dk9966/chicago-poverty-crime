# Chicago Crime Dashboard — Review Criteria

## [10] Providing a proper URL to the dashboard, and the dashboard appears at that URL without any further user intervention.

**URL:** `https://dk9966.github.io/chicago-poverty-crime/`

Static D3 site served from the `client/` folder. Opening the URL loads the dashboard immediately — no login, build step, or extra clicks.

---

## [30] What is one question that the dashboard can answer by utilizing two or more simultaneously displayed charts? What is the answer? How do these two charts indicate the answer?

**Question:** Where is crime highest in Chicago?

**Answer:** Crime is concentrated on the South and West Sides. Fuller Park has the highest rate (322 crimes/1k/yr), followed by West Garfield Park (279), Englewood (243), and North Lawndale (239). The map shows these areas clustering south and west of downtown. Most top areas also have high poverty — but the Loop ranks sixth (207/1k) at just 14.7% poverty, driven by downtown commercial traffic rather than neighborhood poverty alone.

**How the charts show it:**
- **Map** — shows where the highest-crime areas sit in the city (South/West Side clusters vs. downtown).
- **Scatter** — ranks areas by crime rate on the y-axis and reveals whether high crime tracks with poverty; the Loop sits far above the trend despite low poverty.
- **Together** — the map answers *where*; the scatter explains *what kind* of high-crime area each neighborhood is (high-poverty residential vs. low-poverty commercial).

Neither chart alone is sufficient: the map hides exact rate rankings and poverty context; the scatter hides geography.

---

## [10] Upload a screenshot of your dashboard answering that question by showing two or more simultaneously displayed charts.

**Screenshot:** `[attach when submitting]`

**Suggested capture:** Click Fuller Park on the map to highlight the highest-crime area, then note on the scatter that it sits in the high-poverty, high-crime quadrant — contrast with the Loop, a high-crime dot with low poverty. Both charts visible on screen.

---

## [20] How does the layout of these charts promote visual understanding of the data across multiple charts? Do the charts follow a consistent color scheme and are they well aligned with each other to promote better visual comparisons.

Side-by-side 50/50 layout: map (geography) on the left, scatter (crime in context of poverty) on the right — the map leads with the geographic answer; the scatter adds explanatory detail.

Both charts share one sequential crime-rate scale (cream → deep red) with a shared gradient legend. Selected areas use the same accent blue on map polygon borders and scatter dot outlines. Non-selected areas dim uniformly when filtered, so the eye tracks the same neighborhoods across both views.

---

## [10] Indicate which chart should be graded as a "first" chart. Then justify the choice of this chart type, its axes and marks based on the data variables it shows.

**First chart:** Choropleth map (left).

- **Type:** Choropleth — community area is a geographic unit; only a spatial view shows where crime rates are highest and whether hotspots cluster on the South Side, West Side, or downtown.
- **Axes:** Implicit geographic projection of Chicago's 77 community areas.
- **Marks:** Polygons filled by crime rate (annual reported crimes per 1,000 residents, 2019–2024 average).

---

## [10] Indicate which chart should be graded as a "second" chart. Then justify the choice of this chart type, its axes and marks based on the data variables it shows.

**Second chart:** Scatter plot (right).

- **Type:** Scatter — crime rate and poverty are both continuous; the goal is to compare areas by rate and see whether the highest-crime neighborhoods share a poverty profile.
- **X-axis:** Household poverty rate (%).
- **Y-axis:** Annual reported crimes per 1,000 residents (2019–2024 average).
- **Marks:** One dot per community area, colored by crime rate (shared sequential scale); dashed line shows the poverty–crime trend.

---

## [10] How does your dashboard provide details on demand?

Hovering any map polygon or scatter dot shows a tooltip with: community area name, crime rate, poverty %, total crimes (2019–2024), population, and distance above/below the poverty–crime trend line.

---

## [10] How does your dashboard support cross-filtering between these two charts?

Bi-directional filtering between map and scatter:

- **Map → scatter:** Click a community area; its dot highlights and others dim; click empty space to clear.
- **Scatter → map:** Click a dot or drag a rectangle on the scatter; matching areas highlight on the map and others dim.
- **Reset** clears brush and selection on both charts.

Both directions update the same shared highlight state, so selections in either chart immediately reflect in the other.
