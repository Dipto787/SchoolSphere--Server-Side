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


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        let MyClassRoomCollection = client.db('School-Sphere').collection('myClass');
        let userCollection = client.db('School-Sphere').collection('users');
        let isStudentCollection = client.db('School-Sphere').collection('student-request');
        let classRoutineSchedule = client.db('School-Sphere').collection('routine-schedule');

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        let verifyStudent = async (req, res, next) => {
            let email = req.decoded.email;
            let student = await studentsCollection.findOne({ email });
            const isStudent = student.isRegistration === true;
            if (!isStudent) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        let verifyAdmin = async (req, res, next) => {
            let email = req.decoded.email;
            let admin = await userCollection.findOne({ email });
            let isAdmin = admin?.isAdmin === true;
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


        app.post('/jwt', (req, res) => {
            let user = req.body;
            let token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ token });
        })



        app.get('/countStudents', verifyToken, async (req, res) => {
            let gender = req.query.gender;
            let className = req.query.className;
            let query = {};

            if (gender && gender !== 'null') query.gender = gender;
            if (className && className !== 'null') query.class = className;

            let count = await studentsCollection.countDocuments(query);
            res.send({ count });
        })


        app.get('/classRoom/:email', async (req, res) => {
            let user = req.params.email;
            console.log()
            let query = { email: user };
            let result = await MyClassRoomCollection.findOne(query);
            res.send(result);

        })

        app.post('/students', async (req, res) => {
            let students = req.body;
            console.log('first,', students)
            delete students._id;
            let result = await isStudentCollection.insertOne(students);
            res.send(result);

        })


        app.post('/students/admin', async (req, res) => {
            let students = req.body;
            console.log('posted user', students)
            let result = await studentsCollection.insertOne(students);
            res.send(result);

        })

        app.delete('/student/:email', verifyToken, verifyAdmin, async (req, res) => {
            let email = req.params.email;
            let query = { email };
            let result = await isStudentCollection.deleteOne(query);
            res.send(result);
        })

        app.delete('/students/:email', verifyToken, verifyAdmin, async (req, res) => {
            let email = req.params.email;
            console.log('delete this')
            let result = await studentsCollection.deleteOne({ email });
            res.send(result);
        })


        app.get('/student/:email', async (req, res) => {
            let email = req.params.email;
            let exit = await isStudentCollection.findOne({ email: email });
            if (exit) {
                return res.send(exit);
            }

            let result = await studentsCollection.findOne({ email });
            res.send(result);

        })

        app.get('/students', verifyToken, async (req, res) => {
            const page = parseInt(req.query.page) || 0;
            const size = parseInt(req.query.size) || 10;
            const gender = req.query.category;
            console.log(gender)
            const className = req.query.className;
            console.log(className)
            let query = {};
            query.isRegistration = true;
            // Handle class filter
            if (className && className !== 'null' && className !== 'Select Class') {
                query.className = className;
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



        app.get('/students/admin', async (req, res) => {
            let result = await isStudentCollection.find().toArray();
            res.send(result);
        })




        app.patch('/student/:email', verifyToken, verifyAdmin, async (req, res) => {
            let status = req.body;
            let email = req.params.email;
            let updateDoc = {
                $set: {
                    isRegistration: status?.status
                }
            }
            let finding = await studentsCollection.updateOne({ email }, updateDoc);
            res.send(finding);
        })

        app.patch('/students/:email', verifyToken, verifyAdmin, async (req, res) => {
            let status = req.body;
            let email = req.params.email;
            let updateDoc = {
                $set: {
                    isRegistration: status?.status
                }
            }
            let finding = await isStudentCollection.updateOne({ email }, updateDoc);
            res.send(finding);
        })



        app.post('/user', async (req, res) => {
            let user = req.body;
            console.log('Incoming user:', user);

            let isExist = await userCollection.findOne({ email: user.email });
            if (isExist) {
                return res.send({ message: 'already in database' });
            }

            let result = await userCollection.insertOne(user); // ← You were using findOne incorrectly
            res.send(result);
        });


        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            let email = req.params.email;
            if (email !== req.decoded.email) {
                return res.send({ message: 'unauthorized access' })
            }

            let query = { email: email };
            let result = await userCollection.findOne(query);

            let admin = false;
            if (result) {
                admin = result?.isAdmin

            }
            console.log('fdf', admin)

            res.send({ admin });
        })


        app.get('/users', async (req, res) => {
            let result = await userCollection.find().toArray();
            res.send(result);
        })


        app.post('/routine-schedule', async (req, res) => {
            let result = await classRoutineSchedule.insertOne(req.body);
            res.send(result);
        })

        app.get('/routine-schedule', async (req, res) => {
            let result = await classRoutineSchedule.find().toArray();
            res.send(result);
        })

        app.get('/routine-schedule/:id', async (req, res) => {
            console.log('find this', req.params.id)
            let query = { _id: new ObjectId(req.params.id) };
            let result = await classRoutineSchedule.findOne(query);
            res.send(result);
        })

        app.delete('/routine-schedule/:id', async (req, res) => {
            let result = await classRoutineSchedule.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result);
        })

        app.put('/routine-schedule/:id', async (req, res) => {
            console.log(req.body);
            let id = req.params.id;
            let query = { _id: new ObjectId(id) };

            let updateDoc = {
                $set: req.body
            }
            let result = await classRoutineSchedule.updateOne(query, updateDoc);
            res.send(result);
        })


        app.get('/routine', async (req, res) => {
            let category = req.query.category;
            if (!category) {
                return;
            }

            let query = { class: { $in: [category] } };
            console.log(query, category)
            let result = await classRoutineSchedule.findOne(query);
            res.send(result);
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