// Data
let countryData;
let euroCountries;
let jointCoinData;

d3.csv('public/dataset.csv').then(function (data) {
  countryData = data;
  euroCountries = [...new Set(data.map(row => row.Country_map_name))];
});

d3.csv('public/datasetAreaCoins.csv').then(function (data) {
  jointCoinData = data;
});

// Constants
const width = 1050;
const height = 690;
const startYear = "2023";
const vaticanCoords = [12.36062, 41.88378];
const smallCountries = ['Vatican City', 'Monaco', 'Luxembourg', 'San Marino', 'Andorra', 'Malta'];
const colorScale = d3.scaleSequential(d3.interpolateBuPu).domain([0, 1]);

// Variables
var sortBy = "year";
var sortOrderAscending = false;
let selectedYear = startYear;
let selectedCountry = "Slovakia";
var countries;

// Map setup
const svg = d3.select('#map_div')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

const projection = d3.geoEquirectangular().center([8.9, 57.75]).scale(1070);
const path = d3.geoPath().projection(projection);

// Load map data
d3.json('public/myMap.json').then(function (data) {
  countries = data.features.slice(0, -1);

  svg.selectAll('path')
    .data(countries)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('stroke', 'white');

    updateMap(startYear);
    updateJoint(startYear);
    selectedCountry="Slovensko";
    updateTable();
    highlightCountry(selectedCountry);
});

// Timeline slider
const sliderContainer = d3.select('#timeline').append('div')
const slider = d3.select(sliderContainer.node())
  .append('input')
  .attr('type', 'range')
  .attr('min', 2004)
  .attr('max', 2023)
  .attr('step', 1)
  .attr('value', startYear)
  .on('input', function() {
    labels.classed('selected', false);
    const selectedLabel = labels.filter(d => d == this.value);
    selectedLabel.classed('selected', true);

    selectedYear = this.value;
    updateMap(selectedYear);
    updateJoint(selectedYear);
    updateYearColor(selectedYear);
  });

// Year labels
const labelsContainer = d3.select(sliderContainer.node()).append('div').attr('id', 'labelsContainer');
const labels = labelsContainer
  .selectAll('span')
  .data(d3.range(2004, 2024))
  .enter()
  .append('span')
  .text(function(d) { return d; })

const startLabel = labels.filter(d => d == startYear);
startLabel.classed('selected', true);

// Color scale
function customInterpolation(input) {
  if (input <= 0) return 0;
  else if (input <= 3) return 0 + (input - 0) / (3 - 0) * (0.26 - 0);
  else if (input <= 5) return 0.26 + (input - 3) / (5 - 3) * (0.5 - 0.26);
  else if (input <= 20) return 0.5 + (input - 5) / (20 - 5) * (0.78 - 0.5);
  else if (input <= 50) return 0.78 + (input - 20) / (50 - 20) * (1 - 0.78);
  else return 1;
}

// Calculate the color to be assigned
function createFill(country, selectedYear) {
  const defaultCountryName = "Vatican City";
  const countryName = (country !== "Vatican City") ? country.properties.na : defaultCountryName;

  // Skip non-Eurozone countries
  if (!euroCountries.includes(countryName)) return 'black';

  const countryPriceData = countryData.filter(entry => entry.Country_map_name === countryName && entry.Mintage_year === selectedYear);

  if (countryPriceData.length > 0) {
    const maxPrice = Math.max(...countryPriceData.map(entry => parseFloat(entry.Price)));
    return colorScale(customInterpolation(maxPrice));
  } else {
    // Eurozone countries with no coin for that year
    return 'grey';
  }
}

// Create a tooltip that is shown when user hovers over the area
function createTooltip(country, selectedYear) {
  if (!country) return "";
  
  const defaultCountryName = "Vatican City";
  const countryName = (country !== defaultCountryName) ? country.properties.na : defaultCountryName;

  if (!euroCountries.includes(countryName)) {
    return `${countryName}\nNot in the Eurozone`;
  }

  const countryPriceData = countryData.filter(entry => entry.Country_map_name === countryName && entry.Mintage_year === selectedYear);
  const coinsCount = countryPriceData.length;

  if (coinsCount > 0) {
    const maxPriceIndex = countryPriceData.reduce((maxIndex, currentEntry, currentIndex) => {
      const currentPrice = parseFloat(currentEntry.Price);
      const maxPrice = parseFloat(countryPriceData[maxIndex].Price);
      return (currentPrice > maxPrice) ? currentIndex : maxIndex;
    }, 0);

    const maxEntry = countryPriceData[maxPriceIndex];
    return `${maxEntry.Country}\n${maxEntry.Price}€\n${maxEntry.Description}`;
  } else {
    // Eurozone countries with no coin for that year
    const noCoinEntry = countryData.find(entry => entry.Country_map_name === countryName);
    return `${noCoinEntry.Country}\nNo coin issued this year`;
  }
}

// Update the map based on the selected year
function updateMap(selectedYear) {
  svg.selectAll('path title').remove();

  svg.selectAll('path')
    .data(countries)
    .filter(d => !isSmallCountry(d))
    .attr('fill', d => createFill(d, selectedYear))
    .on('click', function(d){
      selectedCountry=d.srcElement.__data__.properties.na;
      updateTable()
      highlightCountry(selectedCountry)
    })
    .append("svg:title")
    .text(d => createTooltip(d, selectedYear));

  svg.selectAll('.small-country-circle').remove();
  svg.selectAll('circle')
    .data(countries)
    .enter()
    .filter(d => isSmallCountry(d))
    .append('circle')
    .attr('class', 'small-country-circle')
    .attr('cx', d => path.centroid(d)[0])
    .attr('cy', d => path.centroid(d)[1])
    .attr('r', 9)
    .style("stroke", "black")
    .attr('fill', d => createFill(d, selectedYear))
    .on('click', function(d){
      selectedCountry=d.srcElement.__data__.properties.na;
      updateTable()
      highlightCountry(selectedCountry)
    })
    .append("svg:title")
    .text(d => createTooltip(d, selectedYear))    

  // Vatican was problematic in the geojson, so it is hardcoded here
  svg.append('circle')
  .attr('class', 'small-country-circle')
  .attr('cx', projection(vaticanCoords)[0])
  .attr('cy', projection(vaticanCoords)[1])
  .attr('r', 9)
  .style("stroke", "black")
  .attr('fill', createFill("Vatican City", selectedYear))
  .on('click', function(d){
    selectedCountry="Vatican City"
    updateTable()
    highlightCountry(selectedCountry)
  })
  .append("svg:title")
  .text(createTooltip("Vatican City", selectedYear));
}

function isSmallCountry(country) {
  const countryName = country.properties.na;
  return smallCountries.includes(countryName);
}

// Outline of the selected country
function highlightCountry(countryName) {
  if (!euroCountries.includes(countryName)) return;
  
  svg.selectAll('.highlighted-country').remove();

  if (countryName === "Vatican City") {
    svg.append('circle')
      .attr('class', 'highlighted-country')
      .attr('cx', projection(vaticanCoords)[0])
      .attr('cy', projection(vaticanCoords)[1])
      .attr('r', 9)
      .style('fill', 'none')
      .style('stroke', '#0b4c92')
      .style('stroke-width', 3);
    return;
  }

  const countryData = countries.find(d => d.properties.na === countryName);
  if (!countryData) {
    console.log(countryName)
    return;
  }

  if (isSmallCountry(countryData)) {
    svg.append('circle')
      .attr('class', 'highlighted-country')
      .attr('cx', path.centroid(countryData)[0])
      .attr('cy', path.centroid(countryData)[1])
      .attr('r', 9)
      .style('fill', 'none')
      .style('stroke', '#0b4c92')
      .style('stroke-width', 3);
      return
  }

  svg.append('path')
    .datum(countryData)
    .attr('class', 'highlighted-country')
    .attr('d', path)
    .style('fill', 'none')
    .style('stroke', '#0b4c92')
    .style('stroke-width', 3);
}

// Create the legend
function addLegend() {
  const legendContainer = d3.select('#legend-container');

  const legend = legendContainer.append('svg')
    .attr('class', 'legend')
    .attr('width', 100)
    .attr('height', 250)
    .append('g')
    .attr('transform', 'translate(10,30)');

  // Add a label to the top of the legend
  legend.append('text')
    .attr('x', 0)
    .attr('y', -10)
    .style('font-size', '20px')
    .style('font-weight', 'bold')
    .text('Price');

  const legendValues = [3, 5, 10, 20, 50];
  
  const legendItems = legend.selectAll('.legend-item')
    .data(legendValues)
    .enter()
    .append('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 32})`);

  legendItems.append('rect')
    .attr('fill', d => colorScale(customInterpolation(d)));

  legendItems.append('text')
    .attr('x', 34)
    .attr('y', 11)
    .attr('dy', '0.59em')
    .text((d, i) => (i === legendValues.length - 1) ? `${d}€+` : `${d}€`);
}

addLegend();

// Aux sorting methods
function sortDataByMintage(countryDatas) {
  return countryDatas.sort((a, b) => a.Mint_count - b.Mint_count);
}

function sortDataByPrice(countryDatas) {
  return countryDatas.sort((a, b) => a.Price - b.Price);
}

function sortDataByYear(countryDatas) {
  return countryDatas.sort((a, b) => a.Mintage_year - b.Mintage_year);
}

function sortTable(column, order) {
  sortBy = column;
  sortOrderAscending = order;
  updateTable();
}

// The table of coins
function updateTable() {
  if (!euroCountries.includes(selectedCountry)) {
    return;
  }

  let countryDatas = countryData.filter(entry => entry.Country_map_name === selectedCountry);

  if (sortBy === "mintage") {
    countryDatas = sortDataByMintage(countryDatas);
  } else if (sortBy == "year") {
    countryDatas = sortDataByYear(countryDatas);
  } else {
    countryDatas = sortDataByPrice(countryDatas);
  } 

  if (!sortOrderAscending) countryDatas.reverse();

  const countryName = countryDatas[0].Country;
  const flagImg = `public/Flags/${countryName.replace(" ", "-")}-icon.png`;

  const tableHeader = `
    <div style="display: flex; align-items: center;">
      <img src="${flagImg}" alt="${countryName}" style="width: 50px; margin-left: 5px;">
      <h2>  ${countryName}</h2>
    </div>`;

  const tableRows = countryDatas.map(row => `
    <tr>
      <td class="year-cell">${row.Mintage_year}</td>
      <td class="description-container">
        <img src="public/images/${row.Country}_${row.Mintage_year}_${row.YearID}.jpg" alt="Coin Image" class="description-image">
        ${row.Description}
      </td>
      <td class="price-cell" style="background-color: ${colorScale(customInterpolation(row.Price))};">
        ${parseFloat(row.Price).toFixed(2)}€
      </td>
      <td class="mintage-cell">
        <img src="public/Coins-icon.png" style="width: ${mintageWidth(row.Mint_count)}px;"><br>
        ${numberWithCommas(row.Mint_count)}
      </td>
    </tr>
  `).join('');

  const tableHTML = `
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>
            <div class="header-text">Year</div>
            <div class="sort-buttons">
              <button id="sortYearAsc">&#x25B2;</button>
              <button id="sortYearDsc">&#x25BC;</button>
            </div>
          </th>
          <th >
            <div class="header-text">Description</div>
          </th>
          <th>
            <div class="header-text">Price</div>
            <div class="sort-buttons">
              <button id="sortPriceAsc">&#x25B2;</button>
              <button id="sortPriceDsc">&#x25BC;</button>
            </div>
          </th>
          <th>
            <div class="header-text">Mintage</div>
            <div class="sort-buttons">
            <button id="sortMintageAsc">&#x25B2;</button>
            <button id="sortMintageDsc">&#x25BC;</button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>`;


  document.getElementById('countryTable').innerHTML = tableHeader + tableHTML;
  updateYearColor(selectedYear);

  // sorting buttons functionality
  document.getElementById('sortYearAsc').addEventListener('click', function() {
    sortTable('year', true);
  });
  document.getElementById('sortYearDsc').addEventListener('click', function() {
    sortTable('year', false);
  });
  
  document.getElementById('sortPriceAsc').addEventListener('click', function() {
    sortTable('price', true);
  });
  document.getElementById('sortPriceDsc').addEventListener('click', function() {
    sortTable('price', false);
  });

  document.getElementById('sortMintageAsc').addEventListener('click', function() {
    sortTable('mintage', true);
  });
  document.getElementById('sortMintageDsc').addEventListener('click', function() {
    sortTable('mintage', false);
  });
}

// Number formatting
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Interpolations of minatage to set proper icon size
function mintageWidth(x){
  if (x <= 50000) return 20;
  else if (x <= 500000) return 20 + (x - 50000) / (500000 - 50000) * (30 - 20);
  else if (x <= 5000000)return 30 + (x - 500000) / (5000000 - 500000) * (40 - 30);
  else if (x <= 20000000) return 40 + (x - 5000000) / (20000000 - 5000000) * (50 - 40);
  else return 50;
}

// Highlight current year in the table
function updateYearColor(year) {
  const yearCells = document.getElementsByClassName('year-cell');
  
  Array.from(yearCells).forEach(cell => {
    cell.classList.toggle('highlighted', cell.textContent === year);
  });
}

// Box for commonly issued coin by the whole EU
function updateJoint(selectedYear) {
  const countryData = jointCoinData.find(entry => entry.Mintage_year === selectedYear);

  const container = d3.select("#area-coin-container").html('');

  container.append("div")
    .classed("jointHeadline", true)
    .html(`<img class="exclude-styling" src="public/Flags/flag-EU.png" alt="EU flag" style="width: 50px; margin-right: 10px; margin-left: 6px; margin-top: -3px;"> Jointly issued coin`);

  const coinDescription = container.append("div")
    .style("display", "flex")
    .style("align-items", "center");

  let imageSource = "public/images/dummy.png";
  let description = "No coin this year";

  if (countryData) {
    imageSource = `public/images/eu_${selectedYear}.jpg`;
    description = countryData.Description;
  }

  coinDescription.append("img")
    .attr("src", imageSource)
    .attr("width", 100)
    .attr("height", 100);

  const textContainer = coinDescription.append("div")
    .style("margin-left", "10px");

  textContainer.append("div")
    .text(description);
}
