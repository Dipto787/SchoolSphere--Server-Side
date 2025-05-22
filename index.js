let express = require('express');
let app = express();
let cors = require('cors');
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());

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
        let studentsCollection = client.db('School-Sphere').collection('students');

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        app.get('/students', async (req, res) => {
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


        app.get('/countStudents', async (req, res) => {
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