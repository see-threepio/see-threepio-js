var Lang = require('lang-js'),
    Token = Lang.Token,
    global = require('./global'),
    createSpec = require('spec-js');

var createNestingParser = Lang.createNestingParser,
    Token = Lang.Token,
    Scope = Lang.Scope;

function combinedTokensResult(tokens){
    if(tokens.length === 1){
        return tokens[0].result;
    }
    return tokens.reduce(function(result, token){
        return result += token.result;
    },'');
}

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
PipeToken.prototype.parse = function(tokens, position){
    this.leftTokens = tokens.splice(0, position);

    var rightIndex = 1;
    while(tokens[rightIndex] && !(tokens[rightIndex] instanceof PipeToken)){
        rightIndex++;
    }

    this.rightTokens = tokens.splice(1, rightIndex - 1);

    if(!this.leftTokens){
        throw "Invalid syntax, expected token before |";
    }
    if(!this.rightTokens){
        throw "Invalid syntax, expected token after |";
    }
};
PipeToken.prototype.evaluate = function(scope, args) {
    evaluateTokens(this.leftTokens, scope);
    evaluateTokens(this.rightTokens, scope);

    var leftTokens = this.leftTokens,
        rightTokens = this.rightTokens;

    if(leftTokens.length === 1 && leftTokens[0] instanceof PipeToken){
        // concat
        this.result = leftTokens[0].result.slice();
    }else{
        this.result = [];
        if(leftTokens.length){
            this.result.push(combinedTokensResult(leftTokens));
        }
    }

    this.result.push(combinedTokensResult(rightTokens));
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
ParenthesesOpenToken.prototype.parsePrecedence = 3;
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

    if(this.childTokens.length === 1 && this.childTokens[0] instanceof PipeToken){
        this.result = this.childTokens[0].result;
    }else{
        this.result = [combinedTokensResult(this.childTokens)];
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
    this.result = result;
};

function EvaluateToken(){}
EvaluateToken = createSpec(EvaluateToken, Token);
EvaluateToken.tokenPrecedence = 1;
EvaluateToken.prototype.parsePrecedence = 4;
EvaluateToken.prototype.name = 'EvaluateToken';
EvaluateToken.regex = /^~(\w+)?(?:\(|\||\)|\s|$)/;
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

    if(this.argsToken){
        this.argsToken.evaluate(scope);
        args = this.argsToken.result;
    }

    if(term instanceof Term){
        this.result = scope.evaluateTerm(term, scope, args);
    }else{
        this.result = scope.callWith(term, args);
    }
};

function Term(key, expression){
    var parts = key.match(/(\w+)(?:\((.*?)\))?(?:\||\)|\s|$)/);

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

function convertTerms(termDefinitions, terms){
    terms || (terms = {});
    for(var key in termDefinitions){
        var term = new Term(key, termDefinitions[key]);
        terms[term.term] = term;
    }
    return terms;
}

var SeeThreepio = function(termDefinitions){
    var seeThreepio = {},
        lang = new Lang(),
        terms = convertTerms(termDefinitions);

    function evaluateTerm(term, scope, args){
        for(var i = 0; i < term.parameters.length; i++){
            var paremeter = term.parameters[i];

            scope.set(paremeter, args[i]);
        }

        var tokens = lang.evaluate(term.expression, scope, tokenConverters, true);

        return '' + combinedTokensResult(tokens);
    }

    seeThreepio.lang = lang;
    seeThreepio.tokenConverters = tokenConverters;
    seeThreepio.global = global;
    seeThreepio.tokenise = function(expression){
        return seeThreepio.lang.tokenise(expression, seeThreepio.tokenConverters);
    }
    seeThreepio.get = function(termName, args){
        var scope = new Lang.Scope();

        scope.add(this.global).add(terms);
        scope.evaluateTerm = evaluateTerm;

        var term = scope.get(termName);

        if(!term){
            return new Error("term not defined: " + termName);
        }

        return evaluateTerm(term, scope, args);
    };
    seeThreepio.addTerms = function(termDefinitions){
        convertTerms(termDefinitions, terms);
    };
    seeThreepio.replaceTerms = function(termDefinitions){
        terms = convertTerms(termDefinitions);
    };

    return seeThreepio;
};

module.exports = SeeThreepio;