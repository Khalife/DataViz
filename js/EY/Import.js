// JS File used to build vizualisation data using Graph structure (nodes and links)
var NodesAndLinks;
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
        var tabFields = ["presentId", "present", "nextId", "next", "nextIS","previous","informationsystem", "controlquality", "informationtype", "etape"];
        var tabFieldsColumnLocation = ["D", "C", "AC", "AB", "AD","AF", "Q", "AJ", "F", "P"];

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
  // 1 is automatic, 2 semi automatic and 3 manual
  return 2; // To be modified
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
    // target = data[i]["next"];
    // var endOfLineSymbol = target.match(/\n/g)||["|"];
    // var stringAsArray = target.split(endOfLineSymbol);
    // for (var s of stringAsArray) {
    //   id = getIdFromName(data, s);
    //   // will work only if one dependant only in each cell
    //   //  debugger;
    //   if (id >= 0){
    //     var newLink = {
    //       'source': data[i]["id"],
    //       //'source': i,
    //       'target': id,
    //       'value' : 1
    //     };
    //     Links.push(newLink);
    //     console.log(newLink);
    //   }
    // }

    var newLink = {
      'source': data[i]["presentId"],
      //'source': i,
      'target': data[i]["nextId"],
      'value' : 1
    };
    Links.push(newLink);

  }

  for (var i = 0; i != data.length; i ++){
    var newNode = {
      "type": 'Global',
      "presentId": data[i]["presentId"],
      "name": data[i]["present"],
      "nextId": data[i]["nextId"],
      "next": data[i]["next"],
      "nextIS": replaceISname(data[i]["nextIS"]),
      "code": "",
      "informationsystem": replaceISname(data[i]["informationsystem"]),
      "informationtype" : data[i]["informationtype"],
      "controlquality" : getControlQuality(data[i]["controlquality"]),
      "etape" : data[i]["etape"]
      };
    Nodes.push(newNode);
  }


  var result = [Nodes, Links];
  NodesAndLinks = result;

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