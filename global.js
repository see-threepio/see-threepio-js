var Term = require('./term');

function equal(scope, args){
    return args.next() == args.next();
}

function notEqual(scope, args){
    console.log(args.all());
    return args.next() != args.next();
}

function and(scope, args){
    return args.next() && args.next();
}

function or(scope, args){
    return args.next() || args.next();
}

function not(scope, args){
    return !args.next();
}

function reverse(scope, args){
    return args.next().split('').reverse().join('');
}

function ifFn(scope, args){
    return args.next() ? args.get(1) : args.get(2);
}

function addition(scope, args){
    return args.next() + args.next()
}

function subtraction(scope, args){
    return args.next() - args.next()
}

function multiplication(scope, args){
    return args.next() * args.next()
}

function division(scope, args){
    return args.next() / args.next()
}

function modulus(scope, args){
    return args.next() / args.next()
}

function lessThan(scope, args){
    return args.next() < args.next()
}

function greaterThan(scope, args){
    return args.next() > args.next()
}

function lessThanOrEqual(scope, args){
    return args.next() <= args.next()
}

function greaterThanOrEqual(scope, args){
    return args.next() >= args.next()
}

function termExists(scope, args){
    var term = scope.get(args.next());

    return !!term;
}

function runTerm(scope, args){
    var term = scope.get(args.next()),
        allArgs = args.rest(),
        result;

    console.log(args.get(0), allArgs);

    if(term instanceof Term){
        result = scope.get('evaluateTerm')(term, scope, allArgs);
    }else{
        result = scope.callWith(term, allArgs);
    }

    return result;
}

module.exports = {
    '=': equal,
    '!=': notEqual,
    'reverse': reverse,
    '?': ifFn,
    '!': not,
    '&&': and,
    '||': or,
    '+': addition,
    '-': subtraction,
    '*': multiplication,
    '/': division,
    '%': modulus,
    '<': lessThan,
    '>': greaterThan,
    '<=': lessThanOrEqual,
    '>=': greaterThanOrEqual,
    '?>': termExists,
    '->': runTerm
};