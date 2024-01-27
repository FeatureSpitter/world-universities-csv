const { JSDOM } = require("jsdom");
const axios = require("axios");
const { parse } = require("node-html-parser");
const { countries } = require('country-data');
const { createWriteStream } = require('fs');
const { stringify } = require('csv-stringify');
const async = require("async");

const output = createWriteStream("world-universities.csv");
const stringifier = stringify();
stringifier.pipe(output);

var lastPage;

async function readPage(pageUrl, write) {
  try {
    const response = await axios.get(pageUrl);
    const dom = new JSDOM(response.data);
    const window = dom.window;
    const $ = require('jquery')(window);

    let count = 0;
    const firstItem = $('ol li a')[0];
    if (firstItem) {
      const currentPage = firstItem.innerHTML;
      if (currentPage === lastPage) {
        return 0;
      }

      lastPage = currentPage;
    }

    $('ol li a').each(function (i, el) {
      write($(el).text(), $(el).attr('href'));
      ++count;
    });

    return count;
  } catch (error) {
    console.error('Error reading page:', error);
    return 0;
  }
}

async function loadList(dom, country) {
  let total = 0;
  let start = 1;
  process.stdout.write("[" + country + "] ");
  let count;
  do {
    const pageUrl = `http://univ.cc/search.php?dom=${dom}&key=&start=${start}`;
    count = await readPage(pageUrl, (name, url) => {
      stringifier.write([country, name, url]);
    });
    start += 50;
    total += count;
    process.stdout.write('.');
  } while (count >= 50);

  process.stdout.write(total + '\n');
}

const countriesCodes = Object.keys(countries.all).filter(code => countries.all[code].alpha2.length === 2);

async.eachSeries(countriesCodes, async (countryCode) => {
  const country = countries.all[countryCode];
  if (country.alpha2.length !== 2) return;

  const dom = country.alpha2 === "US" ? "edu" : country.alpha2.toLowerCase();
  await loadList(dom, country.alpha2);
}, () => {
  stringifier.end();
});

