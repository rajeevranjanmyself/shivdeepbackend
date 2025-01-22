const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { handleUserSignup, handleUserLogin } = require("../controllers/user");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const TABLE_NAME = 'users';
const { getAllItems, insertItem, updateItem, getMultipleItemsByQuery,getSingleItemById, deleteSingleItemById } = require('../service/dynamo');
router.get('/users', async (req, res) => {
	try {
		const items = await getAllItems(TABLE_NAME);
		res.status(200).json(items);
	} catch (err) {
		console.error(err);
		res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong' });
	}
});

router.post('/login', async (req, res) => {
	const body = req.body;	
	try {
		//body.email = uuidv4();
		//body.password = bcrypt.hashSync(body.password, 8)
		const indexName = "emailIndex"
		const keyConditionExpression = "email = :email"
		const expressionAttributeValues = {
			":email":body.email
		}
		const getData = await getMultipleItemsByQuery(TABLE_NAME, indexName, keyConditionExpression, expressionAttributeValues);
		console.log('getData', getData);
		if(getData.Items.length>0){
			const data = getData.Items[0]
			const passwordIsValid = bcrypt.compareSync(
				body.password,
				data.password
			);
			console.log("passwordIsValid",passwordIsValid);
			
			if (!passwordIsValid) {
				// sendToFormator.data= {};
				// sendToFormator.success=false;
				// sendToFormator.message="Invalid Password";
				// sendToFormator.status=401;
				// res.status(401).send(responseFormat(sendToFormator));
				res.errors({message:'invalid passord'})
			}else{
				// sendToFormator.data= data;
				// sendToFormator.success=true;
				// sendToFormator.message="User loaded successfully";
				// sendToFormator.status=200;
				// res.status(200).send(responseFormat(sendToFormator));
				res.success({data:data})
			}
		}else{
				// sendToFormator.data= {};
				// sendToFormator.success=false;
				// sendToFormator.status=401;
				// sendToFormator.message="User not found";
				// res.status(404).send(responseFormat(sendToFormator));
				res.errors({message:'User not found'})

		}
	} catch (err) {
				// sendToFormator.data= {};
				// sendToFormator.success=false;
				// sendToFormator.status=500;
				// sendToFormator.message="Something went wrong";
				// res.status(500).send(responseFormat(sendToFormator));
				res.errors({message:'Something went wrong'})

	}
});

router.post('/users', async (req, res) => {
	const body = req.body;	
	try {
		body.id = uuidv4();
		body.password = bcrypt.hashSync(body.password, 8)
		const newItem = await insertItem(TABLE_NAME, body);
		console.log('newItem', newItem);
		res.status(200).json(body);
	} catch (err) {
		console.error(err);
		res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong' });
	}
});

router.put('/users/:id', async (req, res) => {
	const id = req.params.id;
	const body = req.body;
	try {
		const item = await updateItem(TABLE_NAME, id, body);
		res.status(200).json(item);
	} catch (err) {
		console.error(err);
		res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong' });
	}
});

router.get('/users/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await getSingleItemById(TABLE_NAME, id);
		res.status(200).json(item);
	} catch (err) {
		console.error(err);
		res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong' });
	}
});

router.delete('/users/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await deleteSingleItemById(TABLE_NAME, id);
		res.status(200).json(item);
	} catch (err) {
		console.error(err);
		res.status(err.statusCode || 500).json({ message: err.message || 'Something went wrong' });
	}
});

module.exports = router;
