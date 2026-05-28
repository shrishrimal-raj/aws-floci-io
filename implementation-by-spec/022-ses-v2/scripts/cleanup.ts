#!/usr/bin/env tsx
import { deleteConfigurationSet, deleteContactList } from "../src/use-cases/email-v2.js";
const configSet = process.env.SESV2_CONFIG_SET ?? "floci-sesv2-lab";
const contactList = process.env.SESV2_CONTACT_LIST ?? "floci-contacts";
await deleteConfigurationSet(configSet); await deleteContactList(contactList);
console.log("Cleanup SES v2 resources");
