function combinedTokensResult(tokens, finalResult){
    if(tokens.length === 1 && !finalResult){
        return tokens[0].result;
    }
    return tokens.reduce(function(result, token, index){
        if(token.result == null){
            return result;
        }
        if(Array.isArray(token.result)){
            return result + token.result.join('|');
        }

        return result + token.result;
    },'');
}

module.exports = combinedTokensResult;