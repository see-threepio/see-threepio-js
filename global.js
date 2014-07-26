function equal(scope, args){
    return args.next() == args.next();
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

module.exports = {
    equal: equal,
    reverse: reverse,
    'if':ifFn,
    not: not
};