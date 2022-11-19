const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', async (req, res) => {
    res.send('Server is running');
})

// DB_USER: doctorsPortalDB
// DB_PASSWORD: uiG3m42Inmpx3UFw

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mmmt3qa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        const database = client.db('DoctorsPortal');
        const appointmentOptions = database.collection('appointmentOptions');
        const bookingAppointments = database.collection('bookingAppointments');


        // sending all the appointmentOptions
        app.get('/appointmentOptions', async (req, res) => {
            // Getting all the appointmentOptions
            const query = {};
            const cursor = appointmentOptions.find(query);
            const options = await cursor.toArray();

            // collecting already booked appointments regarding each date the appointment was taken on
            const date = req.query.date;
            const bookingQuery = { appointmentDate: date };
            const alreadyBooked = await bookingAppointments.find(bookingQuery).toArray();

            // Sorting the available booking slots based on each treatment options
            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(booked => booked.treatmentName === option.name);
                const bookedSlots = optionBooked.map(booked => booked.selectedSlot);
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots; // set the slots of every treatment option to remainingSlots
            })

            res.send(options);
        })

        // sending booking data to the database after client posts new booking
        app.post('/bookings', async (req, res) => {
            const doc = req.body;

            // restricting user to book more than one appointment on a given day
            const query = {
                appointmentDate: doc.appointmentDate,
                treatmentName: doc.treatmentName,
                patientEmail: doc.patientEmail
            }

            const alreadyBooked = await bookingAppointments.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You already have an appointment on ${doc.appointmentDate}`;
                return res.send({ acknowledged: false, message })
            }
            console.log(alreadyBooked);

            const result = await bookingAppointments.insertOne(doc);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch((err) => console.log(err))


app.listen(port, () => console.log(`Server running on port ${port}`));