const AWS = require('aws-sdk');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const fs = require("fs"); // For file handling (if needed for local files)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

require('dotenv').config();
AWS.config.update({
	region: process.env.AWS_DEFAULT_REGION,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Create an SNS client with the specified configuration
const sns = new SNSClient({
	region: process.env.AWS_DEFAULT_REGION, // AWS region from environment variables
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS access key from environment variables
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY // AWS secret key from environment variables
	}
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_DEFAULT_REGION,
});


// Secret key for signing the token (keep it safe and private)
const SECRET_KEY = process.env.SECRET_KEY;

// Function to hash a password (for signup)
const hashPassword = async(password)=> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Function to compare password (for login)
const comparePassword = async(plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Function to generate a JWT
const generateAuthToken =async(payload, expiresIn = '24h') =>{
  try {
    // Create the token
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn });
	console.log('token',token);
	
    return token;
  } catch (error) {
    console.error('Error generating JWT:', error);
    throw error;
  }
}

const generateRandomString= async(length)=> {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
	  const randomIndex = Math.floor(Math.random() * characters.length);
	  result += characters[randomIndex];
	}
	return result;
  }
  const getLastValue = async(inputString)=> {
	const parts = inputString.split('/');
	return parts[parts.length - 1];
  }
const uploadFileToS3 = async (fileContent, bucketName, key, contentType) => {
	try {
	  const params = {
		Bucket: bucketName,
		Key: key,
		Body: fileContent,
		ContentType: contentType // e.g., 'image/jpeg'
	  };
  
	  const result = await s3.upload(params).promise();
	  console.log("File uploaded successfully:", result.Location);
	  return result;
	} catch (err) {
	  console.error("Error uploading file to S3:", err.message);
	  throw err;
	}
  };

  const deleteFileFromS3 = async (bucketName, key) => {
	try {
	  const params = {
		Bucket: bucketName,
		Key: key,
	  };
	
	  await s3.headObject(params).promise();  
	  const result = await s3.deleteObject(params).promise();
	  console.log(`File deleted successfully: ${JSON.stringify(result)}`);
	  return result;
	} catch (err) {
	  console.error(`Error deleting file from S3: ${err}`);
	  throw err;
	}
  };
// Asynchronous function to send an SMS message using AWS SNS
const sendSMSMessage = async(params) =>{
    // Create a new PublishCommand with the specified parameters
    const command = new PublishCommand(params);
    
    // Send the SMS message using the SNS client and the created command
    const message = await sns.send(command);
    
    // Return the result of the message sending operation
    return message;
}

const DocumentClient = new AWS.DynamoDB.DocumentClient();

const getAllItems = async (TABLE_NAME) => {
	const params = {
		TableName: TABLE_NAME,
	};
	return await DocumentClient.scan(params).promise();
};

const filterItemsByQuery = async (TABLE_NAME, KeyConditionExpression, ExpressionAttributeValues, FilterExpression) => {
	var params = {
		TableName: TABLE_NAME,
		KeyConditionExpression: KeyConditionExpression, 
		ExpressionAttributeValues: ExpressionAttributeValues,
		FilterExpression: FilterExpression 
	};
	return await DocumentClient.query(params).promise();
};

const getMultipleItemsByQuery = async (TABLE_NAME, indexName, keyConditionExpression, expressionAttributeValues) => {
	const params = {
		TableName: TABLE_NAME,
		IndexName:indexName,
		KeyConditionExpression:keyConditionExpression,
		ExpressionAttributeValues:expressionAttributeValues
	};
	return await DocumentClient.query(params).promise();
};

const getSingleItemById = async (TABLE_NAME, id) => {
	const params = {
		TableName: TABLE_NAME,
		Key: {
			id,
		},
	};
	return await DocumentClient.get(params).promise();
};

const insertItem = async (TABLE_NAME, itemObject) => {
	const params = {
		TableName: TABLE_NAME,
		Item: itemObject,
	};
	return await DocumentClient.put(params).promise();
};

const generateUpdateQuery = (fields) => {
	let exp = {
		UpdateExpression: 'set',
		ExpressionAttributeNames: {},
		ExpressionAttributeValues: {},
	};
	Object.entries(fields).forEach(([key, item]) => {
		exp.UpdateExpression += ` #${key} = :${key},`;
		exp.ExpressionAttributeNames[`#${key}`] = key;
		exp.ExpressionAttributeValues[`:${key}`] = item;
	});
	exp.UpdateExpression = exp.UpdateExpression.slice(0, -1);
	return exp;
};

const updateItem = async (TABLE_NAME, id, itemObject) => {
	const expression = generateUpdateQuery(itemObject);
	const params = {
		TableName: TABLE_NAME,
		Key: {
			id,
		},
		ConditionExpression: 'attribute_exists(id)',
		...expression,
		ReturnValues: 'UPDATED_NEW',
	};
	return await DocumentClient.update(params).promise();
};

const deleteSingleItemById = async (TABLE_NAME, id) => {
	const params = {
		TableName: TABLE_NAME,
		Key: {
			id,
		},
	};
	return await DocumentClient.delete(params).promise();
};
const batchInsertLargeDataset=async(districts) =>{
	const tableName = "districts";
	const chunkSize = 25;
  
	for (let i = 0; i < districts.length; i += chunkSize) {
	  const batch = districts.slice(i, i + chunkSize);
  
	  const params = {
		RequestItems: {
		  [tableName]: batch.map(item => ({
			PutRequest: { Item: item }
		  }))
		}
	  };
  
	  try {
		await DocumentClient.batchWrite(params).promise();
		console.log(`Inserted batch ${i / chunkSize + 1}`);
	  } catch (error) {
		console.error("Error inserting batch:", error);
	  }
	}
  }
  
module.exports = {
	DocumentClient,
	getAllItems,
	filterItemsByQuery,
	getMultipleItemsByQuery,
	getSingleItemById,
	insertItem,
	updateItem,
	deleteSingleItemById,
	sns,
	sendSMSMessage,
	uploadFileToS3,
	deleteFileFromS3,
	generateRandomString,
	getLastValue,
	generateAuthToken,
	hashPassword,
	comparePassword,
	batchInsertLargeDataset
};