// JS File used to build vizualisation data using Graph structure (nodes and links)
var NodesAndLinksForAppView;
var NodesAndLinksForPathView;
var dataNames = [];
var begin = 11;
var end = 58;


function getWorksheetFromFile(file){
  // Principal function parsing Excel worksheet from input file and modifying NodesAndLinks Global Variable
  // Calls functions buildVizData, getIdFromName, createNodesAndLinksFromData
  // Input : pathfile (String)
  // No return value
  var workbook, worksheet;
  // Load file reader
  var reader = new FileReader();
  reader.onload = function(event) {
      /* Call XLSX */
      workbook = XLSX.read(event.target.result, {type:"binary"});
      worksheet = workbook.Sheets[workbook.SheetNames[0]];
      buildVizData(worksheet, begin, end);
  };
  reader.onerror = function(event) {
      console.error("File could not be read! Code " + event.target.error.code);
  };
  reader.readAsBinaryString(file);
}

function stringSwitchUndefined(variable){
  // Function used for returning an adapted structure in case of undefined variable
  if (variable == undefined)
    return {"v":""};
  else
    return variable;
}

// 2 functions in case of replacing some character is needed
// function spliceSlice(str, index, count, add) {
//   return str.slice(0, index) + (add || "") + str.slice(index + count);
// }

// function avoidEncodingIssues(string, characterToBeReplaced){
//   debugger;
//   if ( string.indexOf("é") > -1 ){
//     return spliceSlice(string, string.indexOf("é"), 1, "e");
//   }
// }

// function elementaryParsing(worksheet){
//   // Method parsing worksheet and building a JS array
//   // Input : worksheet
//   // Returns an array where i-th element is i-th variable
//   //var dataNames = []
//   for (var i = numberOfLineBeginning; i != numberOfLineEnding; i++){
//     if ( worksheet["C" + i.toString()] != ""){
//         dataNames.push(worksheet["C" + i.toString()]);
//     }
//   }
//   return dataNames;
// }

function buildVizData(worksheet, numberOfLineBeginning, numberOfLineEnding){
  // Method parsing worksheet file and creatings NodesAndLinksData
  // Input : worksheet as a XLSX data structure (JS Package)
  // No return value
  var data = []; 
  // var addressOfCellPresent, addressOfCellPrevious, addressOfCellNext, addressOfOriginID, i_
  var i_ = 0;
  // Loop over fixed on specific beginning and ending of excel file
  // Important step for specific data parsing
  for (var i = numberOfLineBeginning; i != numberOfLineEnding; i++){
      if (worksheet["C" + i.toString()]){
        // var tabFields = ["originid", "present","next", "nextIS","previous","informationsystem", "controlquality", "informationtype", "etape"];
        var tabFields = [
          "output",
          "outputId",
          "presentId",
          "present",
          "nextId",
          "next",
          "nextIS",
          "previous",
          "informationsystem",
          "istransformed",
          "controlnature",
          "controlquality",
          "informationtype",
          "etape",
          "equipe",
          "responsable"
        ];
        var tabFieldsColumnLocation = ["A", "B", "D", "C", "AC", "AB", "AD","AF", "Q", "X", "Z", "AJ", "F", "P", "S", "T"];

        var result = {
          "type": 'Global',
          // "id" : i_.toString()
        };

        for (indexField = 0; indexField < tabFields.length; indexField++) {
          var fieldName = tabFields[indexField];
          var fieldColumnInExcelFile = tabFieldsColumnLocation[indexField] + i.toString();
          result[fieldName] = stringSwitchUndefined(worksheet[fieldColumnInExcelFile]).v;
        }
       
        data.push(result);
        i_ = i_ + 1;
    }
  }
  createPathNodesAndLinksFromData(data);
}

function getIdFromName(array, name){
  // Returns Id of the corresponding name variable in the dict-array or -1 if not existing
  for (var i = 0; i != array.length; i++){
    //console.log(array[i]["present"]);
    if (array[i]["present"] == name)
      return array[i]["id"];
  }
  return -1;
}

function getControlQuality(text){
  // Get control quality based on text
  // 1 is OK, 2 is KO and 3 is NO (not performed) - 4 is NA (not available)
  switch(text) {
    case "OK":
        return 1;
        break;
    case "KO":
        return 2;
        break;
    case "NO":
        return 3;
        break;
    default: // "NA"
        return 4;
  }
}

function getControlNature(text){
  // Get control nature based on text
  // 1 is Automatique, 2 is Manuel and 3 is Semi-Automatique
  switch(text) {
    case "Automatique":
        return 1;
        break;
    case "Manuel":
        return 2;
        break;
    case "Semi-automatique":
        return 3;
        break;
    default: // "NA"
        return 2;
  }
}

function getIsTransformed(text){
  return (text == "Y");
}

function replaceISname(text){
  // Function to be modified with regards to the client input
  if ( text.indexOf("PICASSO") > -1 ){
    return "Picasso";
  }

  if ( text.indexOf("LIQ") > - 1 ){
    return "Liq";
  }

  if ( text.indexOf("Amadea") > -1 ){
    return "Amadea";
  }

  if ( text.indexOf("Matisse EPM") > -1){
    return "Matisse EPM";
  }

  // if ( text.indexOf("E-Ris") > -1){
  //   return "Fermat";
  // }

  else{
    return text;
  }
}

function createPathNodesAndLinksFromData(data){
  // Function writing Nodes and Links values variable
  // Input : Data Array coming from XLSX package
  var Nodes = [];
  var Links = [];

  for (var i = 0; i != data.length;i++){

    var newLink = {
      'source': data[i]["presentId"],
      'target': data[i]["nextId"] || data[i]["outputId"],
      'value' : 1
    };
    Links.push(newLink);

  }

  for (var i = 0; i != data.length; i ++){
    var newNode = {
      "type": 'Global',
      "presentId": data[i]["presentId"],
      "name": data[i]["present"],
      "isOutputNode": false,
      "nextId": data[i]["nextId"] || data[i]["outputId"],
      "next": data[i]["next"] || data[i]["output"],
      "nextIS": replaceISname(data[i]["nextIS"]) || "output",
      "code": "",
      "informationsystem": replaceISname(data[i]["informationsystem"]),
      "istransformed": getIsTransformed(data[i]["istransformed"]),
      "informationtype" : data[i]["informationtype"],
      "controlnature" : getControlNature(data[i]["controlnature"]),
      "controlquality" : getControlQuality(data[i]["controlquality"]),
      "etape" : data[i]["etape"],
      "equipe" : data[i]["equipe"],
      "responsable" : data[i]["responsable"]
      };
    Nodes.push(newNode);
  }

  var outputNode = {
    "type": 'Global',
    "presentId": data[0]["outputId"],
    "name": data[0]["output"],
    "isOutputNode": true,
    "nextId": "",
    "next": "",
    "nextIS": "",
    "code": "",
    "informationsystem": "output",
    "istransformed": "",
    "informationtype" : "",
    "controlnature" : "",
    "controlquality" : "",
    "etape" : "",
    "equipe" : "",
    "responsable" : ""
  }

  Nodes.push(outputNode);

  var result = [Nodes, Links];
  NodesAndLinksForAppView = result;
  NodesAndLinksForPathView = result;

  // AUTO LAUNCH - test
  launchDataVizModuleForAppView();
  launchDataVizModuleForPathView();

}


function unique(a) {
    // Function droping duplicates inside array a
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function handleFileSelect(evt) {
  // Function creating a HTML Button on document
  var files = evt.target.files; // FileList object
  // files is a FileList of File objects. List some properties.
  // var output = [];
  // for (var i = 0, f; f = files[i]; i++) {
  //   output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
  //               f.size, ' bytes, last modified: ',
  //               f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
  //               '</li>');
  // }
  //document.getElementById('output').innerHTML = '<ul>' + output.join('') + '</ul>';
  getWorksheetFromFile(files[0]);
}

// Add file picker listener
document.getElementById('files').addEventListener('change', handleFileSelect, false);