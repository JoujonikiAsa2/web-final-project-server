const express = require('express')
const cors = require('cors')
require("dotenv").config()
const app = express()
const port = process.env.PORT || 5001

app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ghkhwep.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const menuCollections = client.db("BistroBossDB").collection("menus")
    const reviewCollections = client.db("BistroBossDB").collection("reviews")

    // Menu data
    app.get("/menus", async(req,res)=>{
        const menus =  menuCollections.find()
        const result = await menus.toArray()
        res.send(result)
    })

    // review data
    app.get("/reviews", async(req,res)=>{
        const menus =  reviewCollections.find()
        const result = await menus.toArray()
        res.send(result)
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => res.send('Bistro Boss Is Running...........'))
app.listen(port, () => console.log(`Example app listening on port ${port}!`))