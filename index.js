const express = require('express')
const cors = require('cors')
require("dotenv").config()
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);

const mg = mailgun.client({
  username: 'api',
  key: process.env.MAIL_GUN_API_KEY,
});
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
    const bookingCollections = client.db("BistroBossDB").collection("bookings")
    const paymentCollections = client.db("BistroBossDB").collection("payments")

    // middlewares
    // veifyToken

    const verifyToken = (req, res, next) => {
      // console.log("Inside verifyToken: ", req.headers)
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
        console.log("decoded value is:", req.decoded)

        next()
      })

    }

    const adminVerify = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await userCollections.findOne(query)
      const isAdmin = user?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" })
      }
      next()
    }

    // Users
    app.get("/users", verifyToken, adminVerify, async (req, res) => {
      try {
        // console.log(req.headers)
        const users = userCollections.find()
        const result = await users.toArray()
        res.send(result)
      } catch (error) {
        console.log("Can not get data from users: ", error)

      }
    })


    app.get("/menus/:id", async (req, res) => {
      try {
        const id = req.params.id
        console.log("id", id)
        const query = { _id: new ObjectId(id) }
        const result = await menuCollections.findOne(query)
        res.send(result)
      } catch (error) {
        console.log("Can not get data from menus by id: ", error)
      }
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;

        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'forbidden access' })
        }

        const query = { email: email };
        const user = await userCollections.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === 'admin';
        }
        res.send({ admin });
      } catch (error) {
        console.log("Can not get admin data by email: ", error)

      }
    })

    // Menu data
    app.get("/menus", async (req, res) => {
      try {
        const menus = menuCollections.find()
        const result = await menus.toArray()
        res.send(result)
      } catch (error) {
        console.log("Can not get data from menus: ", error)

      }
    })


    // for pagination
    app.get("/totalMenus", async (req, res) => {
      try {
        const count = await menuCollections.estimatedDocumentCount()
        res.send({ count })
      } catch (error) {
        console.log("Can not get the total data count from menus: ", error)
      }
    })

    // review data
    app.get("/reviews", async (req, res) => {
      try {
        const reviews = reviewCollections.find()
        const result = await reviews.toArray()
        res.send(result)
      } catch (error) {
        console.log("Can not get data from reviews: ", error)

      }
    })

    // Cart data
    app.get("/carts", async (req, res) => {
      try {
        const email = req.query.email
        const query = { email: email }
        const carts = cartCollections.find(query)
        const result = await carts.toArray()
        res.send(result)
      } catch (error) {
        console.log("Can not get data from carts: ", error)

      }
    })


    app.post('/carts', async (req, res) => {
      try {
        const cartItem = req.body
        const result = await cartCollections.insertOne(cartItem)
        res.send(result)
      } catch (error) {
        console.log("Added data to cart has an error: ", error)
      }
    })

    app.post('/menus', async (req, res) => {
      try {
        const food = req.body
        const result = await menuCollections.insertOne(food)
        res.send(result)
      } catch (error) {
        console.log("Added data to menu has an error: ", error)
      }

    })

    // bookings
    app.post('/bookings', async (req, res) => {
      const booking = req.body
      const result = await bookingCollections.insertOne(booking)
      res.send(result)
    })
    app.get('/bookings', async (req, res) => {
      const booking = req.body
      const allBooking = bookingCollections.find()
      const result = await allBooking.toArray()
      res.send(result)
    })

    app.patch('/menus/:id', async (req, res) => {
      try {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const food = req.body
        console.log(food)
        const updatedDoc = {
          $set: {
            name: food.name,
            recipe: food.recipe,
            category: food.category,
            image: food.image,
            price: food.price,
          }
        }
        console.log(food)
        const result = await menuCollections.updateOne(filter, updatedDoc)
        res.send(result)
      } catch (error) {
        console.log("Added data to menu has an error: ", error)
      }
    })


    //About user
    app.post('/users', async (req, res) => {
      try {
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
      }
      catch {
        error => {
          console.log("Added data to user has an error: ", error)
        }
      }
    })


    // Create jwt for secure api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user /*payload which data we want to store*/, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    app.delete('/carts/:id', async (req, res) => {
      try {
        const id = req.params.id
        console.log("Deleted id", id)
        const query = { _id: new ObjectId(id) }
        const result = await cartCollections.deleteOne(query)
        res.send(result)
      } catch (error) {
        console.log("Can not delete data from carts by id: ", error)
      }
    })

    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { price } = req.body
        const amount = parseInt(price * 100)

        console.log("Amount inside cart", amount)

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        })

        res.send(
          {
            clientSecret: paymentIntent.client_secret
          })
      }
      catch {
        error => console.log(error)
      }
    })

    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const result = await paymentCollections.find(query).toArray()
      res.send(result)
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollections.insertOne(payment);
      console.log('payment info', payment);

      const query = {
        _id: {
          $in:
            payment.cartIds.map(id => new ObjectId(id))
        }
      }

      const deleteResult = await cartCollections.deleteMany(query)

      // send email to user
      mg.messages
        .create(process.env.MAIL_SENDING_DOMAIN, {
          from: "Mailgun Sandbox <postmaster@sandboxc1aa9a2ee60749efa879395b105b40d1.mailgun.org>",
          to: ["joujonikiasaroy@gmail.com"],
          subject: "Bistro Boss Order Confirmation",
          html: `<div>
            <h2>Hey Joujoniki Asa Roy</h2>

            <h4>Thank you for your payment. Your transaction ID: <strong>${payment.transactionId}</strong></h4>
          </div>`
        })
        .then(msg => console.log(msg)) // logs response data
        .catch(err => console.log(err));

      res.send({ paymentResult, deleteResult })
    })


    // users

    app.patch('/users/admin/:id', verifyToken, adminVerify, async (req, res) => {
      try {
        const id = req.params.id
        const filter = { _id: new ObjectId(id) }
        const updatedDoc = {
          $set: {
            role: 'admin',
          }
        }
        const result = await userCollections.updateOne(filter, updatedDoc)
        res.send(result)
      } catch (error) {
        console.log("Failed to added a user role: ", error)

      }
    })
    app.delete('/users/:id', verifyToken, adminVerify, async (req, res) => {
      try {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await userCollections.deleteOne(query)
        res.send(result)
      } catch (error) {
        console.log("Failed to delete an user: ", error)
      }
    })
    // menu
    app.delete('/menus/:id', async (req, res) => {
      try {
        const id = req.params.id
        const query = { _id: new ObjectId(id) }
        const result = await menuCollections.deleteOne(query)
        res.send(result)
      } catch (error) {
        console.log("Failed to delete an user: ", error)
      }
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