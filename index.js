require('dotenv').config()

const request = require('request');

const TOKEN = process.env.PVU_MARKETPLACE_TOKEN;

request(
  'https://backend-farm.plantvsundead.com/get-plants-filter-v2?sort=lowestPrice&offset=0&limit=10000&type=1',
  { json: true, headers: { Authorization: `Bearer Token: ${TOKEN}` } },
  (err, res, body) => {
    if (err) {
      return console.log(err);
    }
    const AVG_PVU_COST_FROM_LE = process.env.AVG_PVU_COST_FROM_LE; // AVG (500 -> 550 -> 605 -> 665 -> 732) | llegamos a noviembre
    console.log(`LE => PVU RATE : ${AVG_PVU_COST_FROM_LE}`);

    const plants = body.data;
    plants
      .filter((plant) => plant.endingPrice <= 60)
      .map((plant) => ({
        id: plant.id,
        price: plant.endingPrice, // ejemplo 40
        farm: plant.config.farm,
        profit: plant.config.farm.le / plant.config.farm.hours,
        profitPvuDiario: (plant.config.farm.le / plant.config.farm.hours / AVG_PVU_COST_FROM_LE) * 24, // PVU por hora. Ej 0.20 PVU / DIA
        roiInPVU: plant.endingPrice / ((plant.config.farm.le / plant.config.farm.hours / AVG_PVU_COST_FROM_LE) * 24),
      })) // x * profitPvuDiario = precio => x = precio / profitPvuDiario
      .sort(function (a, b) {
        if (a.roiInPVU === b.roiInPVU) {
          // Price is only important when profits are the same
          return b.price - a.price;
        }
        return a.roiInPVU - b.roiInPVU;
      })
      .forEach((x) => console.log(x));
  }
);