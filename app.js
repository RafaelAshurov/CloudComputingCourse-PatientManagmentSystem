const express = require('express');
const app = express();
const port = 3000;
const fileUpload = require('express-fileupload');
const PatientController = require('./controllers/PatientController');
const mongoose = require('mongoose');

// Give public access to all the files in the public directory
app.use(express.static('public'));

// Using express.urlencoded middleware
app.use(express.urlencoded({
	extended: true,
}));

// Using express-fileupload middleware
app.use(fileUpload());

// Set the view engine to ejs
app.set('view engine', 'ejs');

/**		Atlas connection    **/
// uri = 'mongodb+srv://raffyashurov:raffy123@cluster0.yxhlqvk.mongodb.net/hitdb?retryWrites=true&w=majority';
uri = "mongodb+srv://patientsadmin:patientsadmin123@cluster0.yxhlqvk.mongodb.net/hitdb?retryWrites=true&w=majority";
mongoose.connect(uri, {
	useNewUrlParser: true, useUnifiedTopology: true,
})
	.then(() => {
		console.log('Connected to MongoDB Atlas');
	})
	.catch((err) => {
		console.error('Error connecting to MongoDB Atlas:', err);
	});

/**		Routes                **/
app.get('/', async (req, res) => {
	res.render('pages/index', {message: ''});
});
app.post('/add-patient', (req, res) => PatientController.addPatient(req, res));
app.get('/show-all-patients', (req, res) => PatientController.showAllPatients(req, res));
app.get('/show', (req, res) => PatientController.showPatient(req, res));

// Start the server
app.listen(port, () => {
	console.log(`http://localhost:${port}`);
});