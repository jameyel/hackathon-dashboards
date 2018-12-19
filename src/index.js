'use strict';

const Client = require('node-rest-client').Client;
const express = require('express'),
  app = express(),
  port = process.env.PORT || 3000;

/** Database */
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/hackathon-dashboards');

const dataSchema = new mongoose.Schema({
  revenue: Number,
  timestamp: String
});

const Data = mongoose.model('Data', dataSchema);

/** Google API */
const { google } = require('googleapis');
const key = require('../auth.json');

const scopes = 'https://www.googleapis.com/auth/analytics.readonly';
const jwt = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  scopes
);
const view_id = '111741807';
let finalResult = '';

process.env.GOOGLE_APPLICATION_CREDENTIALS = '../auth.json';
refreshData();

setInterval(() => {
  refreshData();
}, 900000);

function refreshData() {
  jwt.authorize((err, response) => {
    new Promise((resolve, reject) => {
      google.analytics('v3').data.ga.get(
        {
          auth: jwt,
          ids: 'ga:' + view_id,
          'start-date': 'yesterday',
          'end-date': 'yesterday',
          metrics: 'ga:transactionRevenue'
        },
        (err, result) => {
          if (err) {
            console.error('ERROR: ', err);
            return;
          }

          const revYday = result.data.rows[0][0];
          resolve(revYday);
        }
      );
    }).then(revYday => {
      google.analytics('v3').data.ga.get(
        {
          auth: jwt,
          ids: 'ga:' + view_id,
          'start-date': 'today',
          'end-date': 'today',
          metrics: 'ga:transactionRevenue'
        },
        (err, result) => {
          if (err) {
            console.error('ERROR: ', err);
            return;
          }
          const revToday = result.data.rows[0][0];
          const totalRevDoD = (revToday - revYday).toFixed(0);
          const myData = new Data({
            revenue: totalRevDoD,
            timestamp: Date.now().toString()
          });
          myData
            .save()
            .then(datapoint => {
              console.log('data saved to database', datapoint);
            })
            .catch(err => {
              console.log('unable to save to database', err);
            });
          if (totalRevDoD > 0) {
            // we made money
            finalResult = 'and we made $' + totalRevDoD;
          } else if (totalRevDoD < 0) {
            // we lost money
            finalResult = 'and we lost $' + Math.abs(Number(totalRevDoD));
          }
        }
      );
    });
  });
}

const client = new Client();
app.listen(port);

console.log('News RESTful API server started on: ' + port);

let news = {};
client.get(
  'https://newsapi.org/v2/top-headlines?country=us&category=health&apiKey=0c2508bde7c64c88b6844bbd14568c24',
  function(data, response) {
    // parsed response body as js object
    // console.log(response);

    news = data;
  }
);

app.get('/us', function(req, res) {
  const headlines = [];
  news.articles.forEach(article => {
    headlines.push(article.title);
  });
  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];
  //   res.json(news);
  const headlineSplit = randomHeadline.split(' - ');
  const returnString = `Today ${headlineSplit[1]} reported ${
    headlineSplit[0]
  }...${finalResult} since yesterday. I'm not saying theyre related, but we can't rule it out!`;
  res.json(returnString);
});
