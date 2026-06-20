# Where Is Crime Highest in Chicago?

A two-chart, cross-filtered dashboard for the CS416 dashboard assignment.
Each dot and polygon is one Chicago community area (77 total). It asks one question:

> **Where is crime highest in Chicago?**

The answer needs both charts. The **map** shows crime is concentrated on the
South and West Sides — Fuller Park (322 crimes/1k/yr), West Garfield Park (279),
Englewood (243), and North Lawndale (239) lead the city. The **scatter** adds
context: most of those areas also have high poverty, but the Loop ranks sixth
(207/1k) at just 14.7% poverty, driven by downtown commercial traffic. The map
answers *where*; the scatter shows *what kind* of high-crime neighborhood each
area is.

## What's here

```
chicago-poverty-crime/
  client/              # the static site (this is what you deploy)
    index.html
    styles.css
    main.js            # all D3: map + scatter + cross-filtering
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

## Deploy (GitHub Pages)

The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
publishes the `client/` folder on every push to `main`.

1. Create a public GitHub repo and push this project:

```bash
gh auth login
gh repo create chicago-poverty-crime --public --source=. --remote=origin --push
```

2. In the repo on GitHub: **Settings → Pages → Build and deployment → Source**,
   choose **GitHub Actions** (not “Deploy from a branch”).

3. After the first push, open **Actions** and wait for “Deploy to GitHub Pages” to
   finish. Your URL will be:

`https://<your-github-username>.github.io/chicago-poverty-crime/`

Submit that URL for the assignment.

---

## Assignment write-up (answers to the rubric)

**The question and its answer.** *Where is crime highest in Chicago?*
On the South and West Sides. Fuller Park leads at 322 crimes per 1,000 residents
per year, followed by West Garfield Park (279), Englewood (243), and North
Lawndale (239). The map shows these hotspots clustering south and west of
downtown. Most rank high on both crime and poverty in the scatter, but the Loop
(207/1k, 14.7% poverty) is a major exception — high crime driven by commercial
density, not neighborhood poverty.

**Why two charts are needed.** The map alone shows geographic concentration but
not exact rate rankings or poverty context — you can see dark-red areas on the
South Side but not that Fuller Park beats the Loop. The scatter alone ranks
areas by crime rate and shows poverty context, but hides geography — you cannot
tell whether the highest dots cluster together or sit across the city. Reading
them together — finding a dark-red area on the map, then locating its dot on the
scatter — gives the full answer.

**First chart (scatter).** X = household poverty rate (%), Y = annual reported
crimes per 1,000 residents. Dots colored by crime rate using the same sequential
scale as the map; a dashed line shows the linear trend. A scatter is the right
mark because it ranks areas by crime rate and reveals whether high-crime
neighborhoods share a poverty profile or break the pattern (e.g., the Loop).

**Second chart (map).** Choropleth of 77 community areas colored by crime rate
(annual reported crimes per 1,000 residents, 2019–2024 average). A map is the
right mark because the question is geographic — only a spatial view shows where
crime is highest and whether hotspots cluster on the South Side, West Side, or
downtown.

**Layout and color.** Scatter on the left, map on the right (50/50). Both use
one shared sequential scale (cream → deep red) for crime rate, with a gradient
legend in the controls row. Selected areas use accent blue (`#2563eb`) on both
the map polygon border and the scatter dot outline.

**Details on demand.** Hovering any map polygon or scatter dot shows the
community area name, crime rate, poverty %, total crimes (2019–2024),
population, and distance above/below the poverty–crime trend line.

**Cross-filtering (bi-directional).**
- *Map → scatter:* click a community area to highlight its dot and dim the rest.
- *Scatter → map:* click a dot or drag a rectangle on the scatter; matching areas
  highlight on the map.
- *Empty click* on either chart clears the selection; *Reset* clears brush and
  selection.

**Screenshot suggestion for grading.** Click Fuller Park on the map to show the
highest-crime area, then note on the scatter that it sits high on both axes —
contrast with the Loop, a high-crime dot with low poverty far above the trend line.
