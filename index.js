const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require("dotenv").config()
const app = express()
const port = process.env.PORT || 5001

app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const cartCollections = client.db("BistroBossDB").collection("carts")
    const userCollections = client.db("BistroBossDB").collection("users")

    // middlewares
    // veifyToken

    const verifyToken = (req, res, next) => {
      console.log("Inside verifyToken: ", req.headers)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized' })
      }
      const token = req.headers.authorization.split(' ')[1]

      // verify the token

      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'Forbidden' })
        }
        req.decoded = decoded

        next()
      })

    }

    // Users
    app.get("/users", verifyToken, async (req, res) => {
      console.log(req.headers)
      const users = userCollections.find()
      const result = await users.toArray()
      res.send(result)
    })


    // Menu data
    app.get("/menus", async (req, res) => {
      const menus = menuCollections.find()
      const result = await menus.toArray()
      res.send(result)
    })


    // for pagination
    app.get("/totalMenus", async (req, res) => {
      const count = await menuCollections.estimatedDocumentCount()
      res.send({ count })
    })

    // review data
    app.get("/reviews", async (req, res) => {
      const menus = reviewCollections.find()
      const result = await menus.toArray()
      // console.log(result)
    })

    // Cart data
    app.get("/carts", async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const carts = cartCollections.find(query)
      const result = await carts.toArray()
      res.send(result)
    })


    app.post('/carts', async (req, res) => {
      const cartItem = req.body
      const result = await cartCollections.insertOne(cartItem)
      res.send(result)
    })


    //About user
    app.post('/users', async (req, res) => {
      const user = req.body
      // insert email if a user doesnot exist:
      // you can do this in many way
      const query = { email: user.email }
      const existingUser = await userCollections.findOne(query)
      if (existingUser) {
        return res.send({ message: "User already exists", insertedId: null })
      }
      const result = await userCollections.insertOne(user)
      res.send(result)
    })


    // Create jwt for secure api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user /*payload which data we want to store*/, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await cartCollections.deleteOne(query)
      res.send(result)
    })
    // users

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin',
        }
      }
      const result = await userCollections.updateOne(filter, updatedDoc)
      res.send(result)
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollections.deleteOne(query)
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