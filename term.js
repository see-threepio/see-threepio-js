function Term(key, expression){
    var parts = key.match(/^(.+?)(?:\((.*?)\))?(?:\||\)|\s|$)/);

    if(!parts){
        throw "Invalid term definition: " + key;
    }

    this.term = parts[1];
    this.parameters = parts[2] ? parts[2].split('|') : [];
    this.expression = expression;
    this.isBasicTerm = !expression.match(/[~{}\\]/);
}

module.exports = Term;