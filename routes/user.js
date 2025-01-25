const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { handleUserSignup, handleUserLogin } = require("../controllers/user");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const TABLE_NAME = 'users';
const { getAllItems, insertItem, updateItem,filterItemsByQuery, getMultipleItemsByQuery,getSingleItemById, deleteSingleItemById, sendSMSMessage } = require('../service/dynamo');
router.get('/users', async (req, res) => {
	try {
		const items = await getAllItems(TABLE_NAME);
		res.success({data:items.Items})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

router.post('/login', async (req, res) => {
	const body = req.body;	
	try {
		const indexName = "mobileIndex"
		const keyConditionExpression = "mobile = :mobile"
		const expressionAttributeValues = {
			":mobile":body.mobile,
			":otp":body.otp
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
				res.errors({message:'invalid passord'})
			}else{
				res.success({data:data})
			}
		}else{
			res.errors({message:'User not found'})

		}
	} catch (err) {
			res.errors({message:'Something went wrong'})

	}
});

router.post('/otpVerifycation', async (req, res) => {
	const body = req.body;	
	try {
		if(!body.mobile){
			res.errors({message:'Mobile Number Required'})
		}else if(!body.otp){
			res.errors({message:'otp Required'})
		}else{
			const indexName = "mobileIndex"
			const keyConditionExpression = "mobile = :mobile"
			const expressionAttributeValues = {
				":mobile":body.mobile
			}
			const getData = await getMultipleItemsByQuery(TABLE_NAME, indexName, keyConditionExpression, expressionAttributeValues);
			console.log('getData', getData);

			if(getData.Items.length>0){
				const data = getData.Items[0]
				const id = data.id
				const userName = data.userName
				const KeyConditionExpression = "id = :id  AND userName = :userName"; 
				const ExpressionAttributeValues = {
					":id":id,
					":userName":userName,
					":mobile": data.mobile,
					":otp": data.otp
				}
				const FilterExpression = "otp = :otp AND mobile = :mobile" 
				const filterData = await filterItemsByQuery(TABLE_NAME, KeyConditionExpression, ExpressionAttributeValues, FilterExpression);
				console.log('filterData', filterData);
				const filterItem = filterData.Items
				if(filterItem.length>0){
					res.success({data:filterItem[0]})
				}else{
					res.errors({message:'User not found'})
				}
			}else{
				res.errors({message:'User not found'})
			}
		}
	} catch (err) {
			res.errors({message:'Something went wrong', data:err})

	}
});

router.post('/users', async (req, res) => {
	const body = req.body;	
	try {
		if(!body.fullName){
			res.errors({message:'Full Name Required'})
		}else if(!body.mobile){
			res.errors({message:'Mobile Number Required'})
		}else if(!body.dob){
			res.errors({message:'Date of Birth Required'})
		}else if(!body.gender){
			res.errors({message:'Gender Required'})
		}else{
			if(body.mobile){
				const indexName = "mobileIndex"
				const keyConditionExpression = "mobile = :mobile"
				const expressionAttributeValues = {
					":mobile":body.mobile
				}
				const getData = await getMultipleItemsByQuery(TABLE_NAME, indexName, keyConditionExpression, expressionAttributeValues);
				console.log('getData', getData);
				if(getData.Items.length>0){
					res.errors({message:'User already registered'})
				}else{
					body.id = uuidv4();
					const otp  = Math.random().toString().substring(2, 6)
					// const params = {
					// 	Message: `Your OTP code is: ${otp}`, // Generate a 6-digit OTP code
					// 	PhoneNumber: '+91'+body.mobile, // Recipient's phone number from environment variables
					// 	MessageAttributes: {
					// 		'AWS.SNS.SMS.SenderID': {
					// 			'DataType': 'String',
					// 			'StringValue': 'String'
					// 		}
					// 	}
					// };
					// Send the SMS message using the defined SNS client and parameters
					//await sendSMSMessage(params);AA;
					const item = {
						id:body.id,
						fullName:body.fullName,
						userName:body.fullName.toLowerCase().replaceAll(/\s/g,''),
						role:body.role || 'user',
						email:body.email,
						mobile:body.mobile,
						gender:body.gender,
						dob:body.dob,
						otp:otp,
					}
					console.log('item',item);
					
					const newItem = await insertItem(TABLE_NAME, item);
					console.log('newItem', newItem);
					res.success({data:item, message:"otp send successfuly"})
				}
			}
		}
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

router.put('/users/:id', async (req, res) => {
	const id = req.params.id;
	const body = req.body;
	try {
		const item = await updateItem(TABLE_NAME, id, body);
		res.success({data:item})

	} catch (err) {
		console.error(err);
		res.errors({message:'Something went wrong'})
	}
});

router.get('/users/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await getSingleItemById(TABLE_NAME, id);
		res.success({data:item})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

router.delete('/users/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await deleteSingleItemById(TABLE_NAME, id);
		res.success({data:item})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

module.exports = router;
