var test = require('grape'),
    SeeThreepio = require('../');

var seeThreepio = new SeeThreepio({
        'helloWorld': 'hello world',
        'hello(word)': 'hello {word}',
        'helloWorldExpression': 'hello ~world',
        'world': 'wat',
        'pipeTest': 'a|b|c',
        'equalTest': '~equal(a|a)',
        'notEqualTest': '~not(~equal(a|a))',
        'reverseTest': '~reverse(abc)',
        'reverseTestExpression': '~reverse(abc)',
        'pluralize(word|count)': '~if(~equal({count}|1)|{word}|{word}s)'
    });

test('bare words', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('helloWorld'), 'hello world');
});
test('placeholders', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('hello', ['wat']), 'hello wat');
});
test('evaluate expression (~)', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('helloWorldExpression'), 'hello wat');
});
test('pipes', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pipeTest'), 'a,b,c');
});
test('equal', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('equalTest'), 'true');
});
test('not', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('notEqualTest'), 'false');
});
test('reverse', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('reverseTest'), 'cba');
});
test('pluralize plural', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pluralize', ['car', 5]), 'cars');
});
test('pluralize singular', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pluralize', ['car', 1]), 'car');
});