var Lang = require('lang-js'),
    Token = Lang.Token,
    clone = require('clone'),
    global = require('./global'),
    combinedTokensResult = require('./combinedTokensResult'),
    Term = require('./term'),
    tokenConverters = require('./tokens'),
    Token = Lang.Token,
    Scope = Lang.Scope;

function SeeThreepio(termDefinitions){
    this._terms = this.convertTerms(termDefinitions);
    this.lang = new Lang();
    this.tokenConverters = tokenConverters.slice();
    this.global = clone(global);
};
SeeThreepio.prototype.evaluateTerm = function(term, scope, args, finalResult){
    for(var i = 0; i < term.parameters.length; i++){
        var paremeter = term.parameters[i];

        scope.set(paremeter, args[i]);
    }

    var tokens = this.lang.evaluate(term.expression, scope, tokenConverters, true);

    return '' + combinedTokensResult(tokens, finalResult);
};
SeeThreepio.prototype.evaluateExpression = function(terms, termName, args){
    var scope = new Scope();

    scope.add(this.global).add(terms);
    scope.seeThreepio = this;

    var term = scope.get(termName);

    if(!term){
        return new Error("term not defined: " + termName);
    }

    return this.evaluateTerm(term, scope, args, true);
};
SeeThreepio.prototype.tokenise = function(expression){
    return this.lang.tokenise(expression, this.tokenConverters);
};
SeeThreepio.prototype.get = function(termName, args){
    return this.evaluateExpression(this._terms, termName, args);
};
SeeThreepio.prototype.addTerms = function(termDefinitions){
    this.convertTerms(termDefinitions, this._terms);
};
SeeThreepio.prototype.replaceTerms = function(termDefinitions){
    this._terms = this.convertTerms(termDefinitions);
};
SeeThreepio.prototype.convertTerms = function(termDefinitions, terms){
    terms || (terms = {});
    for(var key in termDefinitions){
        var term = new Term(key, termDefinitions[key]);
        terms[term.term] = term;
    }
    return terms;
};

module.exports = SeeThreepio;