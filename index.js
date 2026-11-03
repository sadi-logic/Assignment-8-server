import express from "express"
import cors from "cors";
import cookieParser from "cookie-parser";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'
import { createRemoteJWKSet, jwtVerify } from "jose";

const PORT = 5000;
const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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


const JWKS = createRemoteJWKSet(
  new URL(`${process.env.FRONTEND_URL}/api/auth/jwks`)
);

async function verifyJwt(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${process.env.FRONTEND_URL}/api/auth`,
    audience: "studiospace-server",
  });
  return payload;
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.studio_access;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  try {
    req.user = await verifyJwt(token);
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized access" });
  }
};


app.post("/auth/session", async (req, res) => {
  const authorization = req.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = await verifyJwt(token);

    if (typeof payload.exp !== "number") {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    res.cookie("studio_access", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(0, payload.exp * 1000 - Date.now()),
    });

    return res.sendStatus(204);
  } catch {
    return res.status(401).json({ message: "Unauthorized access" });
  }
});

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

app.get("/my-studio-listing/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.user.email) {
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


app.patch("/studios/:id", verifyToken, async (req, res) => {
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

app.delete("/studios/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const result = await studiosCollection.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 0) {
    return res.status(404).send("Studio not found");
  }
  res.send("Studio deleted successfully");
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