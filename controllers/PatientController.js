const Patient = require('../models/PatientModel');
const {parseStringPromise} = require('xml2js');

class PatientController {

	/**
	 * Show the details of a patient.
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 */
	async showPatient(req, res) {
		try {
			const patients = await Patient.find({id: req.query.id});
			res.render('pages/patient', {patients: patients});
		} catch (err) {
			console.log(err);
			res.status(500).send({error: err.message});
		}
	}

	/**
	 * Show the details of a patient.
	 * @param {Object} req - The request object.
	 * @param {Object} res - The response object.
	 */
	async showAllPatients(req, res) {
		try {
			const patients = await Patient.find({});
			res.render('pages/patient', {patients: patients});
		} catch (err) {
			console.log(err);
			res.status(500).send({error: err.message});
		}
	}

	/**
	 * Adds a new patient to the patients.json file
	 * @param {object} req - The request object
	 * @param {object} res - The response object
	 */
	async addPatient(req, res) {
		try {
			console.log('request', req.body);
			const isPerson = await this.checkIfImageContainsPerson(req.files.picture);

			if (isPerson) {
				let patientData = req.body;

				// Get the file that was set to our field named "picture"
				let picture = req.files.picture;
				picture.mv('public/images/' + picture.name);
				patientData.picture = picture.name;

				// Get health conditions summary from MedlinePlus
				const summaryData = await this.getHealthConditionsSummary(req.body.medicalCondition);
				if (summaryData.length !== 0) {
					patientData.conditionsSummary = {
						fullSummary: summaryData[0],
						snippet: summaryData[1]
					};
				} else {
					const medicalCondition = req.body.medicalCondition;
					const conditionsString = (Array.isArray(medicalCondition)) ? medicalCondition.join('+') : medicalCondition;
					patientData.conditionsSummary = {
						fullSummary: `MedlinePlus got no summaries for '${conditionsString}'`,
						snippet: `MedlinePlus got no summaries for '${conditionsString}'`,
					};
				}

				// add the new patient to db
				const newPatient = new Patient(patientData);
				await newPatient.save();
				console.log('New patient:', newPatient);

				res.render('pages/index', {
					status: 'success',
					message: `Patient added successfully!<br> <a href="/show?id=${patientData.id}" class="btn btn-outline-success mt-3"> GO TO PATIENT PAGE </a>`,
					patient: {firstName:'', lastName:'', id:'', birthDate:''}
				});
			} else {
				res.render('pages/index', {
					status: 'danger',
					message: 'Its not an image of a person',
					patient: req.body
				});
			}
		} catch (err) {
			console.log(err);
			res.status(500).send({error: err.message});
		}
	}

	async getHealthConditionsSummary(medicalConditions) {
		try {
			const conditionsString = (Array.isArray(medicalConditions)) ? medicalConditions.join('+') : medicalConditions;
			const rawResponse = await fetch(`https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${conditionsString}`, {method: 'GET'});
			const xmlData = await rawResponse.text();
			const response = await parseStringPromise(xmlData);
			const summaryData = this.extractDataFromMedlinePlusResponse(response);
			return summaryData;
		} catch (error) {
			console.log('error', error);
			error.message = 'Got a timeout from MedlinePlus, please try again';
			throw error;
		}
	}

	extractDataFromMedlinePlusResponse(obj) {
		let values = [];
		if (typeof obj === 'object') {
			if (
				('$' in obj) &&
				('rank' in obj['$']) &&
				obj['$'].rank === '0' &&
				('content' in obj)
			) {
				for (const contentObj of obj.content) {
					if (
						typeof contentObj === 'object' &&
						('$' in contentObj) &&
						('name' in contentObj['$']) &&
						(contentObj['$'].name === 'snippet' ||
							contentObj['$'].name === 'FullSummary') &&
						('_' in contentObj)
					) {
						values.push(contentObj['_']);
					}
				}
			} else {
				for (const key in obj) {
					values = values.concat(this.extractDataFromMedlinePlusResponse(obj[key]));
				}
			}
		}
		return values;
	}


	/**
	 * Fetches image tags from Imagga API using base64 of an image
	 * @param {string} imageBase64 - Base64 of the image
	 * @return {array} - Array of tags received from the Imagga API
	 */
	async getImageTags(imageBase64) {
		try {
			const apiKey = process.env.IMAGGA_API_KEY;
			const apiSecret = process.env.IMAGGA_API_SECRET;

			// we use FormData because Imagga API requires form data for base64 images
			const formData = new FormData();
			formData.append('image_base64', imageBase64);

			const requestOptions = {
				method: 'POST',
				headers: {
					Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
				},
				body: formData,
			};

			const response = await (
				await fetch('https://api.imagga.com/v2/tags', requestOptions)
			).json();
			return response.result.tags;
		} catch (error) {
			console.log('error', error);
		}
	}

	/**
	 * Checks if the image contains a person using Imagga API
	 * @param {object} image - The image file
	 * @return {boolean} - Returns true if a person is detected, else false
	 */
	async checkIfImageContainsPerson(image) {
		// Read the image file as base64 code
		const imageBase64 = image.data.toString('base64');
		const imageTags = await this.getImageTags(imageBase64);

		// Create a list of string tags only
		const top10ConfidenceTags = imageTags.slice(0, 10).map((item) => item.tag.en);
		console.log('image tags:', top10ConfidenceTags);
		const isPerson = await top10ConfidenceTags.includes('person');
		return isPerson;
	}
}

module.exports = new PatientController();