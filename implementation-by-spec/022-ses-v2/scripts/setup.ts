#!/usr/bin/env tsx
import { createConfigurationSet, createContactList } from "../src/use-cases/email-v2.js";
export const configSet = process.env.SESV2_CONFIG_SET ?? "floci-sesv2-lab";
export const contactList = process.env.SESV2_CONTACT_LIST ?? "floci-contacts";
await createConfigurationSet(configSet); await createContactList(contactList);
console.log(`Setup SES v2 ${configSet}/${contactList}`);
