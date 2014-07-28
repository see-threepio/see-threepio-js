var SeeThreepio = require('./'),
    crel = require('crel'),
    swig  = require('swig');

var languages;

var seeThreepio = new SeeThreepio();

var termsBox = crel('textarea'),
    input = crel('textarea'),
    output = crel('div'),
    languageSelect = crel('select');

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
        console.error(e);
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
        console.error(e);
        termsBox.classList.add('invalid');
    }
    if(terms){
        termsBox.classList.remove('invalid');
        seeThreepio.replaceTerms(terms);
    }
}

function updateLanguageSelect(){
    languages = JSON.parse(document.querySelector('[type="text/json"]').textContent.trim());

    for(var key in languages){
        crel(languageSelect,
            crel('option', {value: key}, key)
        );
    }

    languageSelect.addEventListener('change', function(){
        termsBox.value = JSON.stringify(languages[languageSelect.value], null, '    ');
        updateTerms();
        updateOutput();
    });

    termsBox.value = JSON.stringify(languages['en'], null, '    ');
}

termsBox.addEventListener('change', updateTerms);
termsBox.addEventListener('change', updateOutput);
input.addEventListener('change', updateOutput);

window.addEventListener('load', function(){
    var template = document.getElementsByTagName('template')[0];
    input.value = template.innerHTML;
    template.parentElement.removeChild(template);

    updateLanguageSelect();
    updateTerms();
    updateOutput();
    crel(document.body,
        crel('div', {'class':'inputArea'},
            crel('h2', 'Terms'),
            languageSelect,
            termsBox
        ),
        crel('div', {'class':'inputArea'},
            crel('h2', 'Input'),
            input
        ),
        output
    );
});