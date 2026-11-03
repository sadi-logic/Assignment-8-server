import express from "express"
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from "jose";

const PORT = 5000;
const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectClient = await connectToMongoDB();
const db = connectClient.db("studiospace");
const studiosCollection = db.collection("studios")
const studioBookingCollection = db.collection("studioBookings")

//middleware to verify the token
const verifyToken = async(req, res, next) => {
  const authHeader = req.headers.authorization;

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" })
  }
  const JWKS = createRemoteJWKSet(
    new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`)
  );

  try{
    const {payload} = await jwtVerify(token, JWKS, {
      issuer: `${process.env.FRONTEND_URL}/api/auth`,
      audience: "studiospace-server"
    });
    req.user = payload;
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  next();
}

app.get("/", (req, res) => {
  res.send("Hello world")

})


app.post("/studios", verifyToken, async (req, res) => {
  const studioData = req.body;
  const result = await studiosCollection.insertOne(studioData);
  res.send(result);
})

app.get("/studios", async (req, res) => {
  const result = await studiosCollection.find().toArray();

  res.send(result);
})

app.get("/my-studio-listing/:email", async (req, res) => {
  const email = req.params.email;

  if(email !== req.user.email){
    return res.status(403).send({ message: "Forbidden access" });
  }
  const result = await studiosCollection.find({ CreatorEmail: email }).toArray();
  
  res.send(result);
});

app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;

  const studio = await studiosCollection.findOne({ _id: new ObjectId(id) });

  if (!studio) {
    return res.status(404).send("Studio not found");
  }

  res.send(studio);
});


app.patch("/studios/:id", async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  const result = await studiosCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedData }
  );

  if (result.matchedCount === 0) {
    return res.status(404).send("Studio not found");
  }

  res.send("Studio updated successfully");
});



app.post("/studios/booking", verifyToken, async (req, res) => {
  const bookingData = req.body;
  const result = await studioBookingCollection.insertOne(bookingData);
  res.send(result);
})

app.get("/studios/booking/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  const result = await studioBookingCollection.find({ email: email }).toArray();
  res.send(result);
});

app.delete("/studios/booking/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await studioBookingCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

app.listen(PORT, () => {
  console.log(`SERVER is running on port ${PORT}`);
})