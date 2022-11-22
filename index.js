const { MongoClient, ObjectId } = require('mongodb');
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

connectionObj = client.connect( (err, client) =>{
  if (err) return console.error(err)
  console.log('Connected to Database')

  db = client.db('calendar-db')
  userCollection = db.collection('user')

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
        res.status(200).send({value: "inserted correctly"});
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
