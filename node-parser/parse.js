var fs = require('fs');
var MultiRegExp = require('multiregexp');

var startTokens = [ //tokens que identificam o inicio de uma publicação
    /Data do jornal: /gi, 
    /SUPERIOR TRIBUNAL DE JUSTICA - DISPONIBILIZADO EM : /gi, 
    /TRIBUNAL REG. FEDERAL 4A REGIAO - DISPONIBILIZADO EM : /gi,
    /JUSTIÇA ESTADUAL RS - DISPONIBILIZADO EM : /gi
];

var courtNames = [ //Nomes de tribunais que podem iniciar uma publicação
    "SUPERIOR TRIBUNAL DE JUSTICA",
    "TRIBUNAL REG. FEDERAL 4A REGIAO",
    "JUSTIÇA ESTADUAL RS"
];

var fieldLabels = [ //Rótulos dos campos que podem estar na publicação
    /Data do jornal:/gi,
    /Data de disponibilização:/gi,
    /Data de publicação:/gi,
    /JUIZ(A)/gi,
    /ESCRIVA(O)/gi,
    /ADV:/gi,
    /PROCESSO/gi,
    /EXECUTADO:/gi,
    /EXEQUENTE:/gi,
    /FICAM INTIMADOS/gi,
    /PROCESSAMENTO/gi,
    /ADVOGADO:/gi,
    /MPF:/gi,
    /APELADO:/gi,
    /AGRAVADO:/gi,
    /PROCURADOR:/gi,
    /com abertura da sessão no dia/gi,
    /, e encerramento no dia/gi,
    /. Ficam as partes/gi,
    /RELATOR:/gi,
    /RELATOR :/gi,
    /AGRAVANTE:/gi,
    /AGRAVANTE :/gi,
    /AGRAVADO :/gi,
    /AGRAVADA:/gi,
    /- COMARCA/gi,
    /PARTE AUTORA:/gi,
    /APELANTE:/gi,
    /RECORRENTE :/gi,
    /MPF :/gi,
    /MPF:/gi
];

var records = [];

fs.readFile('input.txt', 'utf8', function(err, data) {
    if (err) throw err;
    
    var regex = new MultiRegExp(startTokens);
    var lastMatch = { start: 0, match: '' };
    for (let match of regex.allMatches(data)) {
        var newsItem = data.substring(lastMatch.start, match.start).trim(); //Texto completo de 1 única publicação
        if (newsItem.length) {
            var startCourtNames = courtNames.filter(item => lastMatch.match.indexOf(item) != -1);
            var tokens = parseTokens(newsItem);
            if (startCourtNames.length > 0) { //Verifica se inicia pelo nome do tribunal
                newsObject = processTemplate1(newsItem, lastMatch, tokens);
            } else {
                newsObject = processTemplate2(newsItem, lastMatch, tokens);
            }
            records.push(newsObject);
            //console.log(newsObject.availableDate + '\t' + newsObject.courtName + '\t' + newsObject.startDateTime + '\t' + newsObject.closingDateTime);
        }
        
        lastMatch = match;
    }

    fs.writeFile('output.json', JSON.stringify(records), function() {
        // console.log(JSON.stringify(records));
    });
    
    var dataTableHeader = "Data de disponibilização|Tribunal|Inicio|Fim|Relator|Agravante|Advogados|Data Jornal|Executado|Exequente|Agravado\n"
    var dataTableFormat = records.map(newsObject => {
        return newsObject.availableDate + '|' 
        + newsObject.courtName + '|' 
        + newsObject.startDateTime + '|' 
        + newsObject.closingDateTime + '|' 
        + newsObject.reporter +  '|' 
        + newsObject.agravante +  '|' 
        + newsObject.advogados  +  '|' 
        + newsObject.dataJornal  +  '|' 
        + newsObject.executado  +  '|' 
        + newsObject.exequente   +  '|' 
        + newsObject.agravado 
        + '\n';
    })
    .join("");
    console.log(dataTableHeader + dataTableFormat);

    fs.writeFile('output.txt', dataTableHeader + dataTableFormat, function() {
    });

});

function parseTokens(text) {
    var tokens = [];
    var regex = new MultiRegExp(fieldLabels);
    var lastMatch = { start: 0, match: '' };
    for (let match of regex.allMatches(text)) {
        if (lastMatch.match != '') {
            tokens.push({
                label: lastMatch.match,
                value: text.substring(lastMatch.start+lastMatch.match.length, match.start).trim()
            });    
        }
        
        lastMatch = match;
    }

    return tokens;
}

function getToken(tokens, label) {
    tokens = tokens.filter(token => token.label == label);
    if (tokens.length > 0) {
       // console.log(tokens[0].value);
        return tokens[0].value;
    } else {
        return null;
    }
}

function processTemplate1(newsItem, match, tokens) {
    var newsObject = {};
    
    //Data de disponibilização:
    if (newsItem.length >= 10) {
        newsObject.availableDate = newsItem.substring(match.match.length, match.match.length+10).trim();
    }

    //Tribunal
    var startCourtNames = courtNames.filter(item => match.match.indexOf(item) != -1);
    if (startCourtNames.length) {
        newsObject.courtName = startCourtNames[0];
    }

    newsObject.startDateTime = getToken(tokens, "com abertura da sessão no dia");
    newsObject.closingDateTime = getToken(tokens, ", e encerramento no dia");
    newsObject.reporter = getToken(tokens, "RELATOR :");
    newsObject.agravante = getToken(tokens, "AGRAVANTE:");
    newsObject.advogados = getToken(tokens, "ADVOGADO:");
    newsObject.dataJornal = getToken(tokens, "Data do jornal:");
    newsObject.executado = getToken(tokens, "EXECUTADO:");
    newsObject.exequente = getToken(tokens, "EXEQUENTE:");
    newsObject.agravado = getToken(tokens, "AGRAVADO:");
        
    return newsObject;
}

function extractField(startToken, endToken, itemText) {
    var startIndex = itemText.indexOf(startToken);
    var endIndex = itemText.indexOf(endToken);
    if (startIndex != -1 && endIndex != -1 && endIndex > startIndex) {
        return itemText.substring(startIndex+startToken.length, endIndex);
    } else {
        return null;
    }
}


function processTemplate2(newsItem, match, tokens) {
    var newsObject = {};
    
    //Data de disponibilização:
    var availableDateLabel = "Data de disponibilização: ";
    var availableDateIndex = newsItem.indexOf(availableDateLabel);

    if (availableDateIndex != -1) {
        newsObject.availableDate = newsItem.substring(availableDateIndex+availableDateLabel.length, availableDateIndex+availableDateLabel.length+10).trim();
    }

    newsObject.startDateTime = getToken(tokens, "com abertura da sessão no dia");
    newsObject.closingDateTime = getToken(tokens, ", e encerramento no dia");
    newsObject.reporter = getToken(tokens, "RELATOR:");
    newsObject.agravante = getToken(tokens, "AGRAVANTE:");
    newsObject.advogados = getToken(tokens, "ADVOGADO:");
    newsObject.dataJornal = getToken(tokens, "Data do jornal:");
    newsObject.executado = getToken(tokens, "EXECUTADO:");
    newsObject.exequente = getToken(tokens, "EXEQUENTE:");
    newsObject.agravado = getToken(tokens, "AGRAVADO:");

    return newsObject;
}