var test = require('grape'),
    SeeThreepio = require('../');

var seeThreepio = new SeeThreepio({
        'helloWorld': 'hello world',
        'hello(word)': 'hello {word}',
        'helloWorldExpression': 'hello ~wat',
        'parenthesisWithNoArgs': '~wat()',
        'wat': 'wat',
        'pipeTest': 'a|b|c',
        'equalTest': '~equal(a|a)',
        'notEqualTest': '~not(~equal(a|a))',
        'reverseTest': '~reverse(abc)',
        'reverseTestExpression': '~reverse(abc)',
        'pluralize(word|count)': '~if(~equal({count}|1)|{word}|{word}s)',
        'pluralizedWord': '~pluralize(thing|2)',
        'pluralizedWat(count)': '~pluralize(~wat|{count})',
        'escapedTilde': '\\~',
        'escapedParenthesis': '\\(hello\\)',
        'escapedPipe': '\\|',
        'escapedCurly': '\\{hello\\}',
        'escapedCurly2(thing)': '\\{{thing}\\}',
        'escapedCurlyInvalid(thing)': '{\\{thing\\}}',
        'watStrings': '~wat - ~pluralize(string|2).',
        'hyphonated-term': 'hyphonated-term',
        'ALLCAPS': 'ALLCAPS',
        '12345': '12345'
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
test('parenthesis call with no arguments', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('parenthesisWithNoArgs'), 'wat');
});
test('evaluate expression (~)', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('helloWorldExpression'), 'hello wat');
});('pipes', function (t) {
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
test('pluralize word', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pluralizedWord'), 'things');
});
test('pluralize wat', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pluralizedWat', [2]), 'wats');
});
test('pluralize wat singular', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('pluralizedWat', [1]), 'wat');
});
test('watStrings', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('watStrings'), 'wat - strings.');
});


test('Escaping: ~', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('escapedTilde'), '~');
});
test('Escaping: ( )', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('escapedParenthesis'), '(hello)');
});
test('Escaping: |', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('escapedPipe'), '|');
});
test('Escaping: { }', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('escapedCurly'), '{hello}');
});
test('Escaping: { } 2', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('escapedCurly2', ['a']), '{a}');
});
test('Escaping: { } invalid', function (t) {
    t.plan(1);
    t.throws(function(){
        seeThreepio.get('escapedCurlyInvalid', ['a']);
    });
});

test('null reference placeholders', function (t) {
    t.plan(1);
    t.equal(seeThreepio.get('hello', []), 'hello ');
});

test('identifier matching', function (t) {
    t.plan(3);
    t.equal(seeThreepio.get('hyphonated-term'), 'hyphonated-term');
    t.equal(seeThreepio.get('ALLCAPS'), 'ALLCAPS');
    t.equal(seeThreepio.get('12345'), '12345');
});