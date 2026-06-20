# Poverty vs. Crime — do poorer neighborhoods always have more crime?

A two-chart, cross-filtered dashboard for the CS416 dashboard assignment.
Each dot is one Chicago community area (77 total). It asks one question:

> **Do poorer Chicago community areas always have higher crime rates?**

The answer needs both charts. The **scatter** shows a positive overall relationship —
each extra percentage point of household poverty correlates with about 4.4 more
crimes per 1,000 residents per year — but with wide scatter and clear outliers.
The **map** shows *where* those outliers sit: the Loop and Near North Side run
very high crime rates despite modest poverty (commercial traffic), while areas
like Armour Square and South Lawndale have high poverty but fall below the trend
line. Poverty and crime move together on average, but **not always** at the
neighborhood level.

## What's here

```
chicago-poverty-crime/
  client/              # the static site (this is what you deploy)
    index.html
    styles.css
    main.js            # all D3: scatter + map + cross-filtering
    vendor/d3.v7.min.js
    data/
      areas.json               # joined poverty + crime + population (committed)
      community-areas.geojson  # 77 community area boundaries (committed)
  data-prep/
    prepare_data.py    # rebuilds data from Chicago Open Data
    requirements.txt
```

## Run it locally

The client is fully static — no build step, no backend. Serve the `client/`
folder over HTTP (browsers block `fetch` of the data files from `file://`):

```bash
cd client
python3 -m http.server 8765
# open http://localhost:8765
```

## Rebuild the data (optional)

`client/data/areas.json` is already generated. Re-run only to refresh:

```bash
cd data-prep
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python prepare_data.py
```

Sources:
- Reported crimes 2019–2024 by community area (`ijzp-q8t2`)
- Household poverty rate (`mkus-5ykj`)
- ACS population (`7umk-8dtw`)
- Community area boundaries (`igwz-8jzy`)

Crime rate = total reported incidents ÷ 6 years ÷ population × 1,000.

## Deploy (for the handed-in URL)

It's a static site, so any static host works. GitHub Pages:

1. Push the repo to GitHub.
2. Settings -> Pages -> deploy from the folder containing `index.html` (`.../client`).
3. Submit that URL.

---

## Assignment write-up (answers to the rubric)

**The question and its answer.** *Do poorer neighborhoods always have more crime?*
No. Poverty and crime rate correlate positively across the 77 community areas —
roughly +4.4 crimes per 1,000 residents per year for each extra point of
household poverty — but many neighborhoods break the pattern. The Loop (14.7%
poverty, 207 crimes/1k/yr) and Near North Side (12.9%, 112/1k) sit far above
the trend despite low poverty, driven by commercial density and visitor traffic.
Armour Square (40.1% poverty, 79/1k) and South Lawndale (30.7%, 57/1k) have
high poverty but crime rates well below what the trend would predict. So poorer
areas tend to have more crime, but geography and land use matter — it's not a
fixed rule.

**Why two charts are needed.** The scatter alone shows the statistical relationship
and outliers as abstract dots — you can see the Loop is an exception but not
*where* it sits in the city. The map alone shows crime-rate geography but hides
poverty — a dark-red area could be high-crime because of poverty or because of
downtown activity. Reading them together — a dot far above the trend line, then
finding that same area on the map — gives the full answer.

**First chart (scatter).** X = percent of households below poverty, Y = annual
reported crimes per 1,000 residents (2019–2024 average). Dots colored by crime
rate using the same sequential scale as the map; a dashed line shows the linear
trend. A scatter is the right mark because both variables are continuous and the
goal is to see correlation strength and outliers across 77 areas.

**Second chart (map).** Choropleth of 77 community areas colored by crime rate
(same sequential scale as scatter dots). A map is the right mark because community
area is geographic — only a spatial view shows whether high-rate outliers cluster
downtown, on the South Side, or elsewhere.

**Layout and color.** Charts sit side by side (50/50). Both use one shared
sequential scale (cream → deep red) for crime rate, with a gradient legend in
the controls row. Selected areas use accent blue (`#2563eb`) on both the scatter
dot outline and the map polygon border.

**Details on demand.** Hovering any scatter dot or map polygon shows the community
area name, poverty %, crime rate, total crimes (2019–2024), population, and
distance above/below the poverty–crime trend line.

**Cross-filtering (bi-directional).**
- *Scatter → map:* drag a rectangle on the scatter (e.g. high-poverty, high-crime
  quadrant) and the map dims every area outside the selection.
- *Map → scatter:* click a community area to highlight its dot and dim the rest;
  click again to clear.
- *Reset* clears brush and selection.

**Screenshot suggestion for grading.** Brush the upper-right quadrant (high poverty
+ high crime) and note how the map highlights South/West Side areas — then click
the Loop on the map to show a high-crime, low-poverty outlier above the trend line.
