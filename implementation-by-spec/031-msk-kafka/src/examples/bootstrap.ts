#!/usr/bin/env tsx
import { kafkaBootstrapUrl } from "../use-cases/clusters.js";
console.log(kafkaBootstrapUrl(["b1:9092","b2:9092"]));
