import { ACMClient, DeleteCertificateCommand, DescribeCertificateCommand, ListCertificatesCommand, RequestCertificateCommand } from "@aws-sdk/client-acm";
import { client as defaultClient } from "../client.js";
import { ACMError } from "../errors.js";
const fail=(op:string,e:unknown):never=>{throw new ACMError(e instanceof Error&&e.name?e.name:"UNKNOWN",`ACM ${op} failed`,e);};
export async function requestDnsCertificate(domainName:string,subjectAlternativeNames:string[]=[],acm:ACMClient=defaultClient){try{return (await acm.send(new RequestCertificateCommand({DomainName:domainName,SubjectAlternativeNames:subjectAlternativeNames,ValidationMethod:"DNS"}))).CertificateArn!;}catch(e){fail("requestDnsCertificate",e);}}
export async function describeCertificate(certificateArn:string,acm:ACMClient=defaultClient){try{return (await acm.send(new DescribeCertificateCommand({CertificateArn:certificateArn}))).Certificate;}catch(e){fail("describeCertificate",e);}}
export async function listCertificates(acm:ACMClient=defaultClient){try{return (await acm.send(new ListCertificatesCommand({}))).CertificateSummaryList??[];}catch(e){fail("listCertificates",e);}}
export async function deleteCertificate(certificateArn:string|undefined,acm:ACMClient=defaultClient){if(!certificateArn)return; try{await acm.send(new DeleteCertificateCommand({CertificateArn:certificateArn}));}catch(e){if(e instanceof Error&&e.name==="ResourceNotFoundException")return; fail("deleteCertificate",e);}}
export const wildcard=(domain:string)=>`*.${domain.replace(/^\*\./,"")}`;
