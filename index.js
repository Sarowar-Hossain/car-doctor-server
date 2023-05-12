const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ean6llt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decode) {
    if (error) {
      return res
        .status(403)
        .send({ error: true, message: "unauthorized access" });
    }
    res.decode = decode;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const servicesCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");

    // jwt

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Service
    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:_id", async (req, res) => {
      const id = req.params._id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {
          title: 1,
          price: 1,
          service_id: 1,
          description: 1,
          img: 1,
        },
      };

      // Booking
      app.post("/bookings", async (req, res) => {
        const order = req.body;
        // console.log(order);
        const result = await bookingCollection.insertOne(order);
        res.send(result);
      });

      const result = await servicesCollection.findOne(query, options);
      res.send(result);
      console.log(result);
    });

    app.get("/bookings", verifyJWT, async (req, res) => {
      const decode = res.decode;
      if(decode.email !== req.query.email){
        return res
        .status(403)
        .send({ error: true, message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const cursor = bookingCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // booking delete
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
      console.log(id);
    });

    // booking approve
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      console.log(user);
      const selectedOrder = { _id: new ObjectId(id) };
      const updateOrder = {
        $set: {
          status: user.status,
        },
      };
      const result = await bookingCollection.updateOne(
        selectedOrder,
        updateOrder
      );
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from car doctor server");
});

app.listen(port, () => {
  console.log(`this port is running on port: ${port}`);
});
