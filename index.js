const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const admin = require('firebase-admin');
const configs = require('./configs/config')
require('dotenv').config();


const app = express();
app.use(cors());
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(configs)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vzza0.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const bookingCollection = client.db(process.env.DB_NAME).collection("bookings");

    app.get('/bookings', (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];

            admin.auth().verifyIdToken(idToken)
                .then((decodedToken) => {
                    const email = decodedToken.email;
                    const qryEmail = req.query.email;
                    if (email === qryEmail) {
                        bookingCollection.find({ email: qryEmail })
                            .toArray((err, docs) => {
                                res.send(docs);
                            })
                    } else {
                        res.status(401).send('Opps sorry! Un-authorized user!')
                    }
                })
                .catch((error) => {
                    res.status(401).send('Opps sorry! Un-authorized user!')
                });
        } else {
            res.status(401).send('Opps sorry! Un-authorized user!')
        }
    })

    app.post('/addBooking', (req, res) => {
        const bookingInfo = req.body;
        bookingCollection.insertOne(bookingInfo)
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    app.delete("/delete/:id", (req, res) => {
        const bearer = req.headers.authorization;
        if (bearer && bearer.startsWith('Bearer ')) {
            const idToken = bearer.split(' ')[1];

            admin.auth().verifyIdToken(idToken)
                .then((decodedToken) => {
                    const email = decodedToken.email;
                    const qryEmail = req.query.email;

                    if (email === qryEmail) {
                        const id = req.params.id;
                        bookingCollection.deleteOne({ _id: ObjectId(id) })
                            .then(result => {
                                res.send(result.deletedCount > 0);
                            })
                    } else {
                        res.status(401).send('Opps sorry! Un-authorized user!')
                    }
                })
                .catch((error) => {
                    res.status(401).send('Opps sorry! Un-authorized user!')
                });
        } else {
            res.status(401).send('Opps sorry! Un-authorized user!')
        }
    });

});


app.get('/', (req, res) => {
    res.send('Welcome')
})

app.listen(process.env.PORT || 420);