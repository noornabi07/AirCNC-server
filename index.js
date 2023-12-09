const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan')
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

const stripe = require("stripe")(`${process.env.PAYMENT_PRIVET_KEY}`);

// middleware
const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));


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


// validate verify jwt
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    const token = authorization.split(' ')[1];
    // verify token 
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized Access' })
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {

        const usersCollection = client.db("aircncDB").collection("users");
        const roomsCollection = client.db("aircncDB").collection("rooms");
        const bookingsCollection = client.db("aircncDB").collection("bookings");


        // Generate client secret for payment
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            if (price) {
                const amount = parseFloat(price) * 100;
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']
                })
                res.send({ clientSecret: paymentIntent.client_secret })
            }
        })

        app.post('/jwt', async (req, res) => {
            const email = req.body;
            const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token });

        })

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


        // get users by the email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result);
        })

        // get room data info create api
        app.get('/rooms', async (req, res) => {
            const result = await roomsCollection.find().toArray();
            res.send(result);
        })

        // get room by the using email
        app.get('/rooms/:email', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.params.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden Access' })
            }
            const query = { 'host.email': email };
            const result = await roomsCollection.find(query).toArray();
            res.send(result);
        })

        // get describes single room by the id
        app.get('/room/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await roomsCollection.findOne(query);
            res.send(result);

        })



        // save a room in to the database
        app.post('/rooms', async (req, res) => {
            const room = req.body;
            const result = await roomsCollection.insertOne(room);
            res.send(result);
        })

        // update status for rooms
        app.patch('/rooms/status/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    booked: status
                }
            }
            const result = await roomsCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // delete a room by the user id
        app.delete('/rooms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await roomsCollection.deleteOne(query);
            res.send(result);
        })

        // get booking by the user email guest
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                res.send([])
            }

            const query = { 'guest.email': email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // get manage booking by the booking select host
        app.get('/manageBookings', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            const query = { host: email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        // save a booking in to the database
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        })

        // delete a booking by the email
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
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