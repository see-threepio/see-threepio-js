function floor(scope, args){
    return Math.floor(args.next());
}

function random(scope, args){
    return Math.random();
}

module.exports = {
    floor: floor,
    random: random
};