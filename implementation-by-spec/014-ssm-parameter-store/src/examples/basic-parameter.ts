#!/usr/bin/env tsx
import { deleteParameter, getJsonParameter, putJsonParameter } from "../use-cases/parameters.js";
const name = `/floci/example/${Date.now()}`;
await putJsonParameter(name,{ok:true});
console.log(await getJsonParameter(name));
await deleteParameter(name);
