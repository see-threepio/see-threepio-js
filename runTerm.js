var Term = require('./term');

function runTerm(term, args, scope){
    args = args ? args.slice() : [];

    for(var i = 0; i < args.length; i++){
        if(args[i].name === 'ArgumentToken'){
            args[i].functionScope = scope;
        }
    }

    if(term instanceof Term){
        return scope.get('evaluateTerm')(term, scope, args);
    }else{
        return scope.callWith(term, args);
    }
}

module.exports = runTerm;