// JS File used to build vizualisation data using Graph structure (nodes and links)

function getWorksheetFromFile(file){
  // Principal function parsing Excel worksheet from input file and modifying NodesAndLinks Global Variable
  // Calls functions buildVizData
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
          "responsable",
          "table",
          "champs"
        ];
        var tabFieldsColumnLocation = ["A", "B", "D", "C", "AC", "AB", "AD","AF", "Q", "X", "Z", "AJ", "F", "P", "S", "T", "V", "W"];

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

function getControlQuality(text){
  // Get control quality based on text
  // To be modified depending on input data
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
  return text;
}

function getControlNature(text){
  // Get control nature based on text
  // To be modified depending on input data
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
  return text;
}

function getIsTransformed(text){
  // Function to be modified depending on input data
  // Transforms text data (affirmative or negative) into boolean
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
    // if ( data[i]["present"] == "Code devise"){ debugger;}
    var newNode = {
      "type": 'Global',
      "presentId": data[i]["presentId"],
      "name": data[i]["present"],
      "isOutputNode": false,
      "nextId": data[i]["nextId"] || data[i]["outputId"],
      "next": data[i]["next"] || data[i]["output"],
      "nextIS": replaceISname(data[i]["nextIS"]) || data[i]["output"],
      "code": "",
      "informationsystem": replaceISname(data[i]["informationsystem"]),
      "istransformed": getIsTransformed(data[i]["istransformed"]),
      "informationtype" : data[i]["informationtype"],
      "controlnature" : getControlNature(data[i]["controlnature"]),
      "controlquality" : getControlQuality(data[i]["controlquality"]),
      "etape" : data[i]["etape"],
      "equipe" : data[i]["equipe"],
      "responsable" : data[i]["responsable"],
      "table" : data[i]["table"],
      "champs" : data[i]["champs"],
      "controlnaturetext" : data[i]["controlnature"],
      "controlqualitytext" : data[i]["controlquality"]
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
    "informationsystem": data[0]["output"],
    "istransformed": "",
    "informationtype" : "Calculée",
    "controlnature" : "",
    "controlquality" : "",
    "etape" : "",
    "equipe" : "",
    "responsable" : "",
    "champs" : "",
    "controlqualitytext" : "",
    "controlnaturetext" : ""
  }
  Nodes.push(outputNode);
  var result = [Nodes, Links];
  NodesAndLinksForAppView = result;
  NodesAndLinksForPathView = result;

  document.getElementById("container").style = "visibility: visible;"
  launchDataVizModuleForAppView();
  launchDataVizModuleForPathView();
}

function handleFileSelect(evt) {
  // Function creating a HTML Button on document
  var files = evt.target.files; // FileList object
  // files is a FileList of File objects. List some properties.
  getWorksheetFromFile(files[0]);
}

// Add file picker listener
document.getElementById('files').addEventListener('change', handleFileSelect, false);