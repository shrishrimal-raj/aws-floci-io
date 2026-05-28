#!/usr/bin/env tsx
import { CAPSTONE_PROJECTS, productionReadinessScore, recommendCapstones, serviceCoverage } from "../../../src/index.js";

const finalProject = CAPSTONE_PROJECTS.find((project) => project.id === "010");

console.log("Final Enterprise Backend capstone demo");
console.log(JSON.stringify({
  projectCount: CAPSTONE_PROJECTS.length,
  serviceCoverage: serviceCoverage(),
  eventTrack: recommendCapstones("events").map((project) => project.name),
  finalReadinessScore: finalProject ? productionReadinessScore(finalProject) : 0,
}, null, 2));
