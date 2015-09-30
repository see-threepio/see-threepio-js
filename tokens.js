var Token = require('lang-js/token'),
    Lang = require('lang-js'),
    createNestingParser = Lang.createNestingParser,
    createSpec = require('spec-js'),
    combinedTokensResult = require('./combinedTokensResult'),
    runTerm = require('./runTerm'),
    Term = require('./term'),
    Scope = Lang.Scope;

function evaluateTokens(tokens, scope){
    if(!tokens){
        return;
    }
    tokens.forEach(function(token){
        token.evaluate(scope);
    })
}

function createOpperatorTokeniser(Constructor, opperator) {
    return function(substring){
        if(substring.indexOf(opperator) === 0){
            return new Constructor(opperator, opperator.length);
        }
    };
}

function PipeToken(){}
PipeToken = createSpec(PipeToken, Token);
PipeToken.prototype.name = 'PipeToken';
PipeToken.tokenPrecedence = 1;
PipeToken.prototype.parsePrecedence = 5;
PipeToken.tokenise = createOpperatorTokeniser(PipeToken, '|');
PipeToken.prototype.evaluate = function(scope, args) {
    this.result = '|';
};

function ParenthesesCloseToken(){}
ParenthesesCloseToken = createSpec(ParenthesesCloseToken, Token);
ParenthesesCloseToken.tokenPrecedence = 1;
ParenthesesCloseToken.prototype.parsePrecedence = 10;
ParenthesesCloseToken.prototype.name = 'ParenthesesCloseToken'
ParenthesesCloseToken.tokenise = function(substring) {
    if(substring.charAt(0) === ')'){
        return new ParenthesesCloseToken(substring.charAt(0), 1);
    }
}

function ArgumentToken(childTokens){
    this.original = '';
    this.length = 0;
    this.childTokens = childTokens;
}
ArgumentToken = createSpec(ArgumentToken, Token);
ArgumentToken.prototype.name = 'ArgumentToken';
ArgumentToken.prototype.evaluate = function(scope){
    evaluateTokens(this.childTokens, this.functionScope);
    this.result = combinedTokensResult(this.childTokens);
};

function ParenthesesOpenToken(){}
ParenthesesOpenToken = createSpec(ParenthesesOpenToken, Token);
ParenthesesOpenToken.tokenPrecedence = 1;
ParenthesesOpenToken.prototype.parsePrecedence = 3;
ParenthesesOpenToken.prototype.name = 'ParenthesesOpenToken'
ParenthesesOpenToken.tokenise = function(substring) {
    if(substring.charAt(0) === '('){
        return new ParenthesesOpenToken(substring.charAt(0), 1);
    }
}
var parenthesisParser = createNestingParser(ParenthesesCloseToken);
ParenthesesOpenToken.prototype.parse = function(tokens, index){
    parenthesisParser.apply(this, arguments);

    var args = [],
        lastPipeIndex = -1;

    for(var i = 0; i < this.childTokens.length; i++){
        if(this.childTokens[i] instanceof PipeToken){
            args.push(new ArgumentToken(this.childTokens.slice(lastPipeIndex+1, i)));
            lastPipeIndex = i;
        }
    }

    args.push(new ArgumentToken(this.childTokens.slice(lastPipeIndex+1)));

    this.arguments = args;
};
ParenthesesOpenToken.prototype.evaluate = function(scope){

    if(!this.isArgumentList){
        for(var i = 0; i < this.childTokens.length; i++){
            this.childTokens[i].evaluate(scope);
        }
        this.result = combinedTokensResult(this.childTokens);
        this.result = '(' + this.result + ')';
    }
}

function WordToken(){}
WordToken = createSpec(WordToken, Token);
WordToken.tokenPrecedence = 100; // very last thing always
WordToken.prototype.parsePrecedence = 1;
WordToken.prototype.name = 'WordToken';
WordToken.tokenise = function(substring) {
    var character = substring.slice(0,1),
        length = 1;

    if(character === '\\'){
        if(substring.charAt(1) !== '\\'){
            character = substring.charAt(1);
        }
        length++;
    }

    return new WordToken(character, length);
};
WordToken.prototype.parse = function(tokens, position){
    var index = 0;

    while(tokens[position + index + 1] && tokens[position + index + 1].name === 'WordToken'){
        index++
    }

    this.childTokens = tokens.splice(position + 1, index);
};
WordToken.prototype.evaluate = function(scope){
    this.result = this.original;

    for(var i = 0; i < this.childTokens.length; i++){
        this.result+= this.childTokens[i].original;
    }
};

function PlaceholderToken(){}
PlaceholderToken = createSpec(PlaceholderToken, Token);
PlaceholderToken.tokenPrecedence = 1;
PlaceholderToken.prototype.parsePrecedence = 2;
PlaceholderToken.prototype.name = 'PlaceholderToken';
PlaceholderToken.regex = /^(\{.+?\})/;
PlaceholderToken.tokenise = function(substring){
    var match = substring.match(PlaceholderToken.regex);

    if(match){
        if(!match[1].match(/^\{\w+\}$/)){
            throw "Invalid placeholder name. Placeholders may only contain word characters";
        }
        var token = new PlaceholderToken(match[1], match[1].length);
        token.key = token.original.slice(1,-1);
        return token;
    }
};
PlaceholderToken.prototype.evaluate = function(scope){
    var result = scope.get(this.original.slice(1,-1));
    if(result instanceof Term){
        result = '';
    }
    if(result instanceof Token){
        result.evaluate(scope);
        result = result.result;
    }
    this.result = result;
};

function EvaluateToken(){}
EvaluateToken = createSpec(EvaluateToken, Token);
EvaluateToken.tokenPrecedence = 1;
EvaluateToken.prototype.parsePrecedence = 4;
EvaluateToken.prototype.name = 'EvaluateToken';
EvaluateToken.regex = /^~(.+?)(?:\(|\|(?!\()|\)|\s|$)/;
EvaluateToken.tokenise = function(substring){
    var match = substring.match(EvaluateToken.regex);

    if(!match){
        return;
    }

    var token = new EvaluateToken(match[1], match[1].length + 1);
    token.term = match[1];

    return token;
};
EvaluateToken.prototype.parse = function(tokens, position){
    if(tokens[position+1] instanceof ParenthesesOpenToken){
        this.argsToken = tokens.splice(position+1,1).pop();
        this.argsToken.isArgumentList = true;
    }
};
EvaluateToken.prototype.evaluate = function(scope){
    var term = scope.get(this.term);

    this.result = runTerm(term, this.argsToken && this.argsToken.arguments, scope);
};

module.exports = [
    EvaluateToken,
    ParenthesesCloseToken,
    ParenthesesOpenToken,
    WordToken,
    PlaceholderToken,
    PipeToken
];