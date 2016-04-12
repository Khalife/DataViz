// JS File used to transform nodes and links for applicative and path view
// For applicative view : information systems and variables
// For path view : variables and path representing flow of dependencies
function compareLinkObjects(object1, object2, nbMaximumNodes) {
        try {
            var quantity1 = parseInt(object1.source) * nbMaximumNodes +
                parseInt(object1.target);
            var quantity2 = parseInt(object2.source) * nbMaximumNodes +
                parseInt(object2.target);
            if (quantity1 < quantity2) {
                return -1;
            }
            if (quantity2 < quantity1) {
                return 1;
            }
            return 0;
        } catch (err) {
            console.log("Warning : could not catch one attribute of a link");
        }
}
// Provide your own comparison

function unique(a, compare, nbMaximumNodes) {
    var j = 1;
    a.sort(compare);
    while (j < a.length) {
        while (compareLinkObjects(a[j - 1], a[j], nbMaximumNodes) === 0) {
            a.splice(j, 1);
        }
        j = j + 1;
    }
    return a;
}

Array.prototype.getUnique = function() {
    var u = {},
        a = [];
    for (var i = 0, l = this.length; i < l; ++i) {
        if (u.hasOwnProperty(this[i])) {
            continue;
        }
        a.push(this[i]);
        u[this[i]] = 1;
    }
    return a;
}

function getSegmentedPosition(i, nbNodes, Width) {
    // Returns segmented position with respect to html/css window
    var position = [];
    var constantPosition = [0, 200, 400, 600, 800, 1000];
    var layoff = 10;
    position.push(constantPosition[i]);
    // position.push(Width);
    position.push(0);
    return position;
}

function findOccurrencesIn(arr, val) {
    // Function used to return occurences of val in arr
    var i, j,
        count = 0;
    for (i = 0, j = arr.length; i < j; i++) {
        (arr[i] === val) && count++;
    }
    return count;
}

function getAggregateControlNature(informationSystem, Nodes) {
    // // Reminder : control nature varies in {1, 2, 3} 
    // TODO: define an aggregation rule, here average is rounded and returned
    // debugger;
    var aggrControlNature = [];
    var nbNodesContained = 0;
    for (var n of Nodes) {
        if (n["informationsystem"] == informationSystem) {
            if (n.controlnature == 3) {
                return 3;
            }
            aggrControlNature.push(n.controlnature);
        }
    }
    if (aggrControlNature.indexOf(3) > -1) {
        // console.log("Warning : Information system without variable");
        return 3;
    }
    // In this case, there is no semi-auto index
    if (aggrControlNature.indexOf(2) < 0) {
        return 1;
    } else if (aggrControlNature.indexOf(1) < 0) {
        return 2;
    } else {
        return 3; // because there are automatic and manual controls
    }
}

function getAggregateControlQuality(informationSystem, Nodes) {
    // // Reminder : control quality varies in {1, 2, 3, 4} 
    // TODO: define an aggregation rule, here average is rounded and returned
    // debugger;
    var controlNaturesList = [],
        controlNaturesListWithoutNA = [];
    for (var n of Nodes) {
        if (n["informationsystem"] == informationSystem) {
            controlNaturesList.push(n.controlquality);
            controlNaturesListWithoutNA.push(n.controlquality);
        }
    }
    for (var i = controlNaturesList.length - 1; i >= 0; i--) {
        if (controlNaturesListWithoutNA[i] === 4) {
            controlNaturesListWithoutNA.splice(i, 1);
        }
    }
    if (controlNaturesListWithoutNA.length == 0) {
        return 4;
    }
    var nbControleIdentifies = controlNaturesListWithoutNA.length;
    var nbControleNonIdentifies = controlNaturesList.length -
        nbControleIdentifies;
    if (nbControleIdentifies <= nbControleNonIdentifies) {
        return 4;
    }
    var nbControleOK = findOccurrencesIn(controlNaturesListWithoutNA, 1);
    var nbControleKO = findOccurrencesIn(controlNaturesListWithoutNA, 2);
    var nbControleNO = findOccurrencesIn(controlNaturesListWithoutNA, 3);
    if (nbControleOK + nbControleKO <= nbControleNO) {
        return 3;
    }
    if (nbControleOK < nbControleKO) {
        return 2;
    } else {
        return 1;
    }
}

function getAggregateControlNatureText(informationSystem, Nodes, controlQualities) {
    // // Reminder : control nature varies in {1, 2, 3} 
    // TODO: define an aggregation rule, here average is rounded and returned
    // debugger;
    var controlNaturesList = [];
    for (var n of Nodes) {
        if (n["informationsystem"] == informationSystem) {
            if (n.controlnaturetext == "Semi-automatique") {
                return "Semi-automatique";
            }
            controlNaturesList.push(n.controlnaturetext);
        }
    }
    // In this case, there is no semi-auto index
    if (controlNaturesList.indexOf("Manuel") < 0) {
        return "Automatique";
    } else if (controlNaturesList.indexOf("Automatique") < 0) {
        return "Manuel";
    } else {
        return "Semi-automatique"; // because there are automatic and manual controls
    }
}

function getAggregateControlQualityText(informationSystem, Nodes, controlNatures) {
    // // Reminder : control quality varies in {1, 2, 3, 4} 
    // TODO: define an aggregation rule, here average is rounded and returned
    // debugger;
    var controlNaturesList = [],
        controlNaturesListWithoutNA = [];
    for (var n of Nodes) {
        if (n["informationsystem"] == informationSystem) {
            // if (informationSystem == "Fermat / E-ris"){debugger;}
            controlNaturesList.push(n.controlqualitytext);
            controlNaturesListWithoutNA.push(n.controlqualitytext);
        }
    }
    for (var i = controlNaturesListWithoutNA.length - 1; i >= 0; i--) {
        if (controlNaturesListWithoutNA[i] === "NA") {
            controlNaturesListWithoutNA.splice(i, 1);
        }
    }
    if (controlNaturesListWithoutNA.length == 0) {
        return "NA";
    }
    // in this case, there are others values than NA
    var nbControleIdentifies = controlNaturesListWithoutNA.length;
    var nbControleNonIdentifies = controlNaturesList.length -
        nbControleIdentifies;
    if (nbControleIdentifies <= nbControleNonIdentifies) {
        return "NA";
    }
    var nbControleOK = findOccurrencesIn(controlNaturesListWithoutNA, "OK");
    var nbControleKO = findOccurrencesIn(controlNaturesListWithoutNA, "KO");
    var nbControleNO = findOccurrencesIn(controlNaturesListWithoutNA, "NO");
    if (nbControleOK + nbControleKO <= nbControleNO) {
        return "NO";
    }
    if (nbControleOK < nbControleKO) {
        return "KO";
    } else {
        return "OK";
    }
}

function indexOfSourceAsTarget(tab, indexSource) {
    // Custom built function for finding index of a source as target
    // Returns -1 if there does not exist such index
    var informationSystemConcerned = tab[indexSource][0];
    for (var i = 0; i < tab.length; i++) {
        if (tab[i][1] == informationSystemConcerned) {
            return i;
        }
    }
    return -1;
}

function getNodeFromId(Nodes, index) {
    for (var i = 0; i != Nodes.length; i++) {
        if (Nodes[i]["id"] == index) {
            return Nodes[i];
        }
    }
    return null;
}

function getTransformedNodesFromIS(Nodes, is) {
    var listOfNodesNames = "";
    var index = false;
    for (var n of Nodes) {
        if (n.informationsystem == is && n.istransformed == true) {
            listOfNodesNames = listOfNodesNames + n.name + "\n";
        }
    }
    return listOfNodesNames;
}

function getControlNaturesFromNodes(Nodes) {
    var controlNatureList = [];
    for (var n of Nodes) {
        if (n.controlnaturetext != "") {
            controlNatureList.push(n.controlnaturetext);
        }
    }
    controlNatureList = controlNatureList.getUnique();
    return controlNatureList;
}

function getControlQualitiesFromNodes(Nodes) {
    var controlQualityList = [];
    for (var n of Nodes) {
        if (n.controlqualitytext != "") {
            controlQualityList.push(n.controlqualitytext);
        }
    }
    controlQualityList = controlQualityList.getUnique();
    return controlQualityList;
}

function applicativeViewTransform(Nodes, Links, vizData) {
    // Function allowing to transform nature of nodes and links
    var controlQualities = getControlQualitiesFromNodes(Nodes);
    var controlNatures = getControlNaturesFromNodes(Nodes);
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
    for (var i = 0; i != Nodes.length; i++) {
        if (Nodes[i]["informationsystem"] != Nodes[i]["nextIS"]) { // under the condition of different source and target
            informationSystemsDoublon.push([Nodes[i]["informationsystem"],
                Nodes[i]["nextIS"]
            ]);
        }
    }
    informationSystemsDoublon = informationSystemsDoublon.getUnique()
    var indexWell;
    // 2 : Build target of the ordered list
    for (var i = 0; i != informationSystemsDoublon.length; i++) {
        if (informationSystemsDoublon[i][1] == "") {
            indexWell = i
        };
    }
    // 3 : Unroll information systems dumping
    vizData.informationSystems = [];
    while (indexWell > -1) {
        vizData.informationSystems.unshift(informationSystemsDoublon[
            indexWell][0]);
        indexWell = indexOfSourceAsTarget(informationSystemsDoublon,
            indexWell);
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    // Creating the new nodes containing the apps
    var nbInformationSystems = vizData.informationSystems.length;
    var equipe, responsable, transformation, controlQuality, controlNature,
        table, champs;
    for (var i = 0; i != nbInformationSystems; i++) {
        champs = "";
        position = getSegmentedPosition(i, Nodes.length, vizData.Width);
        var etape;
        // Look for step into old nodes
        for (var j = 0; j != Nodes.length; j++) {
            if (Nodes[j]["informationsystem"] == vizData.informationSystems[
                i]) {
                etape = Nodes[j]["etape"];
                equipe = Nodes[j]["equipe"];
                responsable = Nodes[j]["responsable"];
                transformation = Nodes[j]["istransformed"];
                controlQuality = Nodes[j]["controlquality"];
                controlNature = Nodes[j]["controlnature"];
                table = Nodes[j]["table"];
                champs = champs + Nodes[j]["champs"] + "\n";
                isoutputnode = Nodes[j]["isOutputNode"];
            }
        }
        var newNode = {
            "type": "informationsystem",
            "iscalculated": false,
            "id": i.toString(),
            "name": vizData.informationSystems[i],
            "x": position[0],
            "y": position[1],
            "etape": etape,
            "equipe": equipe,
            "responsable": responsable,
            "istransformed": transformation,
            "isoutputnode": isoutputnode,
            "controlquality": controlQuality,
            "controlnature": controlNature,
            "table": table,
            "champs": champs,
            "controlnaturetext": "",
            "controlqualitytext": ""
                // "width" : defaultWidth/4,
                // "height" : defaultHeight/2
        };
        NewNodes.push(newNode);
    }
    var sourceInformationSystem, targetInformationSystem;
    ////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////
    // Creating Links between apps using new nodes
    var listOfTransformedNodesNames;
    for (var i = 0; i < NewNodes.length - 1; i++) {
        // create list of nodes that are transformed 
        listOfTransformedNodesNames = getTransformedNodesFromIS(Nodes,
            NewNodes[i].name);
        NewLinks.push({
            "linktype": "informationsystem",
            "source": NewNodes[i]["id"],
            "target": NewNodes[i + 1]["id"],
            "value": NewNodes[i],
            "controlnature": getAggregateControlNature(NewNodes[i][
                "name"
            ], Nodes),
            "controlquality": getAggregateControlQuality(NewNodes[i]
                ["name"], Nodes),
            "controlnaturetext": getAggregateControlNatureText(
                NewNodes[i]["name"], Nodes, controlNatures),
            "controlqualitytext": getAggregateControlQualityText(
                NewNodes[i]["name"], Nodes, controlNatures),
            "view": "app",
            "table": NewNodes[i]["table"],
            "transformedvariables": listOfTransformedNodesNames,
            "champs": NewNodes[i]["champs"]
        });
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    //////////////////// Creating nodes containing variables   ///////////////////////////////
    var lengthWithoutVariables = NewNodes.length;
    for (var i = 0; i != Nodes.length; i++) {
        var iscalculated = false;
        if (Nodes[i].informationtype == "Calculée") {
            iscalculated = true;
        }
        NewNodes.push({
            "type": "variable",
            "iscalculated": iscalculated,
            // "istransformed" : Nodes[i].istransformed,
            "id": lengthWithoutVariables + i,
            "idFromSource": Nodes[i]["presentId"],
            "name": Nodes[i].name,
            "x": 0,
            "y": 0,
            "informationsystem": Nodes[i].informationsystem,
            "isoutputnode": Nodes[i]["isOutputNode"],
            "etape": Nodes[i]["etape"],
            "table": Nodes[i]["table"],
            "controlquality": Nodes[i]["controlquality"],
            "controlnature": Nodes[i]["controlnature"],
            "champs": Nodes[i]["champs"],
            "controlqualitytext": Nodes[i]["controlqualitytext"],
            "controlnaturetext": Nodes[i]["controlnaturetext"]
                // "width" : defaultWidth / 4,
                // "height" : defaultHeight / 2
        });
    }
    /////////////////// Creating links between variable and apps //////////////////////////
    var informationsystem;
    for (var i = 0; i < Nodes.length; i++) {
        informationsystem = Nodes[i]["informationsystem"];
        NewLinks.push({
            "linktype": "variable",
            "source": lengthWithoutVariables + i,
            "target": vizData.informationSystems.indexOf(
                informationsystem),
            "istransformed": Nodes[i]["istransformed"],
            "value": 1,
            "type": 1,
            "view": "app"
        })
    }
    //////////////////////////////////////////////////////////////////////////////////////
    /////////////////// Creating legend data /////////////////////////////////////////////
    // Include : elementary variable, calculated variable, information systems and links
    var legendNodeText = ["Variable élémentaire", "Variable calculée",
        "SI de collecte", "SI d'aggrégation", "SI de restitution"
    ];
    var legendLinkText = ["Transformée à cette étape",
        "Non-transformée à cette étape", "Vérification automatique",
        "Vérification semi-automatique", "Vérification manuelle",
        "Contrôle OK", "Contrôle KO", "Pas de contrôle",
        "Pas d'information",
    ];
    var nbLegendNodes = legendNodeText.length;
    var nbLegendLinks = legendLinkText.length;
    var legendData = [];
    var legendPositions = [];
    var nodeWidth = 27;
    for (var i = 0; i < nbLegendNodes + nbLegendLinks; i++) {
        var xMargin = 0,
            yMargin = 0;
        if (i <= 1) {
            xMargin = nodeWidth / 2;
        }
        //if ( i <= 2 ){ yMargin = 45;}
        legendPositions.push([LEGEND_X_ANCHOR + xMargin, LEGEND_Y_ANCHOR +
            i * (nodeWidth + yMargin)
        ]);
    }
    for (var i = 0; i < nbLegendNodes; i++) {
        legendData.push({
            "type": "node",
            "id": i,
            "text": legendNodeText[i],
            "x": legendPositions[i][0],
            "y": legendPositions[i][1],
        })
    }
    for (var i = 0; i < nbLegendLinks; i++) {
        legendData.push({
            "type": "link",
            "id": i + nbLegendNodes,
            "text": legendLinkText[i],
            "x": legendPositions[i + nbLegendNodes][0],
            "y": legendPositions[i + nbLegendNodes][1],
        })
    }
    //legendData.push({"nodeLegendWidth" : , "rectangleLegendWidth" : });
    //////////////////////////////////////////////////////////////////////////////////////
    var returnLinks = unique(NewLinks, compareLinkObjects, vizData.nbMaximumNodes);
    return [NewNodes, returnLinks, legendData];
}

function pathViewTransform(Nodes, Links, vizData) {
    ////////////////////////////////////////////////////////////////////////////////////////
    // Aim : Creating an array containing the ISs (information systems) ordered, where each previous pours in the following
    // 1 : create liste (source, target) without double
    var informationSystemsDoublon = [];
    for (var i = 0; i != Nodes.length; i++) {
        if (Nodes[i]["informationsystem"] != Nodes[i]["nextIS"]) { // under the condition of different source and target
            informationSystemsDoublon.push([Nodes[i]["informationsystem"],
                Nodes[i]["nextIS"]
            ]);
        }
    }
    informationSystemsDoublon = informationSystemsDoublon.getUnique()
    var indexWell;
    // 2 : Build target of the ordered list
    for (var i = 0; i != informationSystemsDoublon.length; i++) {
        if (informationSystemsDoublon[i][1] == "") {
            indexWell = i
        };
    }
    // 3 : Unroll information systems dumping
    vizData.informationSystems = [];
    while (indexWell > -1) {
        vizData.informationSystems.unshift(informationSystemsDoublon[
            indexWell][0]);
        indexWell = indexOfSourceAsTarget(informationSystemsDoublon,
            indexWell);
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    //////////////////// Creating nodes containing variables   ///////////////////////////////
    var NewNodes = [];
    for (var i = 0; i != Nodes.length; i++) {
        var iscalculated = false;
        if (Nodes[i].informationtype == "Calculée") {
            iscalculated = true;
        }
        NewNodes.push({
            "type": "variable",
            "iscalculated": iscalculated,
            "id": Nodes[i].presentId,
            "name": Nodes[i].name,
            "x": 0,
            "y": 0,
            "informationsystem": Nodes[i].informationsystem,
            "controlquality": Nodes[i].controlquality,
            "controlnature": Nodes[i].controlnature,
            "equipe": Nodes[i].equipe,
            "champs": Nodes[i].champs,
            "etape": Nodes[i].etape
                // "width" : defaultWidth / 4,
                // "height" : defaultHeight / 2
        });
    }
    for (var i = 0; i != Links.length; i++) {
        var sourceVariable = Links[i].source;
        var targetVariable = Links[i].target;
        var NodeSource = getNodeFromId(NewNodes, sourceVariable);
        var NodeTarget = getNodeFromId(NewNodes, targetVariable);
        var sourceInformationSystem = vizData.informationSystems.indexOf(
            NodeSource.informationsystem);
        Links[i]["view"] = "path";
        Links[i]["source"] = NodeSource;
        Links[i]["target"] = NodeTarget;
        Links[i]["controlnature"] = NodeSource["controlnature"];
        Links[i]["controlquality"] = NodeSource["controlquality"];
    }
    ////////////////////////////////////////////////////////////////////////////////////////
    /////////////////// Creating legend data /////////////////////////////////////////////
    // Include : elementary variable, calculated variable, information systems and links
    var legendNodeText = ["Variable élémentaire", "Variable calculée"];
    var legendLinkText = ["Vérification automatique",
        "Vérification semi-automatique", "Vérification manuelle",
        "Contrôle OK", "Contrôle KO", "Pas de contrôle",
        "Pas d'information",
    ];
    var nbLegendNodes = legendNodeText.length;
    var nbLegendLinks = legendLinkText.length;
    var legendData = [];
    var legendPositions = [];
    var nodeWidth = 27;
    for (var i = 0; i < nbLegendNodes + nbLegendLinks; i++) {
        var xMargin = 0,
            yMargin = 0;
        if (i <= 1) {
            xMargin = nodeWidth / 2;
        }
        //if ( i <= 2 ){ yMargin = 45;}
        legendPositions.push([LEGEND_X_ANCHOR + xMargin, LEGEND_Y_ANCHOR +
            i * (nodeWidth + yMargin)
        ]);
    }
    for (var i = 0; i < nbLegendNodes; i++) {
        legendData.push({
            "type": "node",
            "id": i,
            "text": legendNodeText[i],
            "x": legendPositions[i][0],
            "y": legendPositions[i][1],
        })
    }
    for (var i = 0; i < nbLegendLinks; i++) {
        legendData.push({
            "type": "link",
            "id": i + nbLegendNodes,
            "text": legendLinkText[i],
            "x": legendPositions[i + nbLegendNodes][0],
            "y": legendPositions[i + nbLegendNodes][1],
        })
    }

    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks,
        "text" : "Liq",
        "x" : LEGEND_X_ANCHOR + xMargin,
        "y" : LEGEND_Y_ANCHOR + (nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    });

    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks + 1,
        "text" : "Picasso",
        "x" : LEGEND_X_ANCHOR + xMargin,
        "y" : LEGEND_Y_ANCHOR + (1 + nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    });

    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks + 2,
        "text" : "Matisse EPM",
        "x" : LEGEND_X_ANCHOR + xMargin,
        "y" : LEGEND_Y_ANCHOR + (2 + nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    });
    
    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks + 3,
        "text" : "Fermat / E-ris",
        "x" : LEGEND_X_ANCHOR + xMargin,
        "y" : LEGEND_Y_ANCHOR + (3 + nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    });
    
    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks + 4,
        "text" : "Fermat",
        "x" : LEGEND_X_ANCHOR + 2*xMargin,
        "y" : LEGEND_Y_ANCHOR + (4 + nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    });

    legendData.push({
        "type" : "informationsystem",
        "id" : nbLegendNodes + nbLegendLinks + 5,
        "text" : "Amadea",
        "x" : LEGEND_X_ANCHOR + xMargin,
        "y" : LEGEND_Y_ANCHOR + (5 + nbLegendNodes + nbLegendLinks)*(nodeWidth + yMargin)
    })

    ////////////////////////////////////////////////////////////////////////////////////////
    // return [NewNodes, Links, legendData];
    return [NewNodes, Links, legendData];
}