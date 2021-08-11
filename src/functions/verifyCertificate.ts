import { APIGatewayProxyHandler } from 'aws-lambda';
import { document } from 'src/utils/dynamodbClient';


export const handle:APIGatewayProxyHandler = async (event)=>{
    
    const { id } = event.pathParameters

    const response = await document.query({
        TableName:"users_certificates",
        KeyConditionExpression:"id = :id",
        ExpressionAttributeValues:{
            ":id":id
        }
    }).promise()

    if(!response.Items[0]){
        return{
            statusCode:400,
            body:JSON.stringify({
                message:"Certificate Invalid !"
            }),
            headers:{
                "Content-Type":"application/json"
            }
        }
    }

    return{
        statusCode:201,
        body:JSON.stringify({
            message:"Certficate Valid !"
        }),
        headers:{
            "Content-Type":"application/json"
        }
    }

}