const AWS = require('aws-sdk');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
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
	sendSMSMessage
};