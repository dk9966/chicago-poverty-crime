# Chicago Poverty & Crime Dashboard — Review Criteria

## [10] Providing a proper URL to the dashboard, and the dashboard appears at that URL without any further user intervention.

**URL:** `https://dk9966.github.io/chicago-poverty-crime/`

Static D3 site served from the `client/` folder. Opening the URL loads the dashboard immediately — no login, build step, or extra clicks.

---

## [30] What is one question that the dashboard can answer by utilizing two or more simultaneously displayed charts? What is the answer? How do these two charts indicate the answer?

**Question:** Do poorer Chicago community areas always have higher crime rates?

**Answer:** No. Poverty and crime correlate positively (~+4.4 crimes/1k/yr per poverty point), but many areas break the pattern. The Loop (14.7% poverty, 207/1k) and Near North Side (12.9%, 112/1k) sit far above the trend despite low poverty. Armour Square (40.1%, 79/1k) and South Lawndale (30.7%, 57/1k) have high poverty but crime below the trend.

**How the charts show it:**
- **Scatter** — reveals the overall correlation, trend line, and statistical outliers as abstract points.
- **Map** — shows where those outliers sit geographically (downtown vs. South/West Side).
- **Together** — a dot far from the trend line identifies an exception; the same area on the map explains *where* and *why* (e.g., commercial density vs. residential poverty).

Neither chart alone is sufficient: the scatter hides geography; the map hides poverty.

---

## [10] Upload a screenshot of your dashboard answering that question by showing two or more simultaneously displayed charts.

**Screenshot:** `[attach when submitting]`

**Suggested capture:** Brush the upper-right quadrant (high poverty + high crime) so the map highlights South/West Side areas, then click the Loop on the map to show a high-crime, low-poverty outlier above the trend line. Both charts visible on screen.

---

## [20] How does the layout of these charts promote visual understanding of the data across multiple charts? Do the charts follow a consistent color scheme and are they well aligned with each other to promote better visual comparisons.

Side-by-side 50/50 layout: scatter (relationship) on the left, map (geography) on the right — matching axes are unrelated, so spatial alignment is unnecessary.

Both charts share one sequential crime-rate scale (cream → deep red) with a shared gradient legend. Selected areas use the same accent blue on scatter dot outlines and map polygon borders. Non-selected areas dim uniformly when filtered, so the eye tracks the same neighborhoods across both views.

---

## [10] Indicate which chart should be graded as a "first" chart. Then justify the choice of this chart type, its axes and marks based on the data variables it shows.

**First chart:** Scatter plot (left).

- **Type:** Scatter — both variables are continuous; the goal is correlation strength and outlier detection across 77 areas.
- **X-axis:** Household poverty rate (%).
- **Y-axis:** Annual reported crimes per 1,000 residents (2019–2024 average).
- **Marks:** One dot per community area, colored by crime rate (shared sequential scale); dashed line shows linear trend.

---

## [10] Indicate which chart should be graded as a "second" chart. Then justify the choice of this chart type, its axes and marks based on the data variables it shows.

**Second chart:** Choropleth map (right).

- **Type:** Choropleth — community area is a geographic unit; only a spatial view shows whether high-rate areas cluster downtown, on the South Side, or elsewhere.
- **Axes:** Implicit geographic projection of Chicago's 77 community areas.
- **Marks:** Polygons filled by crime rate using the same sequential scale as the scatter dots.

---

## [10] How does your dashboard provide details on demand?

Hovering any scatter dot or map polygon shows a tooltip with: community area name, poverty %, crime rate, total crimes (2019–2024), population, and distance above/below the poverty–crime trend line.

---

## [10] How does your dashboard support cross-filtering between these two charts?

Bi-directional filtering between scatter and map:

- **Scatter → map:** Drag a rectangle on the scatter; areas outside the brush dim on the map.
- **Map → scatter:** Click a community area; its dot highlights and others dim; click again to clear.
- **Reset** clears brush and selection on both charts.

Both directions update the same shared highlight state, so selections in either chart immediately reflect in the other.
