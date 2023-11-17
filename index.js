const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.cnuoch3.mongodb.net/?retryWrites=true&w=majority`;

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

        const usersCollection = client.db("aircncDB").collection("users");
        const roomsCollection = client.db("aircncDB").collection("rooms");
        const bookingsCollection = client.db("aircncDB").collection("bookings");


        // users info save in to the DB
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await usersCollection.updateOne(query, updateDoc, options);
            res.send(result);
        })

        // get room data info create api
        app.get('/rooms', async(req, res) =>{
            const result = await roomsCollection.find().toArray();
            res.send(result);
        })

        // get describes single room by the id
        app.get('/room/:id', async(req, res) =>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await roomsCollection.findOne(query);
            res.send(result);

        })

        // get users by the email
        app.get('/users/:email', async(req, res) =>{
            const email = req.params.email;
            const query = {email: email};
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // save a room in to the database
        app.post('/rooms', async(req, res) =>{
            const room = req.body;
            const result = await roomsCollection.insertOne(room);
            res.send(result);
        })

        // update status for rooms
        app.patch('/rooms/status/:id', async(req, res) =>{
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: new ObjectId(id)};
            const updateDoc = {
                $set : {
                    booked: status
                }
            }
            const result = await roomsCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // save a booking in to the database
        app.post('/bookings', async(req, res) =>{
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Air CNC Home Guest Running....')
})

app.listen(port, () => {
    console.log(`Air cnc guest house server is running:${port}`)
})