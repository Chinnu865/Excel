const express = require('express');
const { Worker } = require('worker_threads');
const Sequelize = require('sequelize');
const { DataTypes } = require('sequelize');
const fs = require('fs');
const fastcsv = require('fast-csv');

const connection = new Sequelize('conversion', 'root', 'abcd@123', {
    dialect: 'mysql',
    logging: false
})

const User = connection.define('user', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING,
        allowNull:false
    }
},{
    freezeTableName:true
});

const app = express();

app.get('/find', (req, res) => {
  const worker = new Worker('./worker1.js');

  worker.on('message', (msg) => {
    if (msg.progress) {
      console.log(`Exported ${msg.progress}% of data`);
    }

    if (msg.done) {
      console.log('Data exported to Excel successfully!');
      res.send('Data exported to Excel successfully!');
      worker.terminate();
    }
  });

  worker.on('error', (err) => {
    console.error(err);
    res.status(500).send('An error occurred while exporting data to Excel!');
    worker.terminate();
  });

  worker.postMessage({ cmd: 'start', chunks: [500] });
});


const ws = fs.createWriteStream("output.csv");

app.get("/exportcsv", async (req, res) => {

    let offset = 0;
    let chunkSize = 500;
    const data = await User.findAll({
        offset,
        limit: chunkSize
      });
  
      const jsonData = data.map(user => user.dataValues);
      // console.log("jsonData", jsonData);

      //csv
      fastcsv
        .write(jsonData, { headers: true })
        .on("finish", function () {
          console.log("Write to output.csv successfully!");
        })
        .pipe(ws);

    res.send("exported")
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});
