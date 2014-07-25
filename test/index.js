var test = require('grape'),
    SeeThreepio = require('../');

var seeThreepio = new SeeThreepio({
        'helloWorld': 'hello world',
        'hello(word)': 'hello {word}',
        'helloWorldExpression': 'hello ~world',
        'world': 'wat',
        'pipeTest': 'a|b|c',
        'equalTest': '~equal(a|a)',
        'reverseTest': '~reverse(abc)',
        'reverseTestExpression': '~reverse(abc)'
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
test('shipped functions', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('equalTest'), 'true');
});
test('shipped functions 2', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('reverseTest'), 'cba');
});