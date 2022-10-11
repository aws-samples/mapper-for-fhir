
const awsServerlessExpress = require('aws-serverless-express')

var express = require('express');
var app = require('./src/routes')(express());

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => { awsServerlessExpress.proxy(server, event, context) }