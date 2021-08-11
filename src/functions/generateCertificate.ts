import chromium  from 'chrome-aws-lambda';
import dayjs from "dayjs"
import fs from "fs"
import Handlebars from "handlebars"
import path from "path"
import { document } from "src/utils/dynamodbClient"
import { S3 } from 'aws-sdk'

interface ICreateCertificate{
    id:string
    name:string
    grade:string
}

interface ITemplate{
    id:string
    name:string
    grade:string
    date:string
    medal:string
}

const compile = async(data:ITemplate)=>{

    const filePath = path.join(process.cwd(),"src","templates","certificate.hbs")
    const html = fs.readFileSync(filePath,"utf-8")

    return Handlebars.compile(html)(data)
}

export const handle = async (event)=>{
    
    const { id,name,grade } = JSON.parse(event.body) as ICreateCertificate

    const userAlreadyExists = await document.query({
        TableName:"users_certificates",
        KeyConditionExpression:"id = :id",
        ExpressionAttributeValues:{
            ":id":id
        }
    }).promise()

    if(!userAlreadyExists.Items[0]){
        await  document.put({
            TableName:"users_certificates",
            Item:{
                id,
                name,
                grade
            }
        }).promise()
    }else{
        return{
            statusCode:200,
            body:JSON.stringify({
                message:"User Already Exists"
            }),
            headers:{
                "Content-Type":"application/json"
            }
        }
    }


    const medalPath = path.join(process.cwd(),"src","templates","selo.png")
    const medal = fs.readFileSync(medalPath,"base64")

    const data:ITemplate ={
        id,
        name,
        grade,
        date:dayjs().format("DD/MM/YYYY"),
        medal
    }

    const content = await compile(data)

    const browser = await chromium.puppeteer.launch({
        headless:true,
        args:chromium.args,
        defaultViewport:chromium.defaultViewport,
        executablePath: await chromium.executablePath
    })

    const page = await browser.newPage()
    await page.setContent(content)

    const pdf = await page.pdf({
        format:"a4",
        landscape:true,
        path:process.env.IS_OFFLINE ? "certificate.pdf" :null,
        printBackground:true,
        preferCSSPageSize:true
    })

    await browser.close()

    const s3 = new S3()

    await s3.putObject({
        Bucket:"surgicalmapp",
        Key:`${id}.pdf`,
        ACL:'public-read',
        Body:pdf,
        ContentType:"application/pdf"
    }).promise()

    return{
        statusCode:201,
        body:JSON.stringify({
            message:"Certficate Created"
        }),
        headers:{
            "Content-Type":"application/json"
        }
    }

}