#!/usr/bin/env tsx
import { email } from "./setup.js";
import { sendTextEmail } from "../src/use-cases/email.js";
await sendTextEmail(email,[email],"Floci SES seed","hello");
console.log(`Seed SES email from ${email}`);
