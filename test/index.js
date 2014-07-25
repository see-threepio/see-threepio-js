var test = require('grape'),
    Ample = require('../');

var ample = new Ample();

test("1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("1"), 1);
});
test("-2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("-2"), -2);
});
test("2.4e9", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("2.4e9"), 2400000000);
});
test("1.0E-3", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("1.0E-3"), 0.001);
});
test("null", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("null"), null);
});
test("5; 3", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("5; 3"), 3);
});
test("2 * 4", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("8"), 8);
});
test("2 * 4 - 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("6"), 6);
});
test("2 * (4 - 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("4"), 4);
});
test("a = 5 a", function (t) {
  t.plan(1);
  t.equal(ample.evaluate("var a = 5; a"), 5);
});
test("floor(2.5)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 2);
});
test("(floor(2.5) + 4) * 5", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 30);
});
test("random()", function (t) {
  t.plan(1);
  t.ok(!isNaN(ample.evaluate(t.name)));
});
test("var a = 5; floor(a / 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 2);
});
test("var a = 5; floor(a / 2) / 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 1);
});
test("var a = 5; 2 * floor(a / 2)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name), 4);
});
test("1(1)", function (t) {
  t.plan(1);
  t.throws(function(){
    ample.evaluate(t.name);
  });
});
test("1;(1)", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),1);
});
test("1 < 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 < 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("1 > 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 >= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("1 <= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 <= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 <= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("1 >= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("2 >= 1", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("2 >= 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),true);
});
test("true && 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),2);
});
test("false && 2", function (t) {
  t.plan(1);
  t.equal(ample.evaluate(t.name),false);
});
test("stats", function (t) {
  t.plan(1);
  ample.lang.printTopExpressions();
  t.pass();
});