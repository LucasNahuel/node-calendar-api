const { MongoClient, ObjectId, LEGAL_TCP_SOCKET_OPTIONS } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
var bodyParser = require("body-parser");
app.use(cors());
app.use(bodyParser.json());
const port = 4200;

//mongo connections properties
const username = encodeURIComponent("lucas");
const password = encodeURIComponent("can_317");
const clusterUrl = "cluster0.ypdud.mongodb.net";
const authMechanism = "DEFAULT";
const uri = `mongodb+srv://${username}:${password}@${clusterUrl}/?authMechanism=${authMechanism}`;
//mongo client
const client = new MongoClient(uri);

//mongo calendar database

let db;

//mongo collections
let userCollection;
let calendarCollection;
let eventCollection;

connectionObj = client.connect( (err, client) =>{
  if (err) return console.error(err)
  console.log('Connected to Database')

  db = client.db('calendar-db')
  userCollection = db.collection('user');
  calendarCollection = db.collection('calendar');
  eventCollection = db.collection('event');

  app.listen(port, function () {
    console.log('listening on '+port)
  });

});



app.get('/', (req, res) => {
  res.send('Calendar API works!');
});

app.post('/register', (req, res) =>{

  async function register(){

    console.log(req.body);

    const {username, password} = req.body;

    

    await userCollection.insertOne({username : username, password : password}).then(result =>{
      if(result != null){
        res.status(200).send({value: "inserted correctly", username : username, password : password});
      }else{
        res.status(400).send({value: "error saving user"});
      }
    });

  }

  register().catch(err =>{
    console.log("error in /register : "+err);
    res.status(500).send({value : "something went wrong"});
  });
});

app.get('/usernameExists/:username', (req, res)=>{

  async function usernameExists(){

    
    const user = req.params.username;

    let userFound = await userCollection.findOne({ username : user });

    if(userFound != null){
      res.status(200).send({ value : true });
    }else{
      res.status(200).send({value : false});
    }
  }

  usernameExists().catch( err => {
    console.log("error in usernameExists() : "+err);
    res.status(500).send({value : "something went wrong"});
  });


});


app.get("/login/:username/:password", (req,res) =>{


  async function login(){
    const username = req.params.username;
    const password = req.params.password;
  
    let user = await userCollection.findOne({username : username, password : password});
  
    if(user != null){
      res.status(200).send({valid: true, username : user.username, password : user.password});
    }else{
      res.status(200).send({valid : false});
    }
  
  }


  login().catch( err =>{
    console.log("error on login : "+err);
    res.status(500).send({value: "something went wrong"});
  });
});


const authorizeUser = (req, res, next) => {

  async function authorize(){
    const username = req.headers['username'];
    const password = req.headers['password'];

    console.log("username : " + username + ", password : "+password);

    let user = await userCollection.findOne({username : username, password : password});

    console.log("retrieved user: "+{user});


    if (user) {
      req.user = user;
      next();
    } else {
      res.sendStatus(401);
    }
  }

  authorize().catch(err => {
    console.log("error authorizing "+err);
    res.status(500).send("something went wrong");
  });

};

app.post("/createCalendar", authorizeUser, (req, res)=>{

  async function createCalendar(){
    const {calendarName, description, timezone} = req.body;
    const user = req.user;

    console.log("user in create");
    console.log({user});

    let calendar = {
      userId : user._id,
      calendarName : calendarName,
      description : description,
      timezone : timezone
    }

    let insertedCalendar = await calendarCollection.insertOne(calendar);

    if(insertedCalendar){
      res.status(200).send({value : "inserted correctly"});
    }else{
      res.status(400).send({value : "error inserting calendar"});
    }
  }

  createCalendar().catch(err=>{
    console.log("error creating calendar "+err);
  });

});

app.get("/getCalendars", authorizeUser, (req, res)=>{
  

  async function getCalendars(){
    let user = req.user;

    let calendarsCursor = await calendarCollection.find({userId : user._id});
    let calendarsArray = await calendarsCursor.toArray();
    
    console.log("retrieved calendars");

    console.log(calendarsArray);

    if(calendarsArray){
      res.status(200).send({value : calendarsArray});
    }else{
      res.status(200).send({value : null});
    }
  }

  getCalendars().catch(err => {
    console.log("error getting calendars"+err);
  })
});


app.delete("/deleteCalendar/:calendarId", (req, res) => {

  async function deleteCalendar(){
    const calendarId = req.params.calendarId;
    let deleted = await calendarCollection.deleteOne({_id : ObjectId(calendarId)});

    if(deleted && deleted.acknowledged === true){
      res.status(200).send({message : "deleted correctly"});
    }else{
      console.log("cant delete calendar"+ deleted);
    }
  }

  deleteCalendar().catch(err=>{
    console.log("error deleting calendar "+err);
    res.status(500).send("error deleting calendar");
  })

});

app.post("/createEvent", (req, res) => {


  async function createEvent(){
    const {name, beginDate, endDate, description, calendarId} = req.body;

    let event = {
      name : name,
      beginDate : beginDate,
      endDate : endDate,
      description : description,
      calendarId: ObjectId(calendarId)
    }

    let inserted = await eventCollection.insertOne(event);

    if(inserted && inserted.acknowledged == true){
      res.status(200).send({value: "Event inserted correctly"});
    }
  }

  createEvent().catch(err=> {
    console.log("there was an error creating event: "+err);
    res.status(500).send({value: "Error creating event"});
  });


})



