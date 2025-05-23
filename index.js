let express = require('express');
let app = express();
let cors = require('cors');
let cookieParser = require('cookie-parser');
app.use(cookieParser());
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
let jwt = require('jsonwebtoken');

require('dotenv').config();
let port = process.env.PORT || 5000;


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jt86e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        let verifyToken = (req, res, next) => {
            const token = req.cookies?.token;
            if (!token) {
                return res.status(401).send({
                    message: 'unauthorized access'
                })
            }

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decode) => {
                if (error) {
                    return res.status(401).send({
                        message: 'forbidden access'
                    })
                }

                req.decoded = decode;
                next();
            })
        }

        let studentsCollection = client.db('School-Sphere').collection('students');

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        app.post('/jwt', (req, res) => {
            let user = req.body;
            let token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ token });
        })

        app.get('/students', verifyToken, async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const size = parseInt(req.query.size) || 10;
            const gender = req.query.category;
            const className = req.query.className;

            let query = {};

            // Handle class filter
            if (className && className !== 'null' && className !== 'Select Class') {
                query.class = className;
            }

            // Handle gender filter only if it's not "All Students"
            if (gender && gender !== 'All Students' && gender !== 'null') {
                query.gender = gender;
            }

            // Pagination
            const result = await studentsCollection
                .find(query)
                .skip(page * size)
                .limit(size)
                .toArray();

            res.send(result);
        });


        app.get('/countStudents', verifyToken, async (req, res) => {
            let gender = req.query.gender;
            let className = req.query.className;
            let query = {};

            if (gender && gender !== 'null') query.gender = gender;
            if (className && className !== 'null') query.class = className;

            let count = await studentsCollection.countDocuments(query);
            res.send({ count });
        })
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
    res.send('wow')
})

app.listen(port, () => {
    console.log(`The SchoolSphere Running on port no ${port} `)
})  