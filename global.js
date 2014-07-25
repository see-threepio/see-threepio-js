function equal(scope, args){
    return args.next() == args.next();
}

function reverse(scope, args){
    return args.next().split('').reverse().join('');
}

module.exports = {
    equal: equal,
    reverse: reverse
};