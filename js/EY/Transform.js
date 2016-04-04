﻿// JS File used to transform nodes and links for applicative and path view
// For applicative view : information systems and variables
// For path view : variables and path representing flow of dependencies

var LEGEND_X_ANCHOR = 900;
var LEGEND_Y_ANCHOR = -20;

function getISById(Nodes, id){
  // Function returning node information system from id given as argument
  for (var n of Nodes){
    if (n["id"] == id){
      return n["informationsystem"];
    }
  }
}

function removeDuplicatesFromListOfObject(list){
  // Input : list of objects
  // n^2 complexity with respect to size of the list
  var listOfIndexToKeep = [];
  for (var i = 0; i < list.length; i++){
    for (var j = 0; j < list.length; j++){
      listOfIndexToKeep.push(list.indexOf({"source": i.toString(), "target": j.toString(), "value": 1}))
      L.push();
    }
  }
}

function compareLinkObjects(object1, object2, nbMaximumNodes){
  try{
    var quantity1 = parseInt(object1.source)*nbMaximumNodes + parseInt(object1.target);
    var quantity2 = parseInt(object2.source)*nbMaximumNodes +  parseInt(object2.target); 
    if ( quantity1 < quantity2){
      return -1;
    }

    if (quantity2 < quantity1){
      return 1;
    }
    return 0;
  }
  catch(err){
    console.log("Warning : could not catch one attribute of a link");
  }
}

// Provide your own comparison
function unique(a, compare, nbMaximumNodes){
  var j = 1;
  a.sort(compare);
  while ( j < a.length  ){
    while ( compareLinkObjects(a[j-1], a[j], nbMaximumNodes) === 0 ){
      a.splice(j,1);
    }
      j = j + 1;
  }
  return a;
}

Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}

function getSegmentedPosition(i, nbNodes, Width){
  // Returns segmented position with respect to html/css window
  var position = [];
  var constantPosition = [0, 200, 400, 600, 800, 1000]; 
  var layoff = 10;
  position.push(constantPosition[i]);
  // position.push(Width);
  position.push(0);
  return position;
}

function getAggregateControlNature(informationSystem, Nodes){
  // // Reminder : control nature varies in {1, 2, 3} 
  // TODO: define an aggregation rule, here average is rounded and returned
  // debugger;
  var aggrControlNature = 0;
  var nbNodesContained = 0;
  for (var n of Nodes){
    if ( n["informationsystem"] == informationSystem ) {
      nbNodesContained = nbNodesContained + 1;
      aggrControlNature = aggrControlNature + n["controlnature"];
    }
  }

  if ( nbNodesContained == 0 ){
    // console.log("Warning : Information system without variable");
    return 2;
  } 

  else{
    aggrControlNature = aggrControlNature / Math.max(nbNodesContained,1);
    return Math.round(aggrControlNature); 
  }

}

function getAggregateControlQuality(informationSystem, Nodes){
  // // Reminder : control quality varies in {1, 2, 3, 4} 
  // TODO: define an aggregation rule, here average is rounded and returned
  // debugger;
  var aggrControlQuality = 0;
  var nbNodesContained = 0;
  for (var n of Nodes){
    if ( n["informationsystem"] == informationSystem ) {
      nbNodesContained = nbNodesContained + 1;
      aggrControlQuality = aggrControlQuality + n["controlquality"];
    }
  }

  if ( nbNodesContained == 0 ){
    //console.log("Warning : Information system without variable");
    return 2;
  } 

  else{
    aggrControlQuality = aggrControlQuality / Math.max(nbNodesContained,1);
    return Math.round(aggrControlQuality); 
  }

}

function checkLinkExistence(Links, source, target){
  // Function checking if a link source -> target exists within the links
  for (var l of Links){
    if ( l.source == source && l.target == target ){
      return true;
    }
  }
  return false;
}

function indexOfSourceAsTarget(tab, indexSource){
  // Custom built function for finding index of a source as target
  // Returns -1 if there does not exist such index
  var informationSystemConcerned = tab[indexSource][0];
  for (var i = 0; i < tab.length; i++){
    if ( tab[i][1] == informationSystemConcerned ){
      return i;
    }
  }
  return -1;
}

function getNodeFromId(Nodes, index){
  for (var i = 0; i != Nodes.length; i++){
    if ( Nodes[i]["id"] == index ){
      return Nodes[i];
    }
  }
  return null;
}


function applicativeViewTransform(Nodes, Links, vizData){

  // Function allowing to transform nature of nodes and links
  var NewLinks = [];
  var NewNodes = [];
  // var informationSystems = [];
  var NodeCharacteristics = [];
  var position;
  var issueIS = false;
  ////////////////////////////////////////////////////////////////////////////////////////
  // Aim : Creating an array containing the ISs (information systems) ordered, where each previous pours in the following
  // 1 : create liste (source, target) without double
  var informationSystemsDoublon = [];
  for (var i = 0; i!= Nodes.length; i++){
    if (Nodes[i]["informationsystem"] != Nodes[i]["nextIS"] ){ // under the condition of different source and target
      informationSystemsDoublon.push([Nodes[i]["informationsystem"], Nodes[i]["nextIS"]]);
    }
  }
  informationSystemsDoublon = informationSystemsDoublon.getUnique()

  var indexWell;
  // 2 : Build target of the ordered list
  for (var i = 0; i != informationSystemsDoublon.length; i++){
    if ( informationSystemsDoublon[i][1] == "") { indexWell = i};
  }
  // 3 : Unroll information systems dumping
  vizData.informationSystems = [];
  while (  indexWell > -1 ){
    vizData.informationSystems.unshift(informationSystemsDoublon[indexWell][0]);
    indexWell = indexOfSourceAsTarget(informationSystemsDoublon, indexWell);
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  // Creating the new nodes containing the apps
  var nbInformationSystems = vizData.informationSystems.length;
  var equipe, responsable;
  for (var i = 0; i!= nbInformationSystems; i++){
    position = getSegmentedPosition(i, Nodes.length, vizData.Width);
    var etape;
    // Look for step into old nodes
    for ( var j = 0; j != Nodes.length; j++){
      if ( Nodes[j]["informationsystem"] == vizData.informationSystems[i] ){
        etape = Nodes[j]["etape"];
        equipe = Nodes[j]["equipe"];
        responsable = Nodes[j]["responsable"];
      }
    }
    var newNode = {
      "type": "informationsystem",
      "iscalculated" : false,
      "id" : i.toString(),
      "name" : vizData.informationSystems[i],
      "x": position[0],
      "y": position[1],
      "etape" : etape,
      "equipe" : equipe,
      "responsable" : responsable
      // "width" : defaultWidth/4,
      // "height" : defaultHeight/2
    };
    NewNodes.push(newNode);
  }

  var sourceInformationSystem, targetInformationSystem;
  ////////////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////////////
  // Creating Links between apps using new nodes
  for (var i = 0; i < NewNodes.length - 1; i++){
      NewLinks.push({
        "source" : NewNodes[i]["id"],
        "target" : NewNodes[i+1]["id"],
        "value": NewNodes[i],
        "controlnature" : getAggregateControlNature(NewNodes[i]["name"], Nodes),
        "controlquality" : getAggregateControlQuality(NewNodes[i]["name"], Nodes),
        "view" : "app"
      });
  }
  ////////////////////////////////////////////////////////////////////////////////////////
  // Check the list of information systems. If the link has not been made, create it
  // var target;
  // var source;
  // var checkLink;
  // for (var i = 0; i < nbInformationSystems - 1; i++){
  //   checkLink = checkLinkExistence(NewLinks, i, i+1);
  //   if ( ! checkLink ){
  //     NewLinks.push({
  //       "source" : i,
  //       "target" : i+1,
  //       "value" : 1,
  //       "type" : 5, // information system that is not source of a movement to another information system
  //       "view" : "app"
  //     })
  //   }
  // }
  ///////////////////////////////////////////////////////////////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////////////

  ////////////////////////////////////////////////////////////////////////////////////////
  //////////////////// Creating nodes containing variables   ///////////////////////////////
  var lengthWithoutVariables = NewNodes.length;
  for (var i = 0; i != Nodes.length; i++){
    var iscalculated = false;
    if ( Nodes[i].informationtype == "Calculée" ){ iscalculated = true; }
    NewNodes.push({
      "type": "variable",
      "iscalculated" : iscalculated,
      // "istransformed" : Nodes[i].istransformed,
      "id": lengthWithoutVariables + i,
      "name" : Nodes[i].name,
      "x" : 0,
      "y" : 0,
      "informationsystem" : Nodes[i].informationsystem,
      "etape" : Nodes[i]["etape"]
      // "width" : defaultWidth / 4,
      // "height" : defaultHeight / 2
    });
  }
  /////////////////// Creating links between variable and apps //////////////////////////
  var informationsystem;
  for (var i = 0; i < Nodes.length; i++){
    informationsystem = Nodes[i]["informationsystem"];
    NewLinks.push({
      "source" : lengthWithoutVariables + i,
      "target" : vizData.informationSystems.indexOf(informationsystem),
      "istransformed" : Nodes[i]["istransformed"],
      "value" : 1,
      "type" : 1,
      "view" : "app"
    })
  }
  //////////////////////////////////////////////////////////////////////////////////////
  
  /////////////////// Creating legend data /////////////////////////////////////////////
  // Include : elementary variable, calculated variable, information systems and links
  var legendNodeText = ["Variable élémentaire", "Variable calculée", "SI de collecte", "SI d'aggrégation", "SI de restitution"];
  var legendLinkText = ["Vérification automatique", "Vérification semi-automatique", "Vérification manuelle", "Appartenance variable à un SI", "Variable n'impliquant pas de déplacement"];
   var nbLegendNodes = legendNodeText.length;
  var nbLegendLinks = legendLinkText.length; 
  var legendData = [];
  var legendPositions = [];
  var nodeWidth = 27;
  for (var i = 0; i < nbLegendNodes + nbLegendLinks; i++){
    var xMargin = 0, yMargin = 0;
    if ( i <= 1 ){ xMargin = nodeWidth/2;}
    //if ( i <= 2 ){ yMargin = 45;}
    legendPositions.push([ LEGEND_X_ANCHOR + xMargin, LEGEND_Y_ANCHOR + i*(nodeWidth + yMargin)]);
  }

  for (var i = 0; i < nbLegendNodes; i++){
    legendData.push({
      "type" : "node",
      "id" : i,
      "text" : legendNodeText[i],
      "x" : legendPositions[i][0],
      "y" : legendPositions[i][1],
    })

  }
  for (var i = 0; i < nbLegendLinks; i++){
    legendData.push({
      "type" : "link",
      "id" : i + nbLegendNodes,
      "text" : legendLinkText[i],
      "x" : legendPositions[i+nbLegendNodes][0],
      "y" : legendPositions[i+nbLegendNodes][1],
    })
  }

  //legendData.push({"nodeLegendWidth" : , "rectangleLegendWidth" : });
  //////////////////////////////////////////////////////////////////////////////////////
  var returnLinks = unique(NewLinks, compareLinkObjects, vizData.nbMaximumNodes);
  return [NewNodes, returnLinks, legendData];
}

// function getAllLinksWithNames(nameNode, NewNodes, Links){
//   // Get links after parsing between Nodes containing names of variables and ID, and Links built with IDs
//   for (var i = 0; i < NewNodes.length; i ++){
//     if ( NewNodes[i].name == nameNode ){
//       id = NewNodes[i].id;
//     }
//   }
//   for (var i = 0; i < Links.length; i ++){
//     if ( Links[i].target. == nameNode ){ }
//   }

// }

function pathViewTransform(Nodes, Links, vizData){
  ////////////////////////////////////////////////////////////////////////////////////////
  // Aim : Creating an array containing the ISs (information systems) ordered, where each previous pours in the following
  // 1 : create liste (source, target) without double
  var informationSystemsDoublon = [];
  for (var i = 0; i!= Nodes.length; i++){
    if ( Nodes[i]["informationsystem"] != Nodes[i]["nextIS"] ){ // under the condition of different source and target
      informationSystemsDoublon.push([Nodes[i]["informationsystem"], Nodes[i]["nextIS"]]);
    }
  }
  informationSystemsDoublon = informationSystemsDoublon.getUnique()

  var indexWell;
  // 2 : Build target of the ordered list
  for (var i = 0; i != informationSystemsDoublon.length; i++){
    if ( informationSystemsDoublon[i][1] == "") { indexWell = i};
  }
  // 3 : Unroll information systems dumping
  vizData.informationSystems = [];
  while (  indexWell > -1 ){
    vizData.informationSystems.unshift(informationSystemsDoublon[indexWell][0]);
    indexWell = indexOfSourceAsTarget(informationSystemsDoublon, indexWell);
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  //////////////////// Creating nodes containing variables   ///////////////////////////////
  var NewNodes = [];
  for (var i = 0; i != Nodes.length; i++){
    var iscalculated = false;
    if ( Nodes[i].informationtype == "Calculée" ){ iscalculated = true; }
    NewNodes.push({
      "type": "variable",
      "iscalculated" : iscalculated,
      "id": Nodes[i].presentId,
      "name" : Nodes[i].name,
      "x" : 0,
      "y" : 0,
      "informationsystem" : Nodes[i].informationsystem
      // "width" : defaultWidth / 4,
      // "height" : defaultHeight / 2
    });
  }
  for (var i = 0; i!= Links.length; i++){
    var sourceVariable = Links[i].source;
    var targetVariable = Links[i].target;
    var NodeSource = getNodeFromId(NewNodes, sourceVariable);
    var NodeTarget = getNodeFromId(NewNodes, targetVariable);
    var typeOfLink = NodeSource["controlquality"];
    var sourceInformationSystem = vizData.informationSystems.indexOf(NodeSource.informationsystem); 
    Links[i]["type"] = typeOfLink;
    Links[i]["view"] = "path";
    Links[i]["source"] = NodeSource;
    Links[i]["target"] = NodeTarget; 
    Links[i]["controlnature"] = getAggregateControlNature(vizData.informationSystems[sourceInformationSystem], Nodes);
    Links[i]["controlquality"] = getAggregateControlQuality(vizData.informationSystems[sourceInformationSystem], Nodes);
    // Links[i]["name"] = NodeSource["name"]
    // Links[i]["id"] = getNodeFromId(Nodes, Links[i]["id"] );
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  // Build legend for path view : 
  var legendData = [];


  ////////////////////////////////////////////////////////////////////////////////////////
  // return [NewNodes, Links, legendData];
  return [NewNodes, Links, legendData];


}