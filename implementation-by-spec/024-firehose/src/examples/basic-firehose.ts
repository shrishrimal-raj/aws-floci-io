#!/usr/bin/env tsx
import { createS3DeliveryStream, deleteDeliveryStream, putJsonRecord } from "../use-cases/delivery-streams.js";
const name = `floci-firehose-${Date.now()}`;
await createS3DeliveryStream(name); await putJsonRecord(name,{ok:true}); await deleteDeliveryStream(name);
