#!/usr/bin/env tsx
import { parsePriceListItem } from "../src/use-cases/prices.js";
console.log(parsePriceListItem('{"sku":"sample"}'));
