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
const { getAllItems, generateRandomString,hashPassword,
	comparePassword, getLastValue,generateAuthToken,uploadFileToS3, deleteFileFromS3, insertItem, updateItem,filterItemsByQuery, getMultipleItemsByQuery,getSingleItemById, deleteSingleItemById, sendSMSMessage } = require('../service/dynamo');
router.get('/list', verifyToken, async (req, res) => {
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
		if(!body.email){
			res.errors({message:'Email Required'})
		}else if(!body.password){
			res.errors({message:'Password Required'})
		}else {
			const indexName = "emailIndex"
			const keyConditionExpression = "email = :email"
			const expressionAttributeValues = {
				":email":body.email
			}
			const getData = await getMultipleItemsByQuery(TABLE_NAME, indexName, keyConditionExpression, expressionAttributeValues);
			console.log('getData', getData);

			if(getData.Items.length>0){
				const data = getData.Items[0]
				const isValid = await comparePassword(body.password, data.password);
				if(isValid){
					const userPayload = {
						id: data.id,          // User ID
						email: data.email, // Example email
					};				  
					const token = await generateAuthToken(userPayload);
					console.log('Generated JWT:', token);
					data.token = token
					res.success({data:data})
				}else{
					res.errors({message:'invalid credential'})
				}
			}else{
				res.errors({message:'User not found'})
			}
		}
	} catch (err) {
			res.errors({message:'Something went wrong',data:err})

	}
});


router.post('/add', upload.single("file"), async (req, res) => {
	const body = req.body;	
	try {
		if(!body.fullName){
			res.errors({message:'Full Name Required'})
		}else if(!body.email){
			res.errors({message:'Email Required'})
		}else if(!body.mobile){
			res.errors({message:'Mobile Number Required'})
		}else if(!body.dob){
			res.errors({message:'Date of Birth Required'})
		}else if(!body.gender){
			res.errors({message:'Gender Required'})
		}else if(!body.password){
			res.errors({message:'Password Required'})
		}else{
			if(body.email){
				const indexName = "emailIndex"
				const keyConditionExpression = "email = :email"
				const expressionAttributeValues = {
					":email":body.email
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
					const hashedPassword = await hashPassword(body.password);
					console.log('Stored Hashed Password:', hashedPassword);
					const item = {
						id:body.id,
						fullName:body.fullName,
						email:body.email,
						password:hashedPassword,
						userName:body.fullName.toLowerCase().replaceAll(/\s/g,''),
						role:body.role || 'admin',
						email:body.email,
						mobile:body.mobile,
						gender:body.gender,
						dob:body.dob,
						district:body.district || "",
						state:body.state || "",
						image:image,
						isVerifycation:true,
						createDate:new Date().toISOString(),
						updatedDate:new Date().toISOString()
					}
					console.log('item',item);
					
					const newItem = await insertItem(TABLE_NAME, item);
					console.log('newItem', newItem);
					res.success({data:item, message:"admin user registered successfuly"})
				}
			}
		}
	} catch (err) {
		res.errors({message:'Something went wrong',data:err})
	}
});

router.put('/update/:id',verifyToken, upload.single("file"),  async (req, res) => {
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

router.get('/get/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await getSingleItemById(TABLE_NAME, id);
		res.success({data:item})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

router.delete('/delete/:id', async (req, res) => {
	const id = req.params.id;
	try {
		const item = await deleteSingleItemById(TABLE_NAME, id);
		res.success({data:item})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

module.exports = router;
