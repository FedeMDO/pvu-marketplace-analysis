require('dotenv').config();
const { exec } = require('child_process');

const request = require('request');
const requiredVars = [
  'PVU_MARKETPLACE_TOKEN',
  'AVG_PVU_COST_FROM_LE',
  'PLANT_TYPE',
  'FILTER_MAX_HOURS',
  'FILTER_MAX_PRICE',
  'REPEAT_INTERVAL_SECONDS',
  'FILTER_FROM_X_MINUTES_AGO',
  'CHROME_OPEN_BEST_OPTION',
];

if (!requiredVars.every((varKey) => Object.keys(process.env).includes(varKey) && typeof process.env[varKey] !== 'undefined')) {
  console.error(`please provide required environment variables\n${requiredVars.join(', \n')}\nSee .env.example file`);
  return;
}
const FILTER_ELEMENTS = process.env.FILTER_ELEMENTS ? `&elements=${process.env.FILTER_ELEMENTS}` : '';
const getTimeXMinutesAgo = (x) => new Date(new Date().getTime() - x * 60 * 1000);
let execTimes = 0;
const go = () => {
  console.log(`run nª: ${++execTimes}`);
  const finalQuery = `https://backend-farm.plantvsundead.com/get-plants-filter-v2?offset=0&limit=1000&sort=latest&type=${process.env.PLANT_TYPE}${FILTER_ELEMENTS}`;
  console.log(`querying ${finalQuery}`);
  request(
    // TODO filter by available filters (type, rarity)
    finalQuery,
    { json: true, headers: { Authorization: `Bearer Token: ${process.env.PVU_MARKETPLACE_TOKEN}` } },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      const AVG_PVU_COST_FROM_LE = process.env.AVG_PVU_COST_FROM_LE; // AVG (500 -> 550 -> 605 -> 665 -> 732) | llegamos a noviembre
      const plants = body.data;
      const plantsFiltered = plants
        // Prefiltering by price, type and hours
        .filter(
          (plant) => plant.endingPrice <= Number(process.env.FILTER_MAX_PRICE) && plant.config.farm.hours <= parseInt(process.env.FILTER_MAX_HOURS) // &&
        )
        // Profit and ROI calculation
        .map((plant) => ({
          price: plant.endingPrice, // ejemplo 40
          LE_yield: (plant.config.farm.le / plant.config.farm.hours).toFixed(3),
          farm: `${plant.config.farm.le}/${plant.config.farm.hours} (${plant.config.farm.hours / 24} days)`,
          type: plant.config.stats.type,
          roiInDays: (plant.endingPrice / ((plant.config.farm.le / plant.config.farm.hours / AVG_PVU_COST_FROM_LE) * 24)).toFixed(3), // roiInDays * dailyPVUYield = price => roiInDays = price / dailyPVUYield
          rarity: getRarity(plant.id),
          url: `https://marketplace.plantvsundead.com/#/plant/${plant.id}`,
          date: new Date(plant.updatedAt * 1000).toISOString(),
          id: plant.id,
        })) 
        // Filter by profit, ROI and timeframes
        .filter((x) => new Date(x.date).getTime() >= getTimeXMinutesAgo(parseInt(process.env.FILTER_FROM_X_MINUTES_AGO))) // only plants posted last 5 minutes
        // Sort by ROI DESC, price ASC
        .sort(function (a, b) {
          if (a.roiInDays === b.roiInDays) {
            // Price is only important when roiInDays are the same
            return b.price - a.price;
          }
          return a.roiInDays - b.roiInDays;
        });

      console.log(`LE => PVU AVG RATE : ${AVG_PVU_COST_FROM_LE} - ${new Date().toISOString()}`);
      console.log(`total results: ${body.data.length} | filtered results: ${plantsFiltered.length}`);
      console.table(plantsFiltered);
      // Open best option on gchrome
      const bestOption = plantsFiltered.shift();
      if (bestOption && process.env.CHROME_OPEN_BEST_OPTION === 'true') {
        exec(`start chrome ${bestOption.url}`);
      }
    }
  );
};

go();

setInterval(go, parseInt(process.env.REPEAT_INTERVAL_SECONDS) * 1000); 

// refer to https://www.servepinoy.com/use-plants-vs-undeadpvu-plant-seed-lookup-to-find-your-plants-rarity/
const getRarity = (id) => {
  const rarity = parseInt(id.toString().substr(-4).substr(0, 2));
  if (rarity >= 0 && rarity <= 59) {
    return 'common';
  } else if (rarity >= 60 && rarity <= 88) {
    return 'uncommon';
  } else if (rarity >= 89 && rarity <= 98) {
    return 'rare';
  } else if (rarity === 99) {
    return 'mythic';
  }
};
