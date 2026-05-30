#!/usr/bin/env tsx
import {
  checkoutSagaExample,
  clickstreamAnalyticsExample,
  eventRuleCatalog,
  marketplaceOrderLifecycleExample,
  regulatedEventsGovernanceExample,
  sampleClickEvents,
} from "../../../src/index.js";

console.log("Enterprise commerce event system");
console.log(JSON.stringify(marketplaceOrderLifecycleExample(), null, 2));
console.log(JSON.stringify(checkoutSagaExample(), null, 2));
console.log(JSON.stringify(clickstreamAnalyticsExample(sampleClickEvents()), null, 2));
console.log(JSON.stringify(regulatedEventsGovernanceExample(), null, 2));
console.log(JSON.stringify(eventRuleCatalog(["CheckoutStarted", "PaymentAuthorized", "OrderPlaced", "OrderFailed"]), null, 2));
