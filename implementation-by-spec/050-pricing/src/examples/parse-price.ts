#!/usr/bin/env tsx
import { parsePriceListItem } from "../use-cases/prices.js";
console.log(parsePriceListItem('{"sku":"abc"}'));
