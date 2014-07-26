var SeeThreepio = require('./'),
    crel = require('crel'),
    swig  = require('swig');

var englishTerms = {
    'seeThreepio': 'See-Threepio',
    'pluralize(word|count)': '~if(~equal({count}|1)|{word}|{word}s)'
};

var seeThreepio = new SeeThreepio(englishTerms);

var termsBox = crel('textarea'),
    input = crel('textarea'),
    output = crel('div');

termsBox.value = JSON.stringify(englishTerms, null, '    ');

function updateOutput(){
    var result;

    try{
        result = swig.render(input.value, {locals:{
            '__': function(){
                var args = Array.prototype.slice.call(arguments);
                return seeThreepio.get(args.shift(), args);
            }}
        });
    }catch(e){
        input.classList.add('invalid');
    }
    
    if(result){
        input.classList.remove('invalid');
        output.innerHTML = result;
    }
}

function updateTerms(){
    var terms;
    try{
        terms = JSON.parse(termsBox.value);
    }catch(e){
        termsBox.classList.add('invalid');
    }
    if(terms){
        termsBox.classList.remove('invalid');
        seeThreepio.replaceTerms(terms);
    }
}

termsBox.addEventListener('change', updateTerms);
termsBox.addEventListener('change', updateOutput);
input.addEventListener('change', updateOutput);

window.addEventListener('load', function(){
    var template = document.getElementsByTagName('template')[0];
    input.value = template.innerHTML;
    template.parentElement.removeChild(template);
    updateOutput();
    crel(document.body, 
        crel('div', {'class':'inputArea'}, 
            crel('h2', 'Terms'),
            termsBox
        ),
        crel('div', {'class':'inputArea'}, 
            crel('h2', 'Input'),
            input
        ),
        output
    );
});