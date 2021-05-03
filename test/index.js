require("dotenv").config();
// process.env.NODE_ENV = "testing";
global.chai = require('chai');
global.expect = chai.expect;


global.testToken = process.env.TOKEN;
require("./routes");