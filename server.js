const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://mouri11:sukanya96@ds159400.mlab.com:59400/db_fcc')
var Schema = mongoose.Schema;

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


//Setting up models
//Model to store only usernames
var User_Model = mongoose.model('User_Model', new Schema({user:{type: String, required: true}}));

//Model to log exercises for corresponding usernames
var xSchema = new Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date
});

var Xr_Model = mongoose.model('Xr_Model', xSchema);

//Setting up post actions
//To add a new user
app.post('/api/exercise/new-user', function(req,res) {
  var username = req.body.username;
  User_Model.count({user: username}, (err, count) => {
    if (err) {
      console.log(err);
      res.json({"error": err});
    }
    if (count > 0) {
      res.end("<p>User '" + username + "' already exists!!</p>");
    }
    const user = new User_Model({user: username});
    user.save((err,data) => err ? console.log(err) : res.json({"id": data._id, "username": data.user}));
  })
});

//To log exercise/activity of exisiting user
app.post('/api/exercise/add', function(req,res) {
  var userId = req.body.userId;
  User_Model.count({user:userId}, (err,count) => {
    if (err) {
      console.log(err);
      res.json({"error": err});
    }
    if (count <= 0) {
      res.end("<p>User '" + userId + "' doesn't exist!!</p>");
    }
    const xrcise = new Xr_Model(
      {
        userId: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: new Date(req.body.date)
      }
    );
    xrcise.save((err,data) => err ? console.log(err) : res.json({"user":data.userId,"description":data.description,"duration":data.duration,"date":data.date}));
  })
});

//Get action to fetch exercise logs for user
app.get('/api/exercise/log', function(req,res) {
  if (!req.query.userId) res.end("<p>User Id needed in query!!</p>");
  else {
    var q;
    let response = {};
    var userId = req.query.userId;
    var from = req.query.from;
    var to = req.query.to;
    
    if (from && to) 
      response = {userId: userId, date: { $gt: new Date(from), $lt: new Date(to)}};
    else if(from) 
      response = {userId: userId, date: { $gt: new Date(from)}};
    else if(to) 
      response = {userId: userId, date: { $lt: new Date(to)}};
    else 
      response = {userId: userId};
    
    q = req.query.limit ? Xr_Model.find(response).limit(Number(req.query.limit)) : Xr_Model.find(response);
    //Writing response to client
    q.exec((err,data) => {
      let count = 0;
      data.forEach((user) => {
        res.write("<p>"+ ++count +".</p><p>UserId: "+ user.userId +"</p><p>Description: "+ user.description +"</p><p>Duration: "+ user.duration +"</p><p>Date: "+ user.date +"</p>", ['Transfer-Encoding', 'chunked']);
      });
      res.end();
    });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
