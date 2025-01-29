const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { handleUserSignup, handleUserLogin } = require("../controllers/user");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
require('dotenv').config();
const {verifyToken} = require('../middlewares/verifyToken')

const TABLE_NAME = 'users';

const upload = multer({ storage: multer.memoryStorage() });
const { getAllItems, batchInsertLargeDataset, generateRandomString, getLastValue,generateAuthToken,uploadFileToS3, deleteFileFromS3, insertItem, updateItem,filterItemsByQuery, getMultipleItemsByQuery,getSingleItemById, deleteSingleItemById, sendSMSMessage } = require('../service/dynamo');
router.get('/users', verifyToken, async (req, res) => {
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
		if(!body.mobile){
			res.errors({message:'Mobile Number Required'})
		}else {
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
				const KeyConditionExpression = "id = :id"; 
				const ExpressionAttributeValues = {
					":id":id,
					":mobile": body.mobile,
					":isVerifycation": true
				}
				const FilterExpression = "mobile = :mobile AND isVerifycation = :isVerifycation" 
				const filterData = await filterItemsByQuery(TABLE_NAME, KeyConditionExpression, ExpressionAttributeValues, FilterExpression);
				console.log('filterData', filterData);
				const filterItem = filterData.Items
				if(filterItem.length>0){
					const data = filterItem[0]
					const userPayload = {
						id: data.id,          // User ID
						username: data.userName, // Example username
						email: data.email, // Example email
						mobile: data.mobile, // Example mobile
						role: data.role        // Example user role
					};				  
					const token = await generateAuthToken(userPayload);
					console.log('Generated JWT:', token);
					data.token = token
					res.success({data:data})
				}else{
					res.errors({message:'User is not verified'})
				}
			}else{
				res.errors({message:'User not found'})
			}
		}
	} catch (err) {
			res.errors({message:'Something went wrong',data:err})

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
				const KeyConditionExpression = "id = :id"; 
				const ExpressionAttributeValues = {
					":id":id,
					":mobile": body.mobile,
					":otp": body.otp
				}
				const FilterExpression = "otp = :otp AND mobile = :mobile" 
				const filterData = await filterItemsByQuery(TABLE_NAME, KeyConditionExpression, ExpressionAttributeValues, FilterExpression);
				console.log('filterData', filterData);
				const filterItem = filterData.Items
				if(filterItem.length>0){
					const id = filterItem[0].id
					const data = filterItem[0]
					const itemObject = {
						isVerifycation:true,
						updatedDate:new Date().toISOString()
					}
					const userPayload = {
						id: data.id,          // User ID
						username: data.userName, // Example username
						mobile: data.mobile, // Example mobile
						role: data.role        // Example user role
					};				  
					const token = await generateAuthToken(userPayload);
					console.log('Generated JWT:', token);
					data.token = token
					const updatedUser = await updateItem(TABLE_NAME, id, itemObject)
					res.success({data:data})
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

router.post('/users', verifyToken, upload.single("file"), async (req, res) => {
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
					let image = ""
					if(req.file){
						const bucketName = process.env.AWS_S3_BUCKET_NAME;
						const fileContent = req.file.buffer; // File content from Multer
						const key = `${Date.now()}_${req.file.originalname}`; // Unique filename
						const contentType = req.file.mimetype;
						// Upload to S3
						const result = await uploadFileToS3(fileContent, bucketName, key, contentType);
						console.log('result--->',result);
						image= result.Location
						//res.status(200).send({ message: "File uploaded successfully", url: result.Location });
					}
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
						district:body.district || "",
						state:body.state || "",
						otp:otp,
						image:image,
						isVerifycation:false,
						referralCode:await generateRandomString(8),
						createDate:new Date().toISOString(),
						updatedDate:new Date().toISOString()
					}
					console.log('item',item);
					
					const newItem = await insertItem(TABLE_NAME, item);
					console.log('newItem', newItem);
					res.success({data:item, message:"otp send successfuly"})
				}
			}
		}
	} catch (err) {
		res.errors({message:'Something went wrong',data:err})
	}
});

router.put('/users/:id',verifyToken, upload.single("file"),  async (req, res) => {
	const id = req.params.id;
	const body = req.body;
	try {
		const findUser = await getSingleItemById(TABLE_NAME, id)
		console.log('findUser',findUser);
		if(findUser.Item){
			const data = findUser.Item
			let image = data.image
			if(req.file){			
				const bucketName = process.env.AWS_S3_BUCKET_NAME;
				if(image){
					const key = await getLastValue(image);
					await deleteFileFromS3(bucketName, key);
				}
				const fileContent = req.file.buffer; // File content from Multer
				const newKey = `${Date.now()}_${req.file.originalname}`; // Unique filename
				const contentType = req.file.mimetype;
				// Upload to S3
				const result = await uploadFileToS3(fileContent, bucketName, newKey, contentType);
				console.log(result);
				image= result.Location				
			}
			//https://riteshkumarfilebucket.s3.eu-north-1.amazonaws.com/1737880358979_smsrequest.png

			//const item = await updateItem(TABLE_NAME, id, body);
			const itemObject = {
				fullName:body.fullName || data.fullName,
				role:body.role || data.role,
				email:body.email || data.email,
				mobile:body.mobile || data.mobile,
				gender:body.gender || data.gender,
				dob:body.dob || data.dob,
				district:body.district || data.gender,
				state:body.state || data.state,
				image:image,
				updatedDate:new Date().toISOString()
			}
			const updatedUser = await updateItem(TABLE_NAME, data.id, itemObject)
			res.success({data:updatedUser})
		}else{
		res.errors({message:'User not found',data:{}})
		}


	} catch (err) {
		console.error(err);
		res.errors({message:'Something went wrong',data:err})
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

router.post('/sdsdsdswevb12',async(req,res)=>{
	try{
		const district = [
			{ "id": 1, "district": "Araria" },
			{ "id": 2, "district": "Arwal" },
			{ "id": 3, "district": "Aurangabad" },
			{ "id": 4, "district": "Banka" },
			{ "id": 5, "district": "Begusarai" },
			{ "id": 6, "district": "Bhagalpur" },
			{ "id": 7, "district": "Bhojpur" },
			{ "id": 8, "district": "Buxar" },
			{ "id": 9, "district": "Darbhanga" },
			{ "id": 10, "district": "East Champaran" },
			{ "id": 11, "district": "Gaya" },
			{ "id": 12, "district": "Gopalganj" },
			{ "id": 13, "district": "Jamui" },
			{ "id": 14, "district": "Jehanabad" },
			{ "id": 15, "district": "Kaimur" },
			{ "id": 16, "district": "Katihar" },
			{ "id": 17, "district": "Khagaria" },
			{ "id": 18, "district": "Kishanganj" },
			{ "id": 19, "district": "Lakhisarai" },
			{ "id": 20, "district": "Madhepura" },
			{ "id": 21, "district": "Madhubani" },
			{ "id": 22, "district": "Munger" },
			{ "id": 23, "district": "Muzaffarpur" },
			{ "id": 24, "district": "Nalanda" },
			{ "id": 25, "district": "Nawada" },
			{ "id": 26, "district": "Patna" },
			{ "id": 27, "district": "Purnia" },
			{ "id": 28, "district": "Rohtas" },
			{ "id": 29, "district": "Saharsa" },
			{ "id": 30, "district": "Samastipur" },
			{ "id": 31, "district": "Saran" },
			{ "id": 32, "district": "Sheikhpura" },
			{ "id": 33, "district": "Sheohar" },
			{ "id": 34, "district": "Sitamarhi" },
			{ "id": 35, "district": "Siwan" },
			{ "id": 36, "district": "Supaul" },
			{ "id": 37, "district": "Vaishali" },
			{ "id": 38, "district": "West Champaran" }
		  ]
		  
		const districtbatch = await batchInsertLargeDataset(district)
		res.success({data:districtbatch, message:"inserted successfuly"})

	}catch (err) {
		res.errors({message:'Something went wrong',data:err})
	}
})
router.post('/cities', async (req, res) => {
	const body = req.body;	
	try {
		if(!body.name){
			res.errors({message:'city name Required'})
		}else if(!body.districtId){
			res.errors({message:'districtId Required'})
		}else{
				const cities = await getAllItems('cities');
				
				body.id = cities.Items.length+1;

				const isunique =cities.Items.find(city=>city.name.toLowerCase() === body.name.toLowerCase())
				console.log('isunique',isunique,cities.Items);
				if(isunique){
					res.errors({message:'duplicate record',data:{}})
				}else{
				const item = {
					id:body.id,
					name:body.name,
					districtId:body.districtId,
					createDate:new Date().toISOString(),
					updatedDate:new Date().toISOString()
				}
				const newItem = await insertItem('cities', item);
				console.log('newItem', newItem);
				res.success({data:item, message:"city added successfuly"})
			}
		}
	} catch (err) {
		res.errors({message:'Something went wrong',data:err})
	}
});
router.get('/cities', async (req, res) => {
	try {
		const items = await getAllItems('cities');
		res.success({data:items.Items})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});
router.get('/districts', async (req, res) => {
	try {
		const items = await getAllItems('districts');
		res.success({data:items.Items})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});
module.exports = router;
