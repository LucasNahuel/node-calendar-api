const { MongoClient, ObjectId, LEGAL_TCP_SOCKET_OPTIONS, Int32 } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express();
var bodyParser = require("body-parser");
app.use(cors());
app.use(bodyParser.json());
const port = 4200;
const dotenv = require('dotenv');
dotenv.config();

console.log(process.env.PASSWORD);

//mongo connections properties
const username = process.env.USERNAME.toLowerCase();
const password = process.env.PASSWORD;
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
      res.status(401).send({valid : false});
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

app.post("/createEvent", authorizeUser, (req, res) => {


  async function createEvent(){
    const {name, beginDate, endDate, description, calendarId} = req.body;

    let event = {
      name : name,
      beginDate : new Date(beginDate),
      endDate : new Date(endDate),
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


});


app.get("/getNextEvents/:calendarId/:dateSince", authorizeUser, (req, res) => {


  async function getNextEvents(){

    let user = req.user;
    let calendarId = req.params.calendarId;
    let dateSince = new Date(+req.params.dateSince);
    dateSince.setHours(0, 0, 0, 0);

    console.log("this is the date from where to find next events");
    console.log(dateSince);
     
  
    let eventsCursor = await eventCollection.find({calendarId : ObjectId(calendarId), beginDate: { $gt: dateSince}}).limit(10);
    let eventsFound = await eventsCursor.toArray();

    console.log("this is the last events:");
    console.log(eventsFound);



    res.status(200).send({value : eventsFound});


  
  }

  getNextEvents().catch(err=> {
    console.log("cant get next events "+err);
    res.status(500).send({value: "An error occurred while searching next events"});
  });

});


app.get("/getEventsByDay/:calendarId/:dayDate", authorizeUser, (req, res) => {

  async function getEventsByDay(){

    const calendarId = req.params.calendarId;
    let dayBegin = new Date(+req.params.dayDate);
    dayBegin.setHours(0, 0, 0, 0);

    let dayEnd = new Date(+req.params.dayDate);
    dayEnd.setHours(23, 59, 59, 59);


    

    let allEventsFound = [];

    //find events who begins this day:
    let eventsStartingThisDayFoundCursor = eventCollection.find({calendarId : ObjectId(calendarId), beginDate : {$gte: dayBegin, $lte : dayEnd}});
    allEventsFound = allEventsFound.concat(await eventsStartingThisDayFoundCursor.toArray());


    //find events who end this day or covers this day

    let eventsBetweenThisDay = eventCollection.find({calendarId : ObjectId(calendarId), beginDate : {$lt : dayBegin}, endDate: {$gt : dayBegin}});
    allEventsFound = allEventsFound.concat(await eventsBetweenThisDay.toArray());


    allEventsFound = allEventsFound.sort((a, b) =>{
      if(a.beginDate < b.beginDate){
        return -1;
      }
      if(a.beginDate > b.beginDate){
        return 1;
      }

      return 0
    });

    res.status(200).send({ value : allEventsFound});


  }

  getEventsByDay().catch(err =>{
    console.log("there was an error retrieving events by day: "+err);
    res.status(500).send({value: "there was and error retrieving events"});
  });

});


app.post("/editEvent", authorizeUser, (req,res) => {

  async function editEvent(){

    let event = {
      name : req.body.name,
      description : req.body.description,
      beginDate : new Date(req.body.beginDate),
      endDate : new Date(req.body.endDate),
      calendarId : ObjectId(req.body.calendarId)
    }

    let update = await eventCollection.updateOne({_id : ObjectId(req.body._id)}, { $set: event });

    if (update.acknowledged == true){
      res.status(200).send({'value' : 'Updated correctly'});
    }

  }

  editEvent().catch((err)=>{
    console.log("error editing event: "+err);
    res.status(500).send({'value': 'Something went wrong updating event'});
  })
});


app.delete("/eventDelete/:eventId", authorizeUser, (req,res) => {

  async function eventDelete(){
    const eventId = req.params.eventId;

    let eventDelete = await eventCollection.deleteOne({_id : ObjectId(eventId)});

    if(eventDelete && eventDelete.acknowledged === true){
      res.status(200).send({message : "Deleted correctly"});
    }
  }

  eventDelete().catch(err => {
    console.log("there was an error deleting event"+ err);
    res.status(500).send({'value': 'Something went wrong'});
  })

});


