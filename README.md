# See-Threepio-js

A JS implementation of See-Threepio

## Example

[see-threepio demo](http://see-threepio.github.io/see-threepio-js)

## Format

[see-threepio project](https://github.com/see-threepio/see-threepio)

## Usage

install

    npm install see-threepio

Require

    var SeeThreepio = require('see-threepio');

Initialise:

    var seeThreepio = new SeeThreepio([terms]);

Get strings:

    seeThreepio.get(term[, array of arguments]);

Add terms: Adds terms to the previous set of terms

    seeThreepio.addTerms(terms);

Replace terms: Replaces all terms with the new set

    seeThreepio.addTerms(terms);

# Contributing

After any patches, run ```npm run build``` to make sure the example and standalone versions are up to date.
