var Lang = require('lang-js'),
    Token = Lang.Token,
    global = require('./global'),
    createSpec = require('spec-js');

var createNestingParser = Lang.createNestingParser,
    Token = Lang.Token,
    Scope = Lang.Scope;

function isIdentifier(substring){
    var valid = /^[$A-Z_][0-9A-Z_$]*/i,
        possibleIdentifier = substring.match(valid);

    if (possibleIdentifier && possibleIdentifier.index === 0) {
        return possibleIdentifier[0];
    }
}

function tokeniseIdentifier(substring){
    // searches for valid identifiers or operators
    //operators
    var operators = "!=<>/&|*%-^?+\\",
        index = 0;

    while (operators.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        return substring.slice(0, index);
    }

    var identifier = isIdentifier(substring);

    if(identifier != null){
        return identifier;
    }
}

function createKeywordTokeniser(Constructor, keyword){
    return function(substring){
        substring = isIdentifier(substring);
        if (substring === keyword) {
            return new Constructor(substring, substring.length);
        }
    };
}

function createOpperatorTokeniser(Constructor, opperator) {
    return function(substring){
        if(substring.indexOf(opperator) === 0){
            return new Constructor(opperator, opperator.length);
        }
    };
}

function createOpperatorEvaluator(fn) {
    return function(scope){
        this.leftToken.evaluate(scope);
        this.rightToken.evaluate(scope);
        this.result = fn(this.leftToken.result, this.rightToken.result);
    };
}

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
var parenthesisParser = createNestingParser(ParenthesesCloseToken);
ParenthesesOpenToken.prototype.parse = function(tokens, position, parse){
    parenthesisParser.apply(this, arguments);

    var previousToken = tokens[position-1];

    if(!previousToken || previousToken instanceof SemicolonToken || previousToken instanceof OpperatorToken){
        return;
    }

    tokens.splice(position-1, 1);

    this.previousToken = previousToken;
};
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

function NumberToken(){}
NumberToken = createSpec(NumberToken, Token);
NumberToken.tokenPrecedence = 1;
NumberToken.prototype.parsePrecedence = 2;
NumberToken.prototype.name = 'NumberToken';
NumberToken.tokenise = function(substring) {
    var specials = {
        "NaN": Number.NaN,
        "-NaN": Number.NaN,
        "Infinity": Infinity,
        "-Infinity": -Infinity
    };
    for (var key in specials) {
        if (substring.slice(0, key.length) === key) {
            return new NumberToken(key, key.length);
        }
    }

    var valids = "0123456789-.Eex",
        index = 0;

    while (valids.indexOf(substring.charAt(index)||null) >= 0 && ++index) {}

    if (index > 0) {
        var result = substring.slice(0, index);
        if(isNaN(parseFloat(result))){
            return;
        }
        return new NumberToken(result, index);
    }

    return;
};
NumberToken.prototype.evaluate = function(scope){
    this.result = parseFloat(this.original);
};


function SemicolonToken(){}
SemicolonToken = createSpec(SemicolonToken, Token);
SemicolonToken.tokenPrecedence = 1;
SemicolonToken.prototype.parsePrecedence = 6;
SemicolonToken.prototype.name = 'SemicolonToken';
SemicolonToken.tokenise = function(substring) {
    if(substring.charAt(0) === ';'){
        return new SemicolonToken(substring.charAt(0), 1);
    }
};
SemicolonToken.prototype.parse = function(tokens, position){
    var lastPosition = 0;

    for(var i = tokens.length - 1 - position; i >=0; i--){
        if(tokens[i] instanceof SemicolonToken){
            lastPosition = i;
            break;
        }
    }

    this.childTokens = tokens.splice(lastPosition, position - lastPosition);
};
SemicolonToken.prototype.evaluate = function(scope){
    for(var i = 0; i < this.childTokens.length; i++){
        this.childTokens[i].evaluate(scope);
    }

    var lastChild = this.childTokens.slice(-1)[0];

    this.result = lastChild ? lastChild.result : undefined;
};

function NullToken(){}
NullToken = createSpec(NullToken, Token);
NullToken.prototype.name = 'NullToken';
NullToken.tokenPrecedence = 1;
NullToken.prototype.parsePrecedence = 2;
NullToken.tokenise = createKeywordTokeniser(NullToken, "null");
NullToken.prototype.parse = function(tokens, position){
};
NullToken.prototype.evaluate = function(scope){
    this.result = null;
};

function TrueToken(){}
TrueToken = createSpec(TrueToken, Token);
TrueToken.prototype.name = 'TrueToken';
TrueToken.tokenPrecedence = 1;
TrueToken.prototype.parsePrecedence = 2;
TrueToken.tokenise = createKeywordTokeniser(TrueToken, "true");
TrueToken.prototype.parse = function(tokens, position){
};
TrueToken.prototype.evaluate = function(scope){
    this.result = true;
};

function FalseToken(){}
FalseToken = createSpec(FalseToken, Token);
FalseToken.prototype.name = 'FalseToken';
FalseToken.tokenPrecedence = 1;
FalseToken.prototype.parsePrecedence = 2;
FalseToken.tokenise = createKeywordTokeniser(FalseToken, "false");
FalseToken.prototype.parse = function(tokens, position){
};
FalseToken.prototype.evaluate = function(scope){
    this.result = false;
};

function VariableToken(){}
VariableToken = createSpec(VariableToken, Token);
VariableToken.tokenPrecedence = 1;
VariableToken.prototype.parsePrecedence = 2;
VariableToken.prototype.name = 'VariableToken';
VariableToken.tokenise = createKeywordTokeniser(VariableToken, "var");
VariableToken.prototype.parse = function(tokens, position){
    this.identifierKey = tokens[position + 1].original;
};
VariableToken.prototype.evaluate = function(scope){
    scope.set(this.identifierKey, undefined);
    this.result = undefined;
};


function DelimiterToken(){}
DelimiterToken = createSpec(DelimiterToken, Token);
DelimiterToken.tokenPrecedence = 1;
DelimiterToken.prototype.parsePrecedence = 1;
DelimiterToken.prototype.name = 'DelimiterToken';
DelimiterToken.tokenise = function(substring) {
    var i = 0;
    while(i < substring.length && substring.charAt(i).trim() === "" || substring.charAt(i) === ',') {
        i++;
    }

    if(i){
        return new DelimiterToken(substring.slice(0, i), i);
    }
};
DelimiterToken.prototype.parse = function(tokens, position){
    tokens.splice(position, 1);
};

function OpperatorToken(){}
OpperatorToken = createSpec(OpperatorToken, Token);
OpperatorToken.tokenPrecedence = 2;
OpperatorToken.prototype.parsePrecedence = 3;
OpperatorToken.prototype.name = 'OpperatorToken';
OpperatorToken.prototype.parse = function(tokens, position){
    this.leftToken = tokens.splice(position-1,1)[0];
    this.rightToken = tokens.splice(position,1)[0];
};

function AssignemntToken(){}
AssignemntToken = createSpec(AssignemntToken, OpperatorToken);
AssignemntToken.prototype.name = 'AssignemntToken';
AssignemntToken.tokenise = createOpperatorTokeniser(AssignemntToken, '=');
AssignemntToken.prototype.evaluate = function(scope){
    this.rightToken.evaluate(scope);
    if(!(this.leftToken instanceof IdentifierToken)){
        throw "ReferenceError: Invalid left-hand side in assignment";
    }
    scope.set(this.leftToken.original, this.rightToken.result, true);
    this.result = undefined;
};

function MultiplyToken(){}
MultiplyToken = createSpec(MultiplyToken, OpperatorToken);
MultiplyToken.prototype.name = 'MultiplyToken';
MultiplyToken.tokenise = createOpperatorTokeniser(MultiplyToken, '*');
MultiplyToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a * b;
});

function DivideToken(){}
DivideToken = createSpec(DivideToken, OpperatorToken);
DivideToken.prototype.name = 'DivideToken';
DivideToken.tokenise = createOpperatorTokeniser(DivideToken, '/');
DivideToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a / b;
});

function AddToken(){}
AddToken = createSpec(AddToken, OpperatorToken);
AddToken.prototype.name = 'AddToken';
AddToken.tokenise = createOpperatorTokeniser(AddToken, '+');
AddToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a + b;
});

function SubtractToken(){}
SubtractToken = createSpec(SubtractToken, OpperatorToken);
SubtractToken.prototype.name = 'SubtractToken';
SubtractToken.tokenise = createOpperatorTokeniser(SubtractToken, '-');
SubtractToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a - b;
});

function ModulusToken(){}
ModulusToken = createSpec(ModulusToken, OpperatorToken);
ModulusToken.prototype.name = 'ModulusToken';
ModulusToken.tokenise = createOpperatorTokeniser(ModulusToken, '%');
ModulusToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a % b;
});

function LessThanOrEqualToken(){}
LessThanOrEqualToken = createSpec(LessThanOrEqualToken, OpperatorToken);
LessThanOrEqualToken.prototype.name = 'LessThanOrEqualToken';
LessThanOrEqualToken.tokenise = createOpperatorTokeniser(LessThanOrEqualToken, '<=');
LessThanOrEqualToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a <= b;
});

function LessThanToken(){}
LessThanToken = createSpec(LessThanToken, OpperatorToken);
LessThanToken.prototype.name = 'LessThanToken';
LessThanToken.tokenise = createOpperatorTokeniser(LessThanToken, '<');
LessThanToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a < b;
});

function GreaterThanOrEqualToken(){}
GreaterThanOrEqualToken = createSpec(GreaterThanOrEqualToken, OpperatorToken);
GreaterThanOrEqualToken.prototype.name = 'GreaterThanOrEqualToken';
GreaterThanOrEqualToken.tokenise = createOpperatorTokeniser(GreaterThanOrEqualToken, '>=');
GreaterThanOrEqualToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a >= b;
});

function GreaterThanToken(){}
GreaterThanToken = createSpec(GreaterThanToken, OpperatorToken);
GreaterThanToken.prototype.name = 'GreaterThanToken';
GreaterThanToken.tokenise = createOpperatorTokeniser(GreaterThanToken, '>');
GreaterThanToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a > b;
});

function AndToken(){}
AndToken = createSpec(AndToken, OpperatorToken);
AndToken.prototype.name = 'AndToken';
AndToken.tokenise = createOpperatorTokeniser(AndToken, '&&');
AndToken.prototype.evaluate = createOpperatorEvaluator(function(a,b){
    return a && b;
});

function IdentifierToken(){}
IdentifierToken = createSpec(IdentifierToken, Token);
IdentifierToken.tokenPrecedence = 3;
IdentifierToken.prototype.parsePrecedence = 2;
IdentifierToken.prototype.name = 'IdentifierToken';
IdentifierToken.tokenise = function(substring){
    var result = tokeniseIdentifier(substring);

    if(result != null){
        return new IdentifierToken(result, result.length);
    }
};
IdentifierToken.prototype.evaluate = function(scope){
    var value = scope.get(this.original);
    if(value instanceof Token){
        this.result = value.result;
        this.sourcePathInfo = value.sourcePathInfo;
    }else{
        this.result = value;
    }
};

var tokenConverters = [
        ParenthesesOpenToken,
        ParenthesesCloseToken,
        NumberToken,
        SemicolonToken,
        NullToken,
        TrueToken,
        FalseToken,
        VariableToken,
        DelimiterToken,
        AssignemntToken,
        MultiplyToken,
        DivideToken,
        AddToken,
        ModulusToken,
        LessThanOrEqualToken,
        LessThanToken,
        GreaterThanOrEqualToken,
        GreaterThanToken,
        AndToken,
        IdentifierToken
    ];

var SeeThreepio = function(){
    var seeThreepio = {},
        lang = new Lang();

    seeThreepio.lang = lang;
    seeThreepio.tokenConverters = tokenConverters;
    seeThreepio.global = global;
    seeThreepio.tokenise = function(expression){
        return seeThreepio.lang.tokenise(expression, seeThreepio.tokenConverters);
    }
    seeThreepio.evaluate = function(expression, injectedScope, returnAsTokens){
        var scope = new Lang.Scope();

        scope.add(this.global).add(injectedScope);

        return lang.evaluate(expression, scope, tokenConverters, returnAsTokens);
    };

    return seeThreepio;
};

module.exports = SeeThreepio;