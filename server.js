/* Showing Mongoose's "Populated" Method (18.3.8)
 * INSTRUCTOR ONLY
 * =============================================== */

// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring our Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// Our scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Set mongoose to leverage built in JavaScript ES6 Promises
mongoose.Promise = Promise;


// Initialize Express
var app = express();

// Use morgan and body parser with our app
app.use(logger("dev"));
app.use(bodyParser.urlencoded({
  extended: false
}));

// Make public a static dir
app.use(express.static("public"));

var monURI = "mongodb://heroku_f47zlsmm:4fdg0vog1n5nin264arj5fn0mr@ds151951.mlab.com:51951/heroku_f47zlsmm";

// Database configuration with mongoose
mongoose.connect(monURI);
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
  console.log("Mongoose Error: ", error);
});

// Once logged in to the db through mongoose, log a success message
db.once("open", function() {
  console.log("Mongoose connection successful.");
});


// Routes
// ======

// A GET request to scrape the echojs website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  request("http://www.reddit.com/r/StarWars", function(error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);

            console.log("HERE IS $ ----------- " + $);

  var resultObject = {};

  $("div.thing").each(function(i, element) {

    resultObject.dataURL = $(element).attr("data-url");
        console.log("SCRAPED ----------- LINK" + resultObject.link);
  });

  // With cheerio, find each p-tag with the "title" class
  // (i: iterator. element: the current element)
  $("p.title").each(function(i, element) {


    // Save the text of the element (this) in a "title" variable
    resultObject.title = $(this).text();

    // In the currently selected element, look at its child elements (i.e., its a-tags),
    // then save the values for any "href" attributes that the child elements may have
    resultObject.link = $(element).children().attr("href");


    // console.log("HERE IS WHAT HAS ARRIVED: " + element.children);

    // Save these results in an object that we'll push into the result array we defined earlier
      // Using our Article model, create a new entry
      // This effectively passes the result object to the entry (and the title and link)
      var entry = new Article(resultObject);

      // Now, save that entry to the db
      entry.save(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        // Or log the doc
        else {
          console.log("logged.");
        }

            // console.log("================")

    // console.log("Here is resultobject:" + resultObject)

      });
   


  });



    // $("article h2").each(function(i, element) {

    //   // Save an empty result object
    //   var result = {};

    //   // Add the text and href of every link, and save them as properties of the result object
    //   result.title = $(this).children("a").text();
    //   result.link = $(this).children("a").attr("href");

    //   // Using our Article model, create a new entry
    //   // This effectively passes the result object to the entry (and the title and link)
    //   var entry = new Article(result);

    //   // Now, save that entry to the db
    //   entry.save(function(err, doc) {
    //     // Log any errors
    //     if (err) {
    //       console.log(err);
    //     }
    //     // Or log the doc
    //     else {
    //       console.log(doc);
    //     }
    //   });
    // });



  });
  // Tell the browser that we finished scraping the text
  res.send("Scrape Complete");
});

// This will get the articles we scraped from the mongoDB
app.get("/articles", function(req, res) {
  // Grab every doc in the Articles array
  Article.find({}, function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Or send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});

// Grab an article by it's ObjectId
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  Article.findOne({ "_id": req.params.id })
  // ..and populate all of the notes associated with it
  .populate("note")
  // now, execute our query
  .exec(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise, send the doc to the browser as a json object
    else {
      res.json(doc);
    }
  });
});


// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  var newNote = new Note(req.body);

  // And save the new note the db
  newNote.save(function(error, doc) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    // Otherwise
    else {
      // Use the article id to find and update it's note
      Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
      // Execute the above query
      .exec(function(err, doc) {
        // Log any errors
        if (err) {
          console.log(err);
        }
        else {
          // Or send the document to the browser
          res.send(doc);
        }
      });
    }
  });
});


// Listen on port 27017
app.listen(process.env.PORT || 3000, function() {
  console.log("App running on port" + process.env.PORT);
});
