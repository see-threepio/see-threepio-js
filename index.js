var Lang = require('lang-js'),
    Token = Lang.Token,
    global = require('./global'),
    createSpec = require('spec-js');

var createNestingParser = Lang.createNestingParser,
    Token = Lang.Token,
    Scope = Lang.Scope;


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
PipeToken.prototype.parsePrecedence = 2;
PipeToken.tokenise = createOpperatorTokeniser(PipeToken, '|');
PipeToken.prototype.parse = function(tokens, position){
    this.leftToken = tokens.splice(position-1,1)[0];
    this.rightToken = tokens.splice(position,1)[0];
    if(!this.leftToken){
        throw "Invalid syntax, expected token before |";
    }
    if(!this.rightToken){
        throw "Invalid syntax, expected token after |";
    }
};
PipeToken.prototype.evaluate = function(scope, args) {
    this.leftToken.evaluate(scope);
    this.rightToken.evaluate(scope);

    var leftToken = this.leftToken,
        rightToken = this.rightToken;

    if(leftToken instanceof PipeToken){
        // concat
        this.result = leftToken.result.slice();
    }else{
        this.result = [];

        this.result.push(leftToken.result);
    }

    this.result.push(rightToken.result);
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

function ParenthesesOpenToken(){}
ParenthesesOpenToken = createSpec(ParenthesesOpenToken, Token);
ParenthesesOpenToken.tokenPrecedence = 1;
ParenthesesOpenToken.prototype.parsePrecedence = 2;
ParenthesesOpenToken.prototype.name = 'ParenthesesOpenToken'
ParenthesesOpenToken.tokenise = function(substring) {
    if(substring.charAt(0) === '('){
        return new ParenthesesOpenToken(substring.charAt(0), 1);
    }
}
ParenthesesOpenToken.prototype.parse = createNestingParser(ParenthesesCloseToken);
ParenthesesOpenToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    if(this.previousToken){
        this.previousToken.evaluate(scope);

        if(typeof this.previousToken.result !== 'function'){
            throw this.previousToken.original + " (" + this.previousToken.result + ")" + " is not a function";
        }

        this.result = scope.callWith(this.previousToken.result, this.childTokens, this);
    }else{
        this.result = this.childTokens.slice(-1)[0].result;
    }
}

function WordToken(){}
WordToken = createSpec(WordToken, Token);
WordToken.tokenPrecedence = 100; // very last thing always
WordToken.prototype.parsePrecedence = 1;
WordToken.prototype.name = 'WordToken';
WordToken.tokenise = function(substring) {
    return new WordToken(substring.slice(0,1), 1);
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
PlaceholderToken.regex = /^(\{.*?\})/;
PlaceholderToken.tokenise = function(substring){
    var match = substring.match(PlaceholderToken.regex);

    if(match){
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
    this.result = result;
};

function EvaluateToken(){}
EvaluateToken = createSpec(EvaluateToken, Token);
EvaluateToken.tokenPrecedence = 1;
EvaluateToken.prototype.parsePrecedence = 11;
EvaluateToken.prototype.name = 'EvaluateToken';
EvaluateToken.regex = /^~(.*?)(?:\(.*?\))?(?:\s|$)/;
EvaluateToken.tokenise = function(substring){
    var match = substring.match(EvaluateToken.regex);

    if(!match){
        return;
    }

    var term = match[1];

    var token = new EvaluateToken(match[1], match[1].length + 1);
    token.term = term;

    return token;
};
EvaluateToken.prototype.parse = function(tokens, position){
    if(tokens[position+1] instanceof ParenthesesOpenToken){
        this.argsToken = tokens.splice(position+1,1).pop();
    }
};
EvaluateToken.prototype.evaluate = function(scope){
    var term = scope.get(this.term),
        fn,
        args = [];

    if(term instanceof Term){
        this.result = scope.evaluateTerm(term, scope, this.args);
    }else{
        fn = term;
        if(this.argsToken){
            this.argsToken.evaluate(scope);
        }
        if(this.argsToken.childTokens[0] instanceof PipeToken){
            args = this.argsToken.result;
        }else{
            args = [this.argsToken.result];
        }
        this.result = scope.callWith(fn, args);
    }
};

function Term(key, expression){
    var parts = key.match(/(.*?)(?:\((.*?)\))?(?:\s|$)/);

    if(!parts){
        throw "Invalid term definition: " + key;
    }

    this.term = parts[1];
    this.parameters = parts[2] ? parts[2].split('|') : [];
    this.expression = expression;
}

var tokenConverters = [
        ParenthesesCloseToken,
        ParenthesesOpenToken,
        WordToken,
        PlaceholderToken,
        EvaluateToken,
        PipeToken
    ];

var SeeThreepio = function(termDefinitions){
    var seeThreepio = {},
        lang = new Lang(),
        terms = {};


    function evaluateTerm(term, scope, args){
        for(var i = 0; i < term.parameters.length; i++){
            var paremeter = term.parameters[i];

            scope.set(paremeter, args[i]);
        }

        var tokens = lang.evaluate(term.expression, scope, tokenConverters, true);

        var result = '';

        for(var i = 0; i < tokens.length; i++){
            result += tokens[i].result;
        }

        return result;
    }

    for(var key in termDefinitions){
        var term = new Term(key, termDefinitions[key]);
        terms[term.term] = term;
    }

    seeThreepio.lang = lang;
    seeThreepio.tokenConverters = tokenConverters;
    seeThreepio.global = global;
    seeThreepio.tokenise = function(expression){
        return seeThreepio.lang.tokenise(expression, seeThreepio.tokenConverters);
    }
    seeThreepio.get = function(term, args){
        var scope = new Lang.Scope();

        scope.add(this.global).add(terms);
        scope.evaluateTerm = evaluateTerm;

        var term = scope.get(term);

        if(!term){
            // ToDo, something nicer than throw
            throw "term not defined";
        }

        return evaluateTerm(term, scope, args);
    };

    return seeThreepio;
};

module.exports = SeeThreepio;