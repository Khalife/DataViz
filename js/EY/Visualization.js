'use strict';

var svg, tooltip, biHiSankey, path, defs, colorScale, highlightColorScale, typeColorScale, isColorScale, strokeColorScale, isTransitioning;



var OPACITY = {
    NODE_DEFAULT: 0.9,
    NODE_FADED: 0.1,
    NODE_HIGHLIGHT: 0.8,
    LINK_DEFAULT: 0.6,
    LINK_FADED: 0.05,
    LINK_HIGHLIGHT: 0.9
  },
  TYPES = ["Asset", "Expense", "Revenue", "Equity", "Liability"],
  TYPE_COLORS = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d"],
  TYPE_HIGHLIGHT_COLORS = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"],
  LINK_TYPES_COLORS = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854"],
  // STROKE_TYPES = [1,2,3], // Saisie - Collecte, Agrégation, Restitution
  STROKE_TYPES = ["Saisie / Collecte", "Agregation", "Restitution"],
  STROKE_TYPES_COLORS = ["#00688B", "#838B83", "#FF1493"],
  LINK_TYPES = [1, 2, 3, 4, 5],
  LINK_COLOR = "#b3b3b3",
  INFLOW_COLOR = "#2E86D1",
  OUTFLOW_COLOR = "#D63028",
  NODE_WIDTH = 36,
  NODE_HEIGHT = 40,
  NODE_INFORMATIONSYSTEM_WIDTH = 150,
  NODE_INFORMATIONSYSTEM_HEIGHT = 75,
  COLLAPSER = {
    RADIUS: NODE_WIDTH / 2,
    SPACING: 2
  },
  OUTER_MARGIN = 10,
  MARGIN = {
    TOP: 2 * (COLLAPSER.RADIUS + OUTER_MARGIN),
    RIGHT: OUTER_MARGIN,
    BOTTOM: OUTER_MARGIN,
    LEFT: OUTER_MARGIN
  },
  TRANSITION_DURATION = 400,
  HEIGHT = 1000 - MARGIN.TOP - MARGIN.BOTTOM,
  // WIDTH = 960 - MARGIN.LEFT - MARGIN.RIGHT,
  WIDTH = 1500 - MARGIN.LEFT - MARGIN.RIGHT,
  LAYOUT_INTERATIONS = 32,
  REFRESH_INTERVAL = 7000,


  IS_COLORS_STOCK = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"];



var formatNumber = function (d) {
  var numberFormat = d3.format(",.0f"); // zero decimal places
  return "£" + numberFormat(d);
},

formatFlow = function (d) {
  var flowFormat = d3.format(",.0f"); // zero decimal places with sign
  return "£" + flowFormat(Math.abs(d)) + (d < 0 ? " CR" : " DR");
},

// Used when temporarily disabling user interractions to allow animations to complete
disableUserInterractions = function (time) {
  isTransitioning = true;
  setTimeout(function(){
    isTransitioning = false;
  }, time);
},

hideTooltip = function () {
  return tooltip.transition()
    .duration(TRANSITION_DURATION)
    .style("opacity", 0);
},

showTooltip = function () {
  return tooltip
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY + 15 + "px")
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 1);
};

function showHideChildren(node) {
  disableUserInterractions(2 * TRANSITION_DURATION);
  hideTooltip();
  if (node.state === "collapsed") { expand(node); }
  else { collapse(node); }

  biHiSankey.relayout();
  update();
  link.attr("d", path);
  restoreLinksAndNodes();
}


colorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_COLORS),
highlightColorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_HIGHLIGHT_COLORS),
typeColorScale = d3.scale.ordinal().domain(LINK_TYPES).range(LINK_TYPES_COLORS),
strokeColorScale = d3.scale.ordinal().domain(STROKE_TYPES).range(STROKE_TYPES_COLORS),

svg = d3.select("#chart").append("svg")
        .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
        .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
      .append("g")
        .attr("transform", "translate(" + MARGIN.LEFT + "," + MARGIN.TOP + ")");

svg.append("g").attr("id", "links");
svg.append("g").attr("id", "nodes");
svg.append("g").attr("id", "collapsers");
svg.append("g").attr("id", "legend");

tooltip = d3.select("#chart").append("div").attr("id", "tooltip");

tooltip.style("opacity", 0)
    .append("p")
      .attr("class", "value");



defs = svg.append("defs");

defs.append("marker")
  .style("fill", LINK_COLOR)
  .attr("id", "arrowVerticalHead")
  .attr("viewBox", "0 0 6 10")
  .attr("refX", "1")
  .attr("refY", "5")
  .attr("markerUnits", "strokeWidth")
  .attr("markerWidth", "1")
  .attr("markerHeight", "1")
  .attr("orient", 270)
  .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

defs.append("marker")
  .style("fill", LINK_COLOR)
  .attr("id", "arrowHorizontalHead")
  .attr("viewBox", "0 0 6 10")
  .attr("refX", "1")
  .attr("refY", "5")
  .attr("markerUnits", "strokeWidth")
  .attr("markerWidth", "1")
  .attr("markerHeight", "1")
  .attr("orient", "auto")
  .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

defs.append("marker")
  .style("fill", OUTFLOW_COLOR)
  .attr("id", "arrowHeadInflow")
  .attr("viewBox", "0 0 6 10")
  .attr("refX", "1")
  .attr("refY", "5")
  .attr("markerUnits", "strokeWidth")
  .attr("markerWidth", "1")
  .attr("markerHeight", "1")
  .attr("orient", "auto")
  .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");

defs.append("marker")
  .style("fill", INFLOW_COLOR)
  .attr("id", "arrowHeadOutflow")
  .attr("viewBox", "0 0 6 10")
  .attr("refX", "1")
  .attr("refY", "5")
  .attr("markerUnits", "strokeWidth")
  .attr("markerWidth", "1")
  .attr("markerHeight", "1")
  .attr("orient", "auto")
  .append("path")
    .attr("d", "M 0 0 L 1 0 L 6 5 L 1 10 L 0 10 z");


// function highlightConnected(g) {
//   link.filter(function (d) { return d.source === g; })
//     .style("marker-end", function () { return 'url(#arrowHeadInflow)'; })
//     .style("stroke", OUTFLOW_COLOR)
//     .style("opacity", OPACITY.LINK_DEFAULT);

//   link.filter(function (d) { return d.target === g; })
//     .style("marker-end", function () { return 'url(#arrowHeadOutlow)'; })
//     .style("stroke", INFLOW_COLOR)
//     .style("opacity", OPACITY.LINK_DEFAULT);
// }

// function fadeUnconnected(g) {
//   link.filter(function (d) { return d.source !== g && d.target !== g; })
//     .style("marker-end", function () { return 'url(#arrowHead)'; })
//     .transition()
//       .duration(TRANSITION_DURATION)
//       .style("opacity", OPACITY.LINK_FADED);

//   node.filter(function (d) {
//     return (d.name === g.name) ? false : !biHiSankey.connected(d, g);
//   }).transition()
//     .duration(TRANSITION_DURATION)
//     .style("opacity", OPACITY.NODE_FADED);
// }

function updateAppView () {
  var link, linkEnter, node, nodeEnter, collapser, collapserEnter, legend;
  function dragmove(node) {
    node.x = Math.max(0, Math.min(WIDTH - node.width, d3.event.x));
    node.y = Math.max(0, Math.min(HEIGHT - node.height, d3.event.y));
    d3.select(this).attr("transform", "translate(" + node.x + "," + node.y + ")");
    biHiSankey.relayout();
    svg.selectAll(".node").selectAll("rect").attr("height", function (d) { return d.height; });
    link.attr("d", path);
  }

  function containChildren(node) {
      node.children.forEach(function (child) {
        child.state = "contained";
        child.parent = this;
        child._parent = null;
        containChildren(child);
      }, node);
  }

  function expand(node) {
    node.state = "expanded";
    node.children.forEach(function (child) {
      child.state = "collapsed";
      child._parent = this;
      child.parent = null;
      containChildren(child);
    }, node);
  }

  function collapse(node) {
    node.state = "collapsed";
    containChildren(node);
  }

  function restoreLinksAndNodes() {
    link
      .style("stroke", function (d){return typeColorScale(d.type);})
      .style("marker-end", function (d) { if ( d.source == "variable"){ return 'url(#arrowVerticalHead)';} else { return 'url(#arrowHorizontalHead)';} }) //return 'url(#arrowHead)'; })
      .transition()
        .duration(TRANSITION_DURATION)
        .style("opacity", OPACITY.LINK_DEFAULT);

    node.filter(function (d){ if ( d.type === "variable" ){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale(d.type.replace(/ .*/, ""));
        return d.color;
      })
      .style("stroke", function (d) {
        return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT);

    node.filter(function (d){ if (d.type === "informationsystem"){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        //d.color = colorScale(d.type.replace(/ .*/, ""));
        d.color = isColorScale(d.name);
        return d.color;
      })
      // .style("stroke", function (d) {
      //   return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
      // })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)
      .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT);
    }

  function computePolygonCoordonates(radius){
    // Function to be called inside function to draw polygon (svg)
    // Returns hexagone local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";
    // corners.push([node.x - radius / 2, node.y - radius]);
    // corners.push([ node.x + radius / 2, node.y - radius]);
    // corners.push([ node.x + radius, node.y ]);
    // corners.push([ node.x + radius / 2, node.y + radius]);
    // corners.push([ node.x - radius / 2, node.y + radius]);
    // corners.push([ node.x - radius, node.y]);

    corners.push([ - radius / 2, - radius]);
    corners.push([ radius / 2, - radius]);
    corners.push([ radius, 0 ]);
    corners.push([ radius / 2, radius]);
    corners.push([ - radius / 2,  radius]);
    corners.push([ - radius, 0]);
    
    for (var i = 0; i != 5; i++){
      cornersString =  cornersString + corners[i][0].toString() + "," + corners[i][1].toString() + ", "
    }
    cornersString = cornersString + corners[5][0].toString() + "," + corners[5][1].toString();
    return cornersString;
  }


  link = svg.select("#links").selectAll("path.link")
    .data(biHiSankey.visibleLinks(), function (d) { return d.id; });

  link.transition()
    .duration(TRANSITION_DURATION)
    .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
    .attr("d", path)
    .style("opacity", OPACITY.LINK_DEFAULT);


  link.exit().remove();


  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return typeColorScale(d.type);});

  // linkEnter.on('mouseenter', function (d) {
  //   if (!isTransitioning) {
  //     showTooltip().select(".value").text(function () {
  //       if (d.direction > 0) {
  //         return d.source.name + " → " + d.target.name + "\n" + formatNumber(d.value);
  //       }
  //       return d.target.name + " ← " + d.source.name + "\n" + formatNumber(d.value);
  //     });

  //     d3.select(this)
  //       .style("stroke", function (d){return typeColorScale(d.type);})
  //       .transition()
  //         .duration(TRANSITION_DURATION / 2)
  //         .style("opacity", OPACITY.LINK_HIGHLIGHT);
  //   }
  // });

  // linkEnter.on('mouseleave', function () {
  //   if (!isTransitioning) {
  //     hideTooltip();

  //     d3.select(this)
  //       .style("stroke", function (d){return typeColorScale(d.type);})
  //       .transition()
  //         .duration(TRANSITION_DURATION / 2)
  //         .style("opacity", OPACITY.LINK_DEFAULT);
  //   }
  // });

  // To include link type dependancy for arrowhead : marker-head
  linkEnter.sort(function (a, b) { return b.thickness - a.thickness; })
    .classed("leftToRight", function (d) {
      return d.direction > 0;
    })
    .classed("rightToLeft", function (d) {
      return d.direction < 0;
    })
    .style("marker-end", function (d) {
      // return 'url(#arrowHead)';
      if (d.source.type == "variable"){
        return 'url(#arrowVerticalHead)';
      } 
      else{
        return 'url(#arrowHorizontalHead)';
      }
    })
    //.style("stroke", LINK_COLOR)
    .style("stroke", function (d){return typeColorScale(d.type);})
    .style("opacity", 0)
    .transition()
      .delay(TRANSITION_DURATION)
      .duration(TRANSITION_DURATION)
      .attr("d", path)
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("opacity", OPACITY.LINK_DEFAULT);

  node = svg.select("#nodes").selectAll(".node")
      .data(biHiSankey.collapsedNodes(), function (d) { return d.id; });
  // nodesByXPosition.forEach(function (nodes) {
  //   nodes.forEach(function (node, i) {
  //     node.y = i;
  //     node.heightAllowance = node.value * yScaleFactor + linkSpacing * node.linkSpaceCount;
  //   });
  // });
  // node.forEach(function (nodes) {
  //       nodes.forEach(function (node, i) {
  //         node.y = i;
  //         node.heightAllowance = node.value * yScaleFactor + linkSpacing * node.linkSpaceCount;
  //       });
  //     });


  node.transition()
    .duration(TRANSITION_DURATION)
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .style("opacity", OPACITY.NODE_DEFAULT)
    .select("rect")
      .style("fill", function (d) {
        d.color = colorScale(d.type.replace(/ .*/, ""));
        return d.color;
      })
      .style("stroke", function (d) { return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1); })
      .style("stroke-WIDTH", "1px")
      .attr("height", function (d) { return NODE_HEIGHT; })
      .attr("width", biHiSankey.nodeWidth());


  node.exit()
    .transition()
      .duration(TRANSITION_DURATION)
      .attr("transform", function (d) {
        var collapsedAncestor, endX, endY;
        collapsedAncestor = d.ancestors.filter(function (a) {
          return a.state === "collapsed";
        })[0];
        endX = collapsedAncestor ? collapsedAncestor.x : d.x;
        endY = collapsedAncestor ? collapsedAncestor.y : d.y;
        return "translate(" + endX + "," + endY + ")";
      })
      .remove();

  nodeEnter = node.enter().append("g").attr("class", "node");
  nodeEnter
    .attr("transform", function (d) {
      var startX = d._parent ? d._parent.x : d.x,
          startY = d._parent ? d._parent.y : d.y;
      return "translate(" + startX + "," + startY + ")";
    })
    .style("opacity", 1e-6)
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", OPACITY.NODE_DEFAULT)
      .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeEnter.append("text");

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Version 2 where variables are appended a circle and information systems are appended a rectangle
  function threeStepFunction(value, listValues){
    if ( value == 0){
      return 1;
    }
    if ( ( 1 <= value ) && ( value < listValues.length - 1) ) {
      return 2;
    }
    if ( value == listValues.length - 1){
      return 3;
    }
  }

  function eliminateStepStringError(etapeString){
    if (etapeString == "Agrégation"){
      return "Agregation";
    }
    return etapeString;
  }

  var nodeInformationSystem = node.filter(function (d){ return d.type === "informationsystem";});
  var nodeVariable = node.filter(function (d){ return d.type === "variable";});
  nodeInformationSystem.append("rect")
    .style("fill", function (d) {
    d.color = isColorScale( d.name ); // different colors for apps and variables
    return d.color;
    })
    .style("stroke", function (d) {
    // var strokeIndex = threeStepFunction(informationSystems.indexOf(d.name), informationSystems); return d3.rgb(strokeColorScale(strokeIndex)).darker(0.1);
    var etape = eliminateStepStringError(d.etape); return d3.rgb(strokeColorScale(etape)).darker(0.1); 
    }) // stroke color : depending on the position of the information system in the list
    .style("stroke-WIDTH", "3px")
    .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT)
    //.attr("width", biHiSankey.nodeWidth());
    .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)

  var nodeVariableCalculated = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});
  var nodeVariableElementary = node.filter(function (d){ return ( ( d.type === "variable" ) && ( ! d.iscalculated ) ) ;});
  nodeVariableCalculated.append("circle")
    .style("fill", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
    .attr("r", NODE_HEIGHT / 2);

  nodeVariableElementary.append("polygon")       // attach a polygon
    .style("stroke", "black")  // colour the line
    .style("stroke-WIDTH", "1px")
    .style("fill",  function (d){d.color = isColorScale(d.informationsystem); return d.color;})
    //.style("fill", function (d){d.color = colorScale(d.type.replace(/ .*/, "")); return d.color;})     // remove any fill colour
    .attr("points", function (d){  return computePolygonCoordonates(NODE_HEIGHT/2); } );  // x,y points 

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  
  node.on("mouseenter", function (g) {
    if (!isTransitioning) {
      // highlightConnected(g);
      restoreLinksAndNodes();
      // fadeUnconnected(g);

      // d3.select(this).select("rect")
      //   .style("fill", function (d) {
      //     // d.color = d.netFlow > 0 ? INFLOW_COLOR : OUTFLOW_COLOR;

      //     return d.color;
      //   })
      //   .style("stroke", function (d) {
      //     return d3.rgb(d.color).darker(0.1);
      //   })
      //   .style("fill-opacity", OPACITY.LINK_DEFAULT);

      tooltip
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          });
    }
  });


  // Mouse enter event used for information system and variable viz
  node.on("mouseenter", function (g) {
    if (!isTransitioning) {
      // highlightConnected(g);
      restoreLinksAndNodes();
      // fadeUnconnected(g);
      // if (g.iscalculated == false){
      // d3.select(this).select("polygon")
      //   .style("fill", function (d) {
      //     d.color = d.netFlow > 0 ? INFLOW_COLOR : OUTFLOW_COLOR;
      //     return d.color;
      //   })
      //   .style("stroke", function (d) {
      //     return d3.rgb(d.color).darker(0.1);
      //   })
      //   .style("fill-opacity", OPACITY.LINK_DEFAULT);
      // }

      // else{
      // d3.select(this).select("circle")
      //   .style("fill", function (d) {
      //     d.color = d.netFlow > 0 ? INFLOW_COLOR : OUTFLOW_COLOR;
      //     return d.color;
      //   })
      //   .style("stroke", function (d) {
      //     return d3.rgb(d.color).darker(0.1);
      //   })
      //   .style("fill-opacity", OPACITY.LINK_DEFAULT);
      // } 

      tooltip
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          });
    }
  });

  node.on("mouseleave", function () {
    if (!isTransitioning) {
      hideTooltip();
      restoreLinksAndNodes();
    }
  });

  node.filter(function (d) { return d.children.length; })
    .on("dblclick", showHideChildren);

  // allow nodes to be dragged to new positions
  node.call(d3.behavior.drag()
    .origin(function (d) { return d; })
    .on("dragstart", function () { this.parentNode.appendChild(this); })
    .on("drag", dragmove));

  // add in the text for the nodes
  // node.filter(function (d) { return d.value !== 0; })
  //   .select("text")
  //     .attr("x", function (d) {return d.width;} )
  //     .attr("y", function (d) { return d.height; })
  //     .attr("dy", ".35em")
  //     .attr("text-anchor", "end")
  //     .attr("transform", null)
  //     .text(function (d) { return d.name; })
  //   .filter(function (d) { return d.x < WIDTH / 2; })
  //     .attr("x", 6 + biHiSankey.nodeWidth())
  //     .attr("text-anchor", "start");

  nodeInformationSystem.select("text")
    .attr("x", function (d) {return d.width;})
    .attr("y", function (d) {return -10;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  nodeVariable.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });


  // node.filter(function (d) {return d.type == "informationsystem";})
  //     .attr("name", function (d){debugger; return 0;})
  //     .select("rect")
  //     .attr("y", function (d) {return 0;});
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Legend - to be included in a collapser ?!
  // var legendData = [{"id" : 1, "type" : "elementaryVariable", "x" : 400, "y" : 800}];
  // legend = svg.select("#legend").selectAll(".legend").data(legendData, function (l) { return l.id; }); // intermediate
  // var legendEnter = legend.enter().append("g")
  //                     .attr("class", "legend")
  //                     .attr("transform", function (d){var startX = d.x, startY = d.y; return "translate(" + startX + "," + startY + ")";})

  // var legendElementaryVariables = legend.filter(function (l) { return ( l.type == "elementaryVariable" );});
  // var legendCalculatedVariables = legend.filter(function (l){ return ( l.type == "calculatedVariable" );});
  // var legendCollectInformationSystems = legend.filter(function (l){ return (l.type == "collectIS");});
  // var legendAgregationInformationSystems = legend.filter(function (l){ return (l.type == "agregationIS");});
  // var legendRestitutionInformationSystems = legend.filter(function (l){ return (l.type == "restitutionIS");});
  // // var legendLinkAutomatic = legend.filter( function (l) { return l.type == "automaticlink"});
  // // var legendLinkSemiAutomatic = legend.filter( function (l) { return l.type == "semiautomatic"})
  // // 1 - Elementary variables
  // legendElementaryVariables.append("polygon") 
  //   .style("stroke", "black")  // colour the line
  //   .style("stroke-WIDTH", "2px")
  //   .style("fill", "#FFFFFF")
  //   .attr("points", function (l){  return computePolygonCoordonates(NODE_HEIGHT/2); } );  // x,y points 

  // // 2 - Calculated variables
  // legendCalculatedVariables.append("circle")
  //   .style("stroke", "black")
  //   .style("stroke-WIDTH", "2px")
  //   .attr("fill", " #FFFFFF")
  //   .attr("r", NODE_WIDTH/2)

  // // 3 - Information systems
  // legendCollectInformationSystems.append("rect")
  //   .style("stroke", strokeColorScale(2))
  //   .style("stroke-WIDTH", "2px")
  //   .attr("fill", "#FFFFFF")
  //   .attr("width", NODE_WIDTH)
  //   .attr("height", NODE_WIDTH/2)

  // legendAgregationInformationSystems.append("rect")
  //   .style("stroke", strokeColorScale(2))
  //   .style("stroke-WIDTH", "2px")
  //   .attr("fill", "#FFFFFF")
  //   .attr("width", NODE_WIDTH)
  //   .attr("height", NODE_WIDTH/2)

  // legendRestitutionInformationSystems.append("rect")
  //   .style("stroke", strokeColorScale(3))
  //   .style("stroke-WIDTH", "2px")
  //   .attr("fill", "#FFFFFF")
  //   .attr("width", NODE_WIDTH)
  //   .attr("height", NODE_WIDTH/2)


  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}

function launchDataVizModuleForAppView() {

  var vizData = { WIDTH : 1000, nbMaximumNodes : 1000, defaultWidth : 85, defaultHeight : 60};
  var NodesCharacteristics = applicativeViewTransform(NodesAndLinks[0], NodesAndLinks[1], vizData);
  var IS_COLORS = [];
  var IS_NUMBERS = []; 
  var legendData = NodesCharacteristics[2];
  for (var i = 0; i < vizData.informationSystems.length; i++){ IS_NUMBERS.push(i+1); IS_COLORS.push(IS_COLORS_STOCK[i]);}; 
  isColorScale = d3.scale.ordinal().domain(vizData.informationSystems).range(IS_COLORS);
  biHiSankey = d3.Sankey_AppView();
  // Set the biHiSankey diagram properties
  biHiSankey
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(10)
    .linkSpacing(4)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT]);

  path = biHiSankey.link().curvature(0.45);
  biHiSankey
    .nodes(NodesCharacteristics[0])
    .links(NodesCharacteristics[1])
    //.nodes([{"Application" : "Picasso", "name": "First node", "type" : "Elémentaire", "id" : "1", "originid" : "1"}, {"Application" : "Fermat", "name": "Second node", "type" : "Calculée", "id" : "2", "originid" : "2"}, {"Application" : "Fermat", "name": "Third node", "type": "Calculée", "id" : "3", "originid" : "3"}])
    //.links([{"source": "1", "target": "2", "value": "1", "type": "type1"}, {"source": "2", "target" : "3", "value" : "1", "type": "type2"}])
    .initializeNodes(function (node) {
      node.state = node.parent ? "contained" : "collapsed";
    }) // initializeNodes calling 6 functions, generating temporary variables used for display 
    .layout(LAYOUT_INTERATIONS); // layout calls 6 functions, including one which computing default x and y positions.
  disableUserInterractions(2 * TRANSITION_DURATION);
  updateAppView();
}




/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Path view

function updatePathView(){

  function dragmove(node) {
    node.x = Math.max(0, Math.min(WIDTH - node.width, d3.event.x));
    node.y = Math.max(0, Math.min(HEIGHT - node.height, d3.event.y));
    d3.select(this).attr("transform", "translate(" + node.x + "," + node.y + ")");
    biHiSankey.relayout();
    svg.selectAll(".node").selectAll("rect").attr("height", function (d) { return d.height; });
    link.attr("d", path);
  }

  function containChildren(node) {
      node.children.forEach(function (child) {
        child.state = "contained";
        child.parent = this;
        child._parent = null;
        containChildren(child);
      }, node);
  }

  function expand(node) {
    node.state = "expanded";
    node.children.forEach(function (child) {
      child.state = "collapsed";
      child._parent = this;
      child.parent = null;
      containChildren(child);
    }, node);
  }

  function collapse(node) {
    node.state = "collapsed";
    containChildren(node);
  }

  function restoreLinksAndNodes() {
    link
      .style("stroke", function (d){return typeColorScale(d.type);})
      .style("marker-end", function (d) { if ( d.source == "variable"){ return 'url(#arrowVerticalHead)';} else { return 'url(#arrowHorizontalHead)';} }) //return 'url(#arrowHead)'; })
      .transition()
        .duration(TRANSITION_DURATION)
        .style("opacity", OPACITY.LINK_DEFAULT);

    node.filter(function (d){ if ( d.type === "variable" ){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale(d.type.replace(/ .*/, ""));
        return d.color;
      })
      .style("stroke", function (d) {
        return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT);

    node.filter(function (d){ if (d.type === "informationsystem"){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        //d.color = colorScale(d.type.replace(/ .*/, ""));
        d.color = isColorScale(d.name);
        return d.color;
      })
      // .style("stroke", function (d) {
      //   return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1);
      // })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)
      .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT);
  }

  function computePolygonCoordonates(radius){
    // Function to be called inside function to draw polygon (svg)
    // Returns hexagone local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";
    // corners.push([node.x - radius / 2, node.y - radius]);
    // corners.push([ node.x + radius / 2, node.y - radius]);
    // corners.push([ node.x + radius, node.y ]);
    // corners.push([ node.x + radius / 2, node.y + radius]);
    // corners.push([ node.x - radius / 2, node.y + radius]);
    // corners.push([ node.x - radius, node.y]);

    corners.push([ - radius / 2, - radius]);
    corners.push([ radius / 2, - radius]);
    corners.push([ radius, 0 ]);
    corners.push([ radius / 2, radius]);
    corners.push([ - radius / 2,  radius]);
    corners.push([ - radius, 0]);
    
    for (var i = 0; i != 5; i++){
      cornersString =  cornersString + corners[i][0].toString() + "," + corners[i][1].toString() + ", "
    }
    cornersString = cornersString + corners[5][0].toString() + "," + corners[5][1].toString();
    return cornersString;
  }

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Nodes
  var node, nodeEnter;
  node = svg.select("#nodes").selectAll(".node")
      .data(biHiSankey.collapsedNodes(), function (d) { return d.id; });

  node.transition()
    .duration(TRANSITION_DURATION)
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; })
    .style("opacity", OPACITY.NODE_DEFAULT)
    .select("rect")
      .style("fill", function (d) {
        d.color = colorScale(d.type.replace(/ .*/, ""));
        return d.color;
      })
      .style("stroke", function (d) { return d3.rgb(colorScale(d.type.replace(/ .*/, ""))).darker(0.1); })
      .style("stroke-WIDTH", "1px")
      .attr("height", function (d) { return NODE_HEIGHT; })
      .attr("width", biHiSankey.nodeWidth());


  node.exit()
    .transition()
      .duration(TRANSITION_DURATION)
      .attr("transform", function (d) {
        var collapsedAncestor, endX, endY;
        collapsedAncestor = d.ancestors.filter(function (a) {
          return a.state === "collapsed";
        })[0];
        endX = collapsedAncestor ? collapsedAncestor.x : d.x;
        endY = collapsedAncestor ? collapsedAncestor.y : d.y;
        return "translate(" + endX + "," + endY + ")";
      })
      .remove();

  nodeEnter = node.enter().append("g").attr("class", "node");
  nodeEnter
    .attr("transform", function (d) {
      var startX = d._parent ? d._parent.x : d.x,
          startY = d._parent ? d._parent.y : d.y;
      return "translate(" + startX + "," + startY + ")";
    })
    .style("opacity", 1e-6)
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", OPACITY.NODE_DEFAULT)
      .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeEnter.append("text");

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Version 2 where variables are appended a circle and information systems are appended a rectangle
  function threeStepFunction(value, listValues){
    if ( value == 0){
      return 1;
    }
    if ( ( 1 <= value ) && ( value < listValues.length - 1) ) {
      return 2;
    }
    if ( value == listValues.length - 1){
      return 3;
    }
  }

  var nodeVariable = node.filter(function (d){ return d.type === "variable";});
  var nodeVariableCalculated = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});
  var nodeVariableElementary = node.filter(function (d){ return ( ( d.type === "variable" ) && ( ! d.iscalculated ) ) ;});
  nodeVariableCalculated.append("circle")
    .style("fill", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
    .attr("r", NODE_HEIGHT / 2);

  nodeVariableElementary.append("polygon")       // attach a polygon
    .style("stroke", "black")  // colour the line
    .style("stroke-WIDTH", "1px")
    .style("fill",  function (d){ d.color = isColorScale(d.informationsystem); return d.color;})
    //.style("fill", function (d){d.color = colorScale(d.type.replace(/ .*/, "")); return d.color;})     // remove any fill colour
    .attr("points", function (d){  return computePolygonCoordonates(NODE_HEIGHT/2); } );  // x,y points 
  
  node.on("mouseenter", function (g) {
    if (!isTransitioning) {
      // highlightConnected(g);
      restoreLinksAndNodes();
      tooltip
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          });
    }
  });


  // Mouse enter event used for information system and variable viz
  node.on("mouseenter", function (g) {
    if (!isTransitioning) {
      // highlightConnected(g);
      restoreLinksAndNodes();
      tooltip
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          });
    }
  });

  node.on("mouseleave", function () {
    if (!isTransitioning) {
      hideTooltip();
      restoreLinksAndNodes();
    }
  });

  node.filter(function (d) { return d.children.length; })
    .on("dblclick", showHideChildren);

  // allow nodes to be dragged to new positions
  node.call(d3.behavior.drag()
    .origin(function (d) { return d; })
    .on("dragstart", function () { this.parentNode.appendChild(this); })
    .on("drag", dragmove));

  nodeVariable.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Links
  var link, linkEnter;

  link = svg.select("#links").selectAll("path.link")
    .data(biHiSankey.visibleLinks(), function (d) { return d.id; });
  link.transition()
    .duration(TRANSITION_DURATION)
    .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
    .attr("d", path)
    .style("opacity", OPACITY.LINK_DEFAULT);

  link.exit().remove();

  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return typeColorScale(d.type);});

  // linkEnter.on('mouseenter', function (d) {
  //   if (!isTransitioning) {
  //     showTooltip().select(".value").text(function () {
  //       if (d.direction > 0) {
  //         return d.source.name + " → " + d.target.name + "\n" + formatNumber(d.value);
  //       }
  //       return d.target.name + " ← " + d.source.name + "\n" + formatNumber(d.value);
  //     });

  //     d3.select(this)
  //       .style("stroke", function (d){return typeColorScale(d.type);})
  //       .transition()
  //         .duration(TRANSITION_DURATION / 2)
  //         .style("opacity", OPACITY.LINK_HIGHLIGHT);
  //   }
  // });

  // linkEnter.on('mouseleave', function () {
  //   if (!isTransitioning) {
  //     hideTooltip();

  //     d3.select(this)
  //       .style("stroke", function (d){return typeColorScale(d.type);})
  //       .transition()
  //         .duration(TRANSITION_DURATION / 2)
  //         .style("opacity", OPACITY.LINK_DEFAULT);
  //   }
  // });

  // To include link type dependancy for arrowhead : marker-head
  linkEnter.sort(function (a, b) { return b.thickness - a.thickness; })
    .classed("leftToRight", function (d) {
      return d.direction > 0;
    })
    .classed("rightToLeft", function (d) {
      return d.direction < 0;
    })
    .style("marker-end", function (d) {
      // return 'url(#arrowHead)';
      if (d.source.type == "variable"){
        return 'url(#arrowVerticalHead)';
      } 
      else{
        return 'url(#arrowHorizontalHead)';
      }
    })
    //.style("stroke", LINK_COLOR)
    .style("stroke", function (d){return typeColorScale(d.type);})
    .style("opacity", 0)
    .transition()
      .delay(TRANSITION_DURATION)
      .duration(TRANSITION_DURATION)
      .attr("d", path)
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("opacity", OPACITY.LINK_DEFAULT);

}


function launchDataVizModuleForPathView() {
  var vizData = {'nbMaximumNodes' : 1000, 'defaultWidth' : 85, 'defaultHeight' : 60};
  var NodesCharacteristics = pathViewTransform(NodesAndLinks[0], NodesAndLinks[1], vizData);
  var IS_COLORS = [];
  var IS_NUMBERS = []; 
  //var legendData = NodesCharacteristics[2];
  biHiSankey.informationSystems(vizData.informationSystems);
  for (var i = 0; i < informationSystems.length; i++){ IS_NUMBERS.push(i+1); IS_COLORS.push(IS_COLORS_STOCK[i]);}; 
  isColorScale = d3.scale.ordinal().domain(informationSystems).range(IS_COLORS);
  biHiSankey = d3.Sankey_PathView();
  // Set the biHiSankey diagram properties
  biHiSankey
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(10)
    .linkSpacing(4)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT]);

  path = biHiSankey.link().curvature(0.45);
  biHiSankey
    .nodes(NodesCharacteristics[0])
    .links(NodesCharacteristics[1])
    //.nodes([{"Application" : "Picasso", "name": "First node", "type" : "Elémentaire", "id" : "1", "originid" : "1"}, {"Application" : "Fermat", "name": "Second node", "type" : "Calculée", "id" : "2", "originid" : "2"}, {"Application" : "Fermat", "name": "Third node", "type": "Calculée", "id" : "3", "originid" : "3"}])
    //.links([{"source": "1", "target": "2", "value": "1", "type": "type1"}, {"source": "2", "target" : "3", "value" : "1", "type": "type2"}])
    .initializeNodes(function (node) {
      node.state = node.parent ? "contained" : "collapsed";
    }) // initializeNodes calling 6 functions, generating temporary variables used for display 
    .layout(LAYOUT_INTERATIONS); // layout calls 6 functions, including one which computing default x and y positions.
  // debugger;
  disableUserInterractions(2 * TRANSITION_DURATION);
  updatePathView();
}