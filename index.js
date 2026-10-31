import express from "express"
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'

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

const connectClient= await connectToMongoDB();
const db = connectClient.db("studiospace");
const studiosCollection =db.collection("studios")
const studioBookingCollection = db.collection("studioBookings")

app.get("/",(req,res)=>{
  res.send("Hello world")
  
})

app.post("/studios",async(req,res)=>{
    const studioData = req.body;
    const result = await studiosCollection.insertOne(studioData);
    res.send(result);
})

app.get("/studios",async (req,res)=>{
    const result = await studiosCollection.find().toArray();

    res.send(result);
})

app.get("/studios/:id", async (req, res) => {
  const id = req.params.id;

  const studio = await studiosCollection.findOne({_id: new ObjectId(id)});

  if (!studio) {
    return res.status(404).send("Studio not found");
  }

  res.send(studio);
});

app.post("/studios/booking",async(req,res)=>{
  const bookingData = req.body;
  const result = await studioBookingCollection.insertOne(bookingData);
  res.send(result);
})

app.listen(PORT,()=>{
    console.log(`SERVER is running on port ${PORT}`);
})