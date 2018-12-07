'use strict';

var Client = require('node-rest-client').Client;
var express = require('express'),
  app = express(),
  port = process.env.PORT || 3000;

var client = new Client();
app.listen(port);

console.log('News RESTful API server started on: ' + port);

var news = {};
client.get(
  'https://newsapi.org/v2/top-headlines?country=us&apiKey=0c2508bde7c64c88b6844bbd14568c24',
  function(data, response) {
    // parsed response body as js object
    // console.log(response);

    news = data;
  }
);

app.get('/us', function(req, res) {
  console.log(news);
  res.json(news);
});
