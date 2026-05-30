#!/usr/bin/env tsx
import { choiceState, lambdaTaskState } from "../index.js";

const paymentSaga = {
  Comment: "Payment saga with retry and compensation",
  StartAt: "ClassifyPayment",
  States: {
    ClassifyPayment: choiceState([{ variable: "$.paymentMethod", stringEquals: "manual_invoice", next: "ManualReview" }], "CapturePayment"),
    ManualReview: lambdaTaskState({ name: "manualReview", functionArn: "arn:aws:lambda:us-east-1:000000000000:function:manual-review", next: "CapturePayment" }),
    CapturePayment: lambdaTaskState({ name: "capture", functionArn: "arn:aws:lambda:us-east-1:000000000000:function:capture-payment", catchNext: "RefundOrRelease", next: "ShipOrder" }),
    ShipOrder: lambdaTaskState({ name: "shipping", functionArn: "arn:aws:lambda:us-east-1:000000000000:function:ship-order", catchNext: "RefundOrRelease", end: true }),
    RefundOrRelease: lambdaTaskState({ name: "compensate", functionArn: "arn:aws:lambda:us-east-1:000000000000:function:refund-or-release", end: true }),
  },
};

console.log(JSON.stringify(paymentSaga, null, 2));
