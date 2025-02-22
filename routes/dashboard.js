const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
require('dotenv').config();
const {verifyToken} = require('../middlewares/verifyToken')

const TABLE_NAME = 'gallery';

const upload = multer({ storage: multer.memoryStorage() });
const { getAllItems, generateRandomString, countRecords,getLastValue,generateAuthToken,uploadFileToS3, deleteFileFromS3, insertItem, updateItem,filterItemsByQuery, getMultipleItemsByQuery,getSingleItemById, deleteSingleItemById, sendSMSMessage } = require('../service/dynamo');
router.get('/', async (req, res) => {
	try {
		const itemsBanner = await getAllItems('banner');
		const itemsEvents = await getAllItems('events');
		const totalUser = await countRecords('users');
		const totalNews = await countRecords('news');
		res.success({data:{
			banner:itemsBanner.Items,
			events:itemsEvents.Items,
			user:totalUser,
			news:totalNews,
		}})
	} catch (err) {
		res.errors({message:'Something went wrong'})
	}
});

module.exports = router
