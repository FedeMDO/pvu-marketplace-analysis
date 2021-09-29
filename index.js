require('dotenv').config();
const { exec } = require('child_process');

// const { config } = require('dotenv');
const request = require('request');

const TOKEN = process.env.PVU_MARKETPLACE_TOKEN;

const getTimeXMinutesAgo = (x) => new Date(new Date().getTime() - x * 60 * 1000);
let execTimes = 0;
const go = () => {
  request(
    // TODO filter by available filters (type, rarity)
    `https://backend-farm.plantvsundead.com/get-plants-filter-v2?offset=0&limit=1000&type=${process.env.PLANT_TYPE}&sort=latest&elements=${process.env.PLANT_ELEMENTS}}`,
    { json: true, headers: { Authorization: `Bearer Token: ${TOKEN}` } },
    (err, res, body) => {
      if (err) {
        return console.log(err);
      }
      console.log(`run nª: ${++execTimes}`);
      const AVG_PVU_COST_FROM_LE = process.env.AVG_PVU_COST_FROM_LE; // AVG (500 -> 550 -> 605 -> 665 -> 732) | llegamos a noviembre
      const plants = body.data;
  
      const plantsFiltered = plants
        // Prefiltering by price, type and hours
        // .filter(
        //   (plant) => 
        //   plant.endingPrice <= 30 &&
        //   plant.config.farm.hours <= 144 // && 
        // )
        // Profit and ROI calculation
        .map((plant) => ({
          id: plant.id,
          price: plant.endingPrice, // ejemplo 40
          farm: `${plant.config.farm.le}/${plant.config.farm.hours}`,
          type: plant.config.stats.type,
          profit: (plant.config.farm.le / plant.config.farm.hours).toFixed(3),
          roiInDays: plant.endingPrice / ((plant.config.farm.le / plant.config.farm.hours / AVG_PVU_COST_FROM_LE) * 24),
          date: new Date(plant.updatedAt * 1000).toISOString(),
          url: `https://marketplace.plantvsundead.com/#/plant/${plant.id}`,
        })) // x * profitPvuDiario = precio => x = precio / profitPvuDiario
        // Filter by profit, ROI and timeframes
        // .filter((x) => x.roiInDays <= 81 && new Date(x.date).getTime() >= getTimeXMinutesAgo(3)) // only plants posted last 5 minutes
        // Sort by ROI DESC, price ASC
        .sort(function (a, b) {
          if (a.roiInDays === b.roiInDays) {
            // Price is only important when profits are the same
            return b.price - a.price;
          }
          return a.roiInDays - b.roiInDays;
        });
  
      console.log(`LE => PVU AVG RATE : ${AVG_PVU_COST_FROM_LE} - ${new Date().toISOString()}`);
      console.log(`total results: ${body.data.length} | filtered results: ${plantsFiltered.length}`);
      console.table(plantsFiltered);
      // Open best option on gchrome
      const bestOption = plantsFiltered.shift();
      if(bestOption){
        exec(`start chrome ${bestOption.url}`);
      }
    }
  );
}

// exec every 25-35 secs
go();
setInterval(go, Math.floor(Math.random() * (25 - 15 + 1) + 15) * 1000); //random number between 25 and 35 secs