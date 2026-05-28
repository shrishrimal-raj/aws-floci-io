import { AnalyzeDocumentCommand, DetectDocumentTextCommand, TextractClient } from "@aws-sdk/client-textract";
import { client as defaultClient } from "../client.js";
import { TextractError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new TextractError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Textract ${op} failed`,e);};
export async function detectTextBytes(bytes:Uint8Array,textract:TextractClient=defaultClient){try{return (await textract.send(new DetectDocumentTextCommand({Document:{Bytes:bytes}}))).Blocks??[];}catch(e){fail("detectTextBytes",e);}}
export async function analyzeFormsAndTables(bytes:Uint8Array,textract:TextractClient=defaultClient){try{return (await textract.send(new AnalyzeDocumentCommand({Document:{Bytes:bytes},FeatureTypes:["FORMS","TABLES"]}))).Blocks??[];}catch(e){fail("analyzeFormsAndTables",e);}}
export function extractLines(blocks:{BlockType?:string;Text?:string}[]){return blocks.filter(b=>b.BlockType==="LINE"&&b.Text).map(b=>b.Text!);}
export function s3Document(bucket:string,name:string){return {S3Object:{Bucket:bucket,Name:name}};}
