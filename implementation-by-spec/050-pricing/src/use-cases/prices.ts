import { GetProductsCommand, PricingClient } from "@aws-sdk/client-pricing";
import { client as defaultClient } from "../client.js";
import { PricingAPIError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new PricingAPIError(e instanceof Error&&e.name?e.name:"UNKNOWN",`Pricing API ${op} failed`,e);};
export async function getProducts(serviceCode:string,filters:Record<string,string>={},pricing:PricingClient=defaultClient){try{return (await pricing.send(new GetProductsCommand({ServiceCode:serviceCode,Filters:Object.entries(filters).map(([Field,Value])=>({Type:"TERM_MATCH",Field,Value}))}))).PriceList??[];}catch(e){fail("getProducts",e);}}
export async function getEc2OnDemand(instanceType:string,location="US East (N. Virginia)",pricing:PricingClient=defaultClient){return getProducts("AmazonEC2",{instanceType,location,operatingSystem:"Linux",tenancy:"Shared",preInstalledSw:"NA",capacitystatus:"Used"},pricing);}
export function parsePriceListItem(item:string|Record<string,unknown>){return typeof item==="string"?JSON.parse(item):item;}
