"use strict";

let blindSignatures = require('blind-signatures');
let SpyAgency = require('./spyAgency.js').SpyAgency;
let rand = require('./rand.js');

function makeDocument(coverName) {
  return `The bearer of this signed document, ${coverName}, has full diplomatic immunity.`;
}

function blind(msg, n, e) {
  return blindSignatures.blind({
    message: msg,
    N: n,
    E: e,
  });
}

function unblind(blindingFactor, sig, n) {
  return blindSignatures.unblind({
    signed: sig,
    N: n,
    r: blindingFactor,
  });
}

let agency = new SpyAgency();

let coverNames = [
  "Agent X", "Agent Y", "Agent Z", "John Doe", "Jane Doe", 
  "Mr. Smith", "Ms. Brown", "Dr. Black", "Prof. White", "Sir Blue"
];

let documents = coverNames.map(makeDocument);
let blindDocs = [];
let blindingFactors = [];

for (let doc of documents) {
  let { blinded, r } = blind(doc, agency.n, agency.e);
  if (!blinded || !r) {
    console.error(`Error: Failed to blind document: ${doc}`);
    process.exit(1);
  }
  blindDocs.push(blinded);
  blindingFactors.push(r);
}

console.log("Documents:", documents);
console.log("Blinding Factors:", blindingFactors);
console.log("Blinded Documents:", blindDocs);

agency.signDocument(blindDocs, (selected, verifyAndSign) => {
  let modifiedFactors = blindingFactors.map((factor, index) => (index === selected ? undefined : factor));
  let modifiedDocuments = documents.map((doc, index) => (index === selected ? undefined : doc));

  console.log("Modified Blinding Factors:", modifiedFactors);
  console.log("Modified Documents:", modifiedDocuments);

  try {
    let blindedSignature = verifyAndSign(modifiedFactors, modifiedDocuments);
    let unblindedSignature = unblind(blindingFactors[selected], blindedSignature, agency.n);

    let isValid = blindSignatures.verify({
      message: documents[selected],
      N: agency.n,
      E: agency.e,
      signature: unblindedSignature,
    });

    console.log("Selected Document:", documents[selected]);
    console.log("Signature Valid:", isValid);
  } catch (error) {
    console.error("Error during signing process:", error.message);
  }
});
