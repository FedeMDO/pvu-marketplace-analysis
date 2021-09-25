require('dotenv').config();
const { exec } = require('child_process');

// const { config } = require('dotenv');
const request = require('request');

const TOKEN = process.env.PVU_MARKETPLACE_TOKEN;

const getTimeXMinutesAgo = (x) => new Date(new Date().getTime() - x * 60 * 1000);

request(
  // TODO filter by available filters (type, rarity)
  `https://backend-farm.plantvsundead.com/get-plants-filter-v2?offset=0&limit=50000&type=${process.env.PLANT_TYPE}`,
  { json: true, headers: { Authorization: `Bearer Token: ${TOKEN}` } },
  (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    const AVG_PVU_COST_FROM_LE = process.env.AVG_PVU_COST_FROM_LE; // AVG (500 -> 550 -> 605 -> 665 -> 732) | llegamos a noviembre
    const plants = body.data;

    const plantsFiltered = plants
      // Prefiltering by price, type and hours
      .filter(
        (plant) => plant.endingPrice <= 47 && plant.config.farm.hours <= 144 //&& ['dark', 'parasite', 'electro'].includes(plant.config.stats.type)
      )
      // Profit and ROI calculation
      .map((plant) => ({
        id: plant.id,
        price: plant.endingPrice, // ejemplo 40
        farm: `${plant.config.farm.le}/${plant.config.farm.hours}`,
        type: plant.config.stats.type,
        profit: (plant.config.farm.le / plant.config.farm.hours).toFixed(3),
        roiInPVU: plant.endingPrice / ((plant.config.farm.le / plant.config.farm.hours / AVG_PVU_COST_FROM_LE) * 24),
        date: new Date(plant.updatedAt * 1000).toISOString(),
        url: `https://marketplace.plantvsundead.com/#/plant/${plant.id}`,
      })) // x * profitPvuDiario = precio => x = precio / profitPvuDiario
      // Filter by profit, ROI and timeframes
      .filter((x) => new Date(x.date).getTime() >= getTimeXMinutesAgo(10)) // only plants posted last 5 minutes
      // Sort by ROI DESC, price ASC
      .sort(function (a, b) {
        if (a.roiInPVU === b.roiInPVU) {
          // Price is only important when profits are the same
          return b.price - a.price;
        }
        return a.roiInPVU - b.roiInPVU;
      });

    console.log(`LE => PVU AVG RATE : ${AVG_PVU_COST_FROM_LE} - ${new Date().toISOString()}`);
    console.log(`total results: ${body.data.length} | filtered results: ${plantsFiltered.length}`);
    console.table(plantsFiltered);
    // Open best option on gchrome
    const bestOption = plantsFiltered.shift();
    exec(`start chrome ${bestOption.url}`);
  }
);
