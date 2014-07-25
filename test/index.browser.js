(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

var Ample = function(){
    var ample = {},
        lang = new Lang();

    ample.lang = lang;
    ample.tokenConverters = tokenConverters;
    ample.global = global;
    ample.tokenise = function(expression){
        return ample.lang.tokenise(expression, ample.tokenConverters);
    }
    ample.evaluate = function(expression, injectedScope, returnAsTokens){
        var scope = new Lang.Scope();

        scope.add(this.global).add(injectedScope);

        return lang.evaluate(expression, scope, tokenConverters, returnAsTokens);
    };

    return ample;
};

module.exports = Ample;
},{"./global":2,"lang-js":8,"spec-js":10}],2:[function(require,module,exports){
function floor(scope, args){
    return Math.floor(args.next());
}

module.exports = {
    floor: floor
};
},{}],3:[function(require,module,exports){
(function (process){
var EventEmitter = require('events').EventEmitter,
    deepEqual = require('deep-equal'),
    encodeResults = require('./results');

var nextTick = process && process.nextTick || setTimeout;


function instantiate(){
    var testsToRun = [],
        testsRun = [],
        totalTests = 0,
        totalAssersions = 0,
        completedAssersions = 0,
        begun = false,
        timeout = 0,
        only;

    function Test(name, testFunction){
        this._plan = 0;
        this._count = 0;
        this._assersions = [];
        this.name = name;
        this._testFunction = testFunction;
    }

    // Unused currently.
    // Test.prototype = Object.create(EventEmitter.prototype);
    // Test.prototype.constructor = Test;

    function setTestTimeout(time){
        timeout = Math.max(timeout, time);
    }

    Test.prototype.timeout = setTestTimeout;

    Test.prototype.comment = function (message) {
        // ToDo
    };

    Test.prototype.plan = function(ammount){
        this._plan = ammount;
    };

    Test.prototype._run = function(){
        var test = this;
        try {
            test._testFunction(this);
        }
        catch (err) {
            test.error(err);
        }
    };

    Test.prototype._assert = function(details){
        if(details.operator !== 'end'){
            this._count++;
        }
        if(this._ended){
            if(details.operator === 'end' || details.operator === 'fail'){
                return;
            }
            this.fail('asserted after test has ended');
        }
        this._assersions.push(details);
    };

    Test.prototype.end = function (message) {
        var ok = this._plan === this._count;

        if(this._ended){
            return;
        }

        if(ok){
            this._assert({
                ok: true,
                message: message,
                operator: 'end'
            });
        }else{
            this._assert({
                ok: false,
                expected: this._plan,
                actual: this._count,
                message: 'plan != count',
                operator: 'end'
            });
        }

        this._ended = true;
    };

    Test.prototype.error = function(error, message){
        this._assert({
            ok: !error,
            message : message || String(error),
            operator : 'error',
            actual : error
        });
    };

    Test.prototype.pass = function(message){
        this._assert({
            ok: true,
            message: message,
            operator: 'pass'
        });
    };

    Test.prototype.fail = function(message){
        this._assert({
            message: message,
            operator: 'fail'
        });
    };

    Test.prototype.skip = function(message){
        this._assert({
            message: message,
            skip: true,
            operator: 'skip'
        });
    };

    Test.prototype.ok = function(value, message){
        this._assert({
            actual: value,
            ok: !!value,
            message: message,
            operator: 'ok'
        });
    };

    Test.prototype.notOk = function(value, message){
        this._assert({
            actual: value,
            ok:!value,
            message: message,
            operator: 'notOk'
        });
    };

    Test.prototype.equal = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: value === expected,
            message: message,
            operator: 'equal'
        });
    };

    Test.prototype.notEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: value !== expected,
            message: message,
            operator: 'notEqual'
        });
    };

    Test.prototype.deepEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: deepEqual(value, expected, { strict: true }),
            message: message,
            operator: 'deepEqual'
        });
    };

    Test.prototype.deepLooseEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: deepEqual(value, expected),
            message: message,
            operator: 'deepLooseEqual'
        });
    };

    Test.prototype.notDeepEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: !deepEqual(value, expected, { strict: true }),
            message: message,
            operator: 'notDeepEqual'
        });
    };

    Test.prototype.notDeepLooseEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: !deepEqual(value, expected),
            message: message,
            operator: 'notDeepLooseEqual'
        });
    };

    Test.prototype['throws'] = function (fn, expected, message) {
        var caughtError,
            passed;

        if(typeof expected === 'string'){
            message = expected;
            expected = undefined;
        }

        try{
            fn();
        }catch(error){
            caughtError = {error: error};
        }

        passed = caughtError;

        if(expected instanceof RegExp){
            passed = expected.test(caughtError && caughtError.error);
            expected = String(expected);
        }

        this._assert({
            ok: passed,
            message : message || 'should throw',
            operator : 'throws',
            actual : caughtError && caughtError.error,
            expected : expected,
            error: !passed && caughtError && caughtError.error
        });
    };

    Test.prototype.doesNotThrow = function (fn, expected, message) {
        var caughtError;

        if(typeof expected === 'string'){
            message = expected;
            expected = undefined;
        }

        try{
            fn();
        }catch(error){
            caughtError = { error : error };
        }

        this._assert({
            ok: !caughtError,
            message: message || 'should not throw',
            operator: 'doesNotThrow',
            actual: caughtError && caughtError.error,
            expected: expected,
            error: caughtError && caughtError.error
        });
    };

    function runNextTest(){
        while(testsToRun.length){
            var nextTest = testsToRun.shift();
            nextTest._run();
            testsRun.push(nextTest);
        }
    }

    function complete(){
        var results = encodeResults(testsRun);

        if(testsToRun.length !== totalTests){
            // tests level problem
        }

        grape.emit('complete', results[0]);

        if(!grape.silent){
            console.log(results[0]);
            process.exit(results[1]);
        }
    }

    function begin(){
        if(!begun){
            begun = true;
            nextTick(runNextTest);
            nextTick(function(){
                if(!process || !process.on || grape.useTimeout){
                    setTimeout(complete, timeout);
                }else{
                    process.on('exit', complete);
                }
            });
        }
    }

    function grape(name, testFunction){
        if(only){
            return;
        }
        totalTests++;
        testsToRun.push(new Test(name, testFunction));
        begin();
    }
    grape.timeout = setTestTimeout;

    grape.only = function(name, testFunction){
        if(only){
            throw "There can be only one only";
        }
        only = true;
        testsToRun = [new Test(name, testFunction)];
        begin();
    };

    for(var key in EventEmitter.prototype){
        grape[key] = EventEmitter.prototype[key];
    }

    grape.createNewInstance = instantiate;
    grape.Test = Test;

    return grape;
}

module.exports = instantiate();

}).call(this,require("/usr/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./results":7,"/usr/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13,"deep-equal":4,"events":12}],4:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function objEquiv(a, b, opts) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return true;
}

},{"./lib/is_arguments.js":5,"./lib/keys.js":6}],5:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],6:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],7:[function(require,module,exports){

// Taken from https://github.com/substack/tape/blob/master/lib/results.js

function encodeResult (result, count) {
    var output = '';
    output += (result.ok ? 'ok ' : 'not ok ') + count;
    output += result.message ? ' ' + result.message.toString().replace(/\s+/g, ' ') : '';

    if (result.skip) output += ' # SKIP';
    else if (result.todo) output += ' # TODO';

    output += '\n';
    if (result.ok) return output;

    var outer = '  ';
    var inner = outer + '  ';
    output += outer + '---\n';
    output += inner + 'operator: ' + result.operator + '\n';

    var ex = JSON.stringify(result.expected) || '';
    var ac = JSON.stringify(result.actual) || '';

    if (Math.max(ex.length, ac.length) > 65) {
        output += inner + 'expected:\n' + inner + '  ' + ex + '\n';
        output += inner + 'actual:\n' + inner + '  ' + ac + '\n';
    }
    else {
        output += inner + 'expected: ' + ex + '\n';
        output += inner + 'actual:   ' + ac + '\n';
    }
    if (result.at) {
        output += inner + 'at: ' + result.at + '\n';
    }
    if (result.operator === 'error' && result.actual && result.actual.stack) {
        var lines = String(result.actual.stack).split('\n');
        output += inner + 'stack:\n';
        output += inner + '  ' + lines[0] + '\n';
        for (var i = 1; i < lines.length; i++) {
            output += inner + lines[i] + '\n';
        }
    }

    output += outer + '...\n';
    return output;
}

function encodeResults(results){
    var output = '',
        count = 0,
        passed = 0,
        failed = 0;

    for(var i = 0; i < results.length; i++) {
        var test = results[i];

        output += '# ' + test.name + '\n';

        if(test._plan !== test._count){
            test._assert({
                ok: false,
                expected: test._plan,
                actual: test._count,
                message: 'plan != count',
                operator: 'end'
            });
        }

        for(var j = 0; j < test._assersions.length; j++) {
            var assersion = test._assersions[j];
            count++;

            if(assersion.ok){
                passed++;
            }else{
                failed++;
            }

            output += encodeResult(assersion, count);
        }
    }

    output += '\n1..' + count + '\n';
    output += '# tests ' + count + '\n';
    output += '# pass  ' + passed + '\n';

    if(failed) {
        output += '# fail  ' + failed + '\n';
    }else{
        output += '\n# ok\n';
    }

    return [output, failed];
}

module.exports = encodeResults;
},{}],8:[function(require,module,exports){
(function (process){
var Token = require('./token');

function fastEach(items, callback) {
    for (var i = 0; i < items.length; i++) {
        if (callback(items[i], i, items)) break;
    }
    return items;
}

var now;

if(typeof process !== 'undefined' && process.hrtime){
    now = function(){
        return process.hrtime();
    };
}else if(typeof performance !== 'undefined' && performance.now){
    now = function(){
        return performance.now();
    };
}else if(Date.now){
    now = function(){
        return Date.now();
    };
}else{
    now = function(){
        return new Date().getTime();
    };
}

function callWith(fn, fnArguments, calledToken){
    var argIndex = 0,
        scope = this,
        args = {
            callee: calledToken,
            length: fnArguments.length,
            raw: function(evaluated){
                var rawArgs = fnArguments.slice();
                if(evaluated){
                    fastEach(rawArgs, function(arg){
                        if(arg instanceof Token){
                            arg.evaluate(scope);
                        }
                    });
                }
                return rawArgs;
            },
            getRaw: function(index, evaluated){
                var arg = fnArguments[index];

                if(evaluated){
                    if(arg instanceof Token){
                        arg.evaluate(scope);
                    }
                }
                return arg;
            },
            get: function(index){
                var arg = fnArguments[index];

                if(arg instanceof Token){
                    arg.evaluate(scope);
                    return arg.result;
                }
                return arg;
            },
            hasNext: function(){
                return argIndex < fnArguments.length;
            },
            next: function(){
                if(!this.hasNext()){
                    throw "Incorrect number of arguments";
                }
                if(fnArguments[argIndex] instanceof Token){
                    fnArguments[argIndex].evaluate(scope);
                    return fnArguments[argIndex++].result;
                }
                return fnArguments[argIndex++];
            },
            all: function(){
                var allArgs = [];
                while(this.hasNext()){
                    allArgs.push(this.next());
                }
                return allArgs;
            }
        };

    return fn(scope, args);
}

function Scope(oldScope){
    this.__scope__ = {};
    this.__outerScope__ = oldScope;
}
Scope.prototype.get = function(key){
    var scope = this;
    while(scope && !scope.__scope__.hasOwnProperty(key)){
        scope = scope.__outerScope__;
    }
    return scope && scope.__scope__[key];
};
Scope.prototype.set = function(key, value, bubble){
    if(bubble){
        var currentScope = this;
        while(currentScope && !(key in currentScope.__scope__)){
            currentScope = currentScope.__outerScope__;
        }

        if(currentScope){
            currentScope.set(key, value);
        }
    }
    this.__scope__[key] = value;
    return this;
};
Scope.prototype.add = function(obj){
    for(var key in obj){
        this.__scope__[key] = obj[key];
    }
    return this;
};
Scope.prototype.isDefined = function(key){
    if(key in this.__scope__){
        return true;
    }
    return this.__outerScope__ && this.__outerScope__.isDefined(key) || false;
};
Scope.prototype.callWith = callWith;

// Takes a start and end regex, returns an appropriate parse function
function createNestingParser(closeConstructor){
    return function(tokens, index, parse){
        var openConstructor = this.constructor,
            position = index,
            opens = 1;

        while(position++, position <= tokens.length && opens){
            if(!tokens[position]){
                throw "Invalid nesting. No closing token was found matching " + closeRegex.toString();
            }
            if(tokens[position] instanceof openConstructor){
                opens++;
            }
            if(tokens[position] instanceof closeConstructor){
                opens--;
            }
        }

        // remove all wrapped tokens from the token array, including nest end token.
        var childTokens = tokens.splice(index + 1, position - 1 - index);

        // Remove the nest end token.
        childTokens.pop();

        // parse them, then add them as child tokens.
        this.childTokens = parse(childTokens);
    };
}

function scanForToken(tokenisers, expression){
    for (var i = 0; i < tokenisers.length; i++) {
        var token = tokenisers[i].tokenise(expression);
        if (token) {
            return token;
        }
    }
}

function sortByPrecedence(items, key){
    return items.slice().sort(function(a,b){
        var precedenceDifference = a[key] - b[key];
        return precedenceDifference ? precedenceDifference : items.indexOf(a) - items.indexOf(b);
    });
}

function tokenise(expression, tokenConverters, memoisedTokens) {
    if(!expression){
        return [];
    }

    if(memoisedTokens && memoisedTokens[expression]){
        return memoisedTokens[expression].slice();
    }

    tokenConverters = sortByPrecedence(tokenConverters, 'tokenPrecedence');

    var originalExpression = expression,
        tokens = [],
        totalCharsProcessed = 0,
        previousLength,
        reservedKeywordToken;

    do {
        previousLength = expression.length;

        var token;

        token = scanForToken(tokenConverters, expression);

        if(token){
            expression = expression.slice(token.length);
            totalCharsProcessed += token.length;
            tokens.push(token);
            continue;
        }

        if(expression.length === previousLength){
            throw "Unable to determine next token in expression: " + expression;
        }

    } while (expression);

    memoisedTokens && (memoisedTokens[originalExpression] = tokens.slice());

    return tokens;
}

function parse(tokens){
    var parsedTokens = 0,
        tokensByPrecedence = sortByPrecedence(tokens, 'parsePrecedence'),
        currentToken = tokensByPrecedence[0],
        tokenNumber = 0;

    while(currentToken && currentToken.parsed == true){
        currentToken = tokensByPrecedence[tokenNumber++];
    }

    if(!currentToken){
        return tokens;
    }

    if(currentToken.parse){
        currentToken.parse(tokens, tokens.indexOf(currentToken), parse);
    }

    // Even if the token has no parse method, it is still concidered 'parsed' at this point.
    currentToken.parsed = true;

    return parse(tokens);
}

function evaluate(tokens, scope){
    scope = scope || new Scope();
    for(var i = 0; i < tokens.length; i++){
        var token = tokens[i];
        token.evaluate(scope);
    }

    return tokens;
}

function printTopExpressions(stats){
    var allStats = [];
    for(var key in stats){
        allStats.push({
            expression: key,
            time: stats[key].time,
            calls: stats[key].calls,
            averageTime: stats[key].averageTime
        });
    }

    allStats.sort(function(stat1, stat2){
        return stat2.time - stat1.time;
    }).slice(0, 10).forEach(function(stat){
        console.log([
            "Expression: ",
            stat.expression,
            '\n',
            'Average evaluation time: ',
            stat.averageTime,
            '\n',
            'Total time: ',
            stat.time,
            '\n',
            'Call count: ',
            stat.calls
        ].join(''));
    });
}

function Lang(){
    var lang = {},
        memoisedTokens = {},
        memoisedExpressions = {};


    var stats = {};

    lang.printTopExpressions = function(){
        printTopExpressions(stats);
    }

    function addStat(stat){
        var expStats = stats[stat.expression] = stats[stat.expression] || {time:0, calls:0};

        expStats.time += stat.time;
        expStats.calls++;
        expStats.averageTime = expStats.time / expStats.calls;
    }

    lang.parse = parse;
    lang.tokenise = function(expression, tokenConverters){
        return tokenise(expression, tokenConverters, memoisedTokens);
    };
    lang.evaluate = function(expression, scope, tokenConverters, returnAsTokens){
        var langInstance = this,
            memoiseKey = expression,
            expressionTree,
            evaluatedTokens,
            lastToken;

        if(!(scope instanceof Scope)){
            var injectedScope = scope;

            scope = new Scope();

            scope.add(injectedScope);
        }

        if(Array.isArray(expression)){
            return evaluate(expression , scope).slice(-1).pop();
        }

        if(memoisedExpressions[memoiseKey]){
            expressionTree = memoisedExpressions[memoiseKey].slice();
        } else{
            expressionTree = langInstance.parse(langInstance.tokenise(expression, tokenConverters, memoisedTokens));

            memoisedExpressions[memoiseKey] = expressionTree;
        }


        var startTime = now();
        evaluatedTokens = evaluate(expressionTree , scope);
        addStat({
            expression: expression,
            time: now() - startTime
        });

        if(returnAsTokens){
            return evaluatedTokens.slice();
        }

        lastToken = evaluatedTokens.slice(-1).pop();

        return lastToken && lastToken.result;
    };

    lang.callWith = callWith;
    return lang;
};

Lang.createNestingParser = createNestingParser;
Lang.Scope = Scope;
Lang.Token = Token;

module.exports = Lang;
}).call(this,require("/usr/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"./token":9,"/usr/lib/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":13}],9:[function(require,module,exports){
function Token(substring, length){
    this.original = substring;
    this.length = length;
}
Token.prototype.name = 'token';
Token.prototype.precedence = 0;
Token.prototype.valueOf = function(){
    return this.result;
}

module.exports = Token;
},{}],10:[function(require,module,exports){
Object.create = Object.create || function (o) {
    if (arguments.length > 1) {
        throw new Error('Object.create implementation only accepts the first parameter.');
    }
    function F() {}
    F.prototype = o;
    return new F();
};

function createSpec(child, parent){
    var parentPrototype;

    if(!parent) {
        parent = Object;
    }

    if(!parent.prototype) {
        parent.prototype = {};
    }

    parentPrototype = parent.prototype;

    child.prototype = Object.create(parent.prototype);
    child.prototype.__super__ = parentPrototype;
    child.__super__ = parent;

    // Yes, This is 'bad'. However, it runs once per Spec creation.
    var spec = new Function("child", "return function " + child.name + "(){child.__super__.apply(this, arguments);return child.apply(this, arguments);}")(child);

    spec.prototype = child.prototype;
    spec.prototype.constructor = child.prototype.constructor = spec;
    spec.__super__ = parent;

    return spec;
}

module.exports = createSpec;
},{}],11:[function(require,module,exports){
var test = require('grape'),
    Ample = require('../');

var ample = new Ample();

test("1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("1"), 1);
});
test("-2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("-2"), -2);
});
test("2.4e9", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("2.4e9"), 2400000000);
});
test("1.0E-3", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("1.0E-3"), 0.001);
});
test("null", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("null"), null);
});
test("5; 3", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("5; 3"), 3);
});
test("2 * 4", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("8"), 8);
});
test("2 * 4 - 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("6"), 6);
});
test("2 * (4 - 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("4"), 4);
});
test("a = 5 a", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("var a = 5; a"), 5);
});
test("floor(2.5)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 2);
});
test("(floor(2.5) + 4) * 5", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 30);
});
test("var a = 5; floor(a / 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 2);
});
test("var a = 5; floor(a / 2) / 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 1);
});
test("var a = 5; 2 * floor(a / 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 4);
});
test("1(1)", function (t) {
  t.plan(1);
  t.throws(function(){
    ample.evaluate(t.name);
  });
});
test("1;(1)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),1);
});
test("1 < 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 < 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("1 > 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 >= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("1 <= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 <= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 <= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("1 >= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 >= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 >= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("true && 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),2);
});
test("false && 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("stats", function (t) {
  t.plan(1);
  ample.lang.printTopExpressions();
  t.pass();
});
},{"../":1,"grape":3}],12:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],13:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[11])