#!/usr/bin/env tsx
import { sendTextEmail, verifyEmail } from "../use-cases/email.js";
const email = "sender@example.com";
await verifyEmail(email);
console.log(await sendTextEmail(email,[email],"Hello","from Floci SES"));
