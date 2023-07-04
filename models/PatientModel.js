const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
	id: String,
	lastName: String,
	firstName: String,
	birthDate: Date,
	medicalCondition: [String],
	picture: String,
	conditionsSummary : {
		fullSummary : String,
		snippet : String
	}
}, {
	collection: 'patients',
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;