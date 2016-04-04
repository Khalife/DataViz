'use strict';

var svgAppView, svgPathView, tooltipAppView, tooltipPathView, biHiSankeyAppView, biHiSankeyPathView, pathAppView, pathPathView, defs, colorScale, highlightColorScale, typeColorScale, isColorScale, strokeColorScale, isTransitioning;

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
  NODE_WIDTH = 12,
  NODE_HEIGHT = 27,
  NODE_INFORMATIONSYSTEM_WIDTH = 80,
  NODE_INFORMATIONSYSTEM_HEIGHT = 40,
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
  HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM,
  // WIDTH = 960 - MARGIN.LEFT - MARGIN.RIGHT,
  WIDTH = 1100 - MARGIN.LEFT - MARGIN.RIGHT,
  LAYOUT_INTERATIONS = 32,
  REFRESH_INTERVAL = 7000,


  //IS_COLORS_STOCK = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"];
  IS_COLORS_STOCK = ["#1C86EE", "#6C7B8B", "#CAAECE", "#A751D2", "#571E74", "#E2006A", "#e5c494"];



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

hideAppTooltip = function () {
  return tooltipAppView.transition()
    .duration(TRANSITION_DURATION)
    .style("opacity", 0);
},

showAppTooltip = function () {
  return tooltipAppView
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY + 15 + "px")
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 1);
};

function showHideAppChildren(node) {
  disableUserInterractions(2 * TRANSITION_DURATION);
  hideAppTooltip();
  if (node.state === "collapsed") { expand(node); }
  else { collapse(node); }

  biHiSankeyAppView.relayout();
  updateAppView();
  link.attr("d", pathAppView);
  restoreLinksAndNodes();
}

function showHidePathChildren(node){
  disableUserInterractions(2 * TRANSITION_DURATION);
  hidePathTooltip();
  if (node.state === "collapsed") { expand(node);}
  else { collapse(node); }

  biHiSankeyPathView.relayout();
  updatePathView();
  link.attr("d", pathAppView);
  restoreLinksAndNodes();
}



colorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_COLORS),
highlightColorScale = d3.scale.ordinal().domain(TYPES).range(TYPE_HIGHLIGHT_COLORS),
typeColorScale = d3.scale.ordinal().domain(LINK_TYPES).range(LINK_TYPES_COLORS),
strokeColorScale = d3.scale.ordinal().domain(STROKE_TYPES).range(STROKE_TYPES_COLORS),

svgAppView = d3.select("#chart-applicative").append("svg")
        .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
        .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
        .append("g")
        .attr("transform", "translate(" + MARGIN.LEFT + "," + MARGIN.TOP + ")");

svgAppView.append("g").attr("id", "links");
svgAppView.append("g").attr("id", "nodes");
svgAppView.append("g").attr("id", "collapsers");
svgAppView.append("g").attr("id", "legend");

tooltipAppView = d3.select("#chart-applicative").append("div").attr("id", "tooltipAppView");

tooltipAppView.style("opacity", 0)
    .append("p")
      .attr("class", "value");

defs = svgAppView.append("defs");

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

svgPathView = d3.select("#chart-path").append("svg")
        .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
        .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM)
        .append("g")
        .attr("transform", "translate(" + MARGIN.LEFT + "," + MARGIN.TOP + ")");

svgPathView.append("g").attr("id", "links");
svgPathView.append("g").attr("id", "nodes");
svgPathView.append("g").attr("id", "collapsers");
svgPathView.append("g").attr("id", "legend");

tooltipPathView = d3.select("#chart-path").append("div").attr("id", "tooltipPathView");

tooltipAppView.style("opacity", 0)
    .append("p")
      .attr("class", "value");

defs = svgPathView.append("defs");

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
    biHiSankeyAppView.relayout();
    svgAppView.selectAll(".node").selectAll("rect").attr("height", function (d) { return d.height; });
    link.attr("d", pathAppView);
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


  link = svgAppView.select("#links").selectAll("path.link")
    .data(biHiSankeyAppView.visibleLinks(), function (d) { return d.id; });

  link.transition()
    .duration(TRANSITION_DURATION)
    .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
    .attr("d", pathAppView)
    .style("opacity", OPACITY.LINK_DEFAULT);


  link.exit().remove();


  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return "white";/*typeColorScale(d.type);*/});

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
      .attr("d", pathAppView)
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("stroke-dasharray", function (d) { return (d.dash || ""); })
      .style("opacity", OPACITY.LINK_DEFAULT);

  node = svgAppView.select("#nodes").selectAll(".node")
      .data(biHiSankeyAppView.collapsedNodes(), function (d) { return d.id; });
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
      .attr("width", biHiSankeyAppView.nodeWidth());


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
    var etape = eliminateStepStringError(d.etape); return d3.rgb(strokeColorScale(etape)); 
    }) // stroke color : depending on the position of the information system in the list
    .style("stroke-WIDTH", "3px")
    .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT)
    //.attr("width", biHiSankeyAppView.nodeWidth());
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
  
  // node.on("mouseenter", function (g) {
  //   if (!isTransitioning) {
  //     // highlightConnected(g);
  //     restoreLinksAndNodes();
  //     // fadeUnconnected(g);

  //     // d3.select(this).select("rect")
  //     //   .style("fill", function (d) {
  //     //     // d.color = d.netFlow > 0 ? INFLOW_COLOR : OUTFLOW_COLOR;

  //     //     return d.color;
  //     //   })
  //     //   .style("stroke", function (d) {
  //     //     return d3.rgb(d.color).darker(0.1);
  //     //   })
  //     //   .style("fill-opacity", OPACITY.LINK_DEFAULT);

  //     tooltip
  //       .style("left", g.x + MARGIN.LEFT + "px")
  //       .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
  //       .transition()
  //         .duration(TRANSITION_DURATION)
  //         .style("opacity", 1).select(".value")
  //         .text(function () {
  //           var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
  //           return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
  //         });
  //   }
  // });

  nodeVariableCalculated.on("mouseEnter", function (g){
    if (!isTransitioning){
      restoreLinksAndNodes();
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function (g) {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            // return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
            // return g.informationsystem + "\n" + g.name;
            return "ok";
          });
    }
  });

  nodeVariableElementary.on("mouseEnter", function (g){
    if (!isTransitioning){
      restoreLinksAndNodes();
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function (g) {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            // return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
            // return g.informationsystem + "\n" + g.name;
            return "ok";
          });
    }
  });

  nodeInformationSystem.on("mouseenter", function (g){
    if (!isTransitioning){
      restoreLinksAndNodes();
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            // return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
            return g.equipe + "\n" + g.responsable ;
          });
    }
  });


  node.on("mouseleave", function () {
    if (!isTransitioning) {
      hideAppTooltip();
      restoreLinksAndNodes();
    }
  });

  node.filter(function (d) { return d.children.length; })
    .on("dblclick", showHideAppChildren);

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
  //     .attr("x", 6 + biHiSankeyAppView.nodeWidth())
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
  legend = svgAppView.select("#legend").selectAll(".legend").data(biHiSankeyAppView.legendData(), function (l) { return l.id; }); // intermediate

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

  function computeLinkPolygonCoordonates(radius){
    // Function used to compute polygon coordonates
    // Returns link local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";
    corners.push([ 0, - radius/4]);
    corners.push([ 2*radius, -radius/4]);
    corners.push([ 2*radius + radius/4, 0]);
    corners.push([ 2*radius, radius/4]);
    corners.push([ 0,  radius/4]);
    
    for (var i = 0; i != 4; i++){
      cornersString =  cornersString + corners[i][0].toString() + "," + corners[i][1].toString() + ", "
    }
    cornersString = cornersString + corners[4][0].toString() + "," + corners[4][1].toString();
    return cornersString;
  }

  var legendEnter = legend.enter().append("g")
                      .attr("class", "legend")
                      .attr("transform", function (d){var startX = d.x, startY = d.y; return "translate(" + startX + "," + startY + ")";})

  var legendElementaryVariables = legend.filter(function (l) { return ( l.text == "Variable élémentaire" );});
  var legendCalculatedVariables = legend.filter(function (l){ return ( l.text == "Variable calculée" );});
  var legendCollectInformationSystems = legend.filter(function (l){ return (l.text == "SI de collecte");});
  var legendAgregationInformationSystems = legend.filter(function (l){ return (l.text == "SI d'aggrégation");});
  var legendRestitutionInformationSystems = legend.filter(function (l){ return (l.text == "SI de restitution");});
  var legendVariableISLink = legend.filter(function (l){ return l.text == "Appartenance variable à un SI";});
  var legendAutomaticLink = legend.filter(function (l){ return l.text == "Vérification automatique";});
  var legendSemiAutomaticLink = legend.filter(function (l){ return l.text == "Vérification semi-automatique";});
  var legendManualLink = legend.filter(function (l){ return l.text == "Vérification manuelle"});
  // var legendLinkAutomatic = legend.filter( function (l) { return l.type == "automaticlink"});
  // var legendLinkSemiAutomatic = legend.filter( function (l) { return l.type == "semiautomatic"})
  // 1 - Elementary variables
  legendElementaryVariables.append("polygon") 
    .style("stroke", "black")  // colour the line
    .style("stroke-WIDTH", "2px")
    .style("fill", "#FFFFFF")
    .attr("points", function (l){  return computePolygonCoordonates(NODE_HEIGHT/4); } );  // x,y points 

  legendElementaryVariables.append("text")
    .attr("x", function (d) {return "20px";})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });

  // 2 - Calculated variables
  legendCalculatedVariables.append("circle")
    .style("stroke", "black")
    .style("stroke-WIDTH", "2px")
    .attr("fill", " #FFFFFF")
    .attr("r", NODE_WIDTH/2)

  legendCalculatedVariables.append("text")
    .attr("x", function (d) {return "20px";})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });

  // 3 - Information systems
  legendCollectInformationSystems.append("rect")
    .style("stroke", strokeColorScale(1))
    .style("stroke-WIDTH", "2px")
    .attr("fill", "#FFFFFF")
    .attr("x", function(d) {return "8px";})
    .attr("y", function(d) {return -NODE_WIDTH/2;})
    .attr("width", NODE_HEIGHT/2)
    .attr("height", NODE_WIDTH)

  legendCollectInformationSystems.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });  


  legendAgregationInformationSystems.append("rect")
    .style("stroke", strokeColorScale(2))
    .style("stroke-WIDTH", "2px")
    .attr("fill", "#FFFFFF")
    .attr("x", function(d) {return "8px";})
    .attr("y", function(d) {return -NODE_WIDTH/2;})
    .attr("width", NODE_HEIGHT/2)
    .attr("height", NODE_WIDTH)

  legendAgregationInformationSystems.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });  

  legendRestitutionInformationSystems.append("rect")
    .style("stroke", strokeColorScale(3))
    .style("stroke-WIDTH", "2px")
    .attr("fill", "#FFFFFF")
    .attr("x", function(d) {return "8px";})
    .attr("y", function(d) {return -NODE_WIDTH/2;})
    .attr("width", NODE_HEIGHT/2)
    .attr("height", NODE_WIDTH)

  legendRestitutionInformationSystems.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });  

  legendAutomaticLink.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });

  legendAutomaticLink.append("polygon")
    .style("stroke", "#a6d854")  // colour the line
    .style("stroke-WIDTH", "2px")
    .style("fill", "#a6d854")
    .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 

  legendSemiAutomaticLink.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });

  legendSemiAutomaticLink.append("polygon")
    .style("stroke", "#fc8d62")  // colour the line
    .style("stroke-WIDTH", "2px")
    .style("fill", "#fc8d62")
    .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 

  legendManualLink.append("text")
    .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    .attr("y", function (d) {return 0;})
    .attr("dy", ".35em")
    .attr("text-anchor", "start")
    .attr("transform", null)
    .text(function (d) { return d.text; });

  legendManualLink.append("polygon")
    .style("stroke", "#8da0cb")  // colour the line
    .style("stroke-WIDTH", "2px")
    .style("fill", "#8da0cb")
    .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 



  ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Legend interactivity : highlight concerned elements
  function restoreVariableNode(type){
    var shape;
    if ( type == "Variable élémentaire"){
      nodeVariableElementary.select("polygon")
        .style("stroke", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
        .style("fill", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
    }
    else {
      nodeVariableCalculated.select("circle")
        .style("stroke", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
        .style("fill", function (d){d.color = isColorScale(d.informationsystem); return d.color;})
    }
  }

  function restoreInformationSystems(type){
    // if ( type == )
  }

  legendElementaryVariables.on("mouseenter", function (){
    nodeVariableElementary.select("polygon")
      .attr("fill", "black")
      .style("stroke", "FFFF00")
      .style("stroke-WIDTH", "4px")
  })

  legendCalculatedVariables.on("mouseenter", function (){
    nodeVariableCalculated.select("circle")
      .attr("fill", "black")
      .style("stroke", "FFFF00")
      .style("stroke-WIDTH", "4px")
  })

  legendElementaryVariables.on("mouseleave", function (l){
    restoreVariableNode("Variable élémentaire");
  })

  legendCalculatedVariables.on("mouseleave", function (l){
    restoreVariableNode("Variable calculée");
  })

  // add interactivity to IS


  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
}

function launchDataVizModuleForAppView() {

  var vizData = { WIDTH : 1000, nbMaximumNodes : 1000, defaultWidth : 85, defaultHeight : 60};
  var NodesCharacteristicsForAppView = applicativeViewTransform(NodesAndLinksForAppView[0], NodesAndLinksForAppView[1], vizData);
  var IS_COLORS = [];
  var IS_NUMBERS = []; 
  var legendData = NodesCharacteristicsForAppView[2];
  for (var i = 0; i < vizData.informationSystems.length; i++){ IS_NUMBERS.push(i+1); IS_COLORS.push(IS_COLORS_STOCK[i]);}; 
  isColorScale = d3.scale.ordinal().domain(vizData.informationSystems).range(IS_COLORS);
  biHiSankeyAppView = d3.Sankey_AppView();
  // Set the biHiSankeyAppView diagram properties
  biHiSankeyAppView
    .legendData(legendData)
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(10)
    .linkSpacing(4)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT]);

  pathAppView = biHiSankeyAppView.link().curvature(0.45);
  biHiSankeyAppView
    .nodes(NodesCharacteristicsForAppView[0])
    .links(NodesCharacteristicsForAppView[1])
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
    biHiSankeyPathView.relayout();
    svgPathView.selectAll(".node").selectAll("rect").attr("height", function (d) { return d.height; });
    link.attr("d", pathPathView);
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

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Nodes
  function computePolygonCoordonates(radius){
    // Function to be called inside function to draw polygon (svg)
    // Returns hexagone local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";

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
  var node, nodeEnter;
  node = svgPathView.select("#nodes").selectAll(".node")
      .data(biHiSankeyPathView.collapsedNodes(), function (d) { return d.id; });

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
      .attr("width", biHiSankeyPathView.nodeWidth());


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
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            // return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          
          });
    }
  });

  // Mouse enter event used for information system and variable viz
  node.on("mouseenter", function (g) {
    if (!isTransitioning) {
      // highlightConnected(g);
      restoreLinksAndNodes();
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            // return g.name + "\nNet flow: " + formatFlow(g.netFlow) + additionalInstructions  + " X = " + g.x + " , Y = " + g.y ;
          });
    }
  });

  node.on("mouseleave", function () {
    if (!isTransitioning) {
      hideAppTooltip();
      restoreLinksAndNodes();
    }
  });

  node.filter(function (d) { return d.children.length; })
    .on("dblclick", showHidePathChildren);

  // allow nodes to be dragged to new positions
  node.call(d3.behavior.drag()
    .origin(function (d) { return d; })
    .on("dragstart", function () { this.parentNode.appendChild(this); })
    .on("drag", dragmove));

  nodeVariable.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return NODE_HEIGHT ;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  ///////////////////////////////////////////////////////////////////////////////////////////////////////
  // Links
  var link, linkEnter;
  link = svgPathView.select("#links").selectAll("path.link")
    .data(biHiSankeyPathView.visibleLinks(), function (d) { return d.id; });

  link.exit().remove();

  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return "white"; /*typeColorScale(d.controlquality);*/})
    .style("stroke", function (d){return typeColorScale(d.controlquality);}) // colour the line
    .style("stroke-dasharray", function (d){ return d.dash || "";})

  var linkAutomatedControl = link.filter(function (l){ return l.controlnature == 1;});
  var linkSemiAutomatic = link.filter(function (l) { return l.controlnature == 2;});
  var linkManual = link.filter(function (l){ return l.controlnature == 3;});


  linkManual
    .attr({"stroke-dasharray": "5,5"});



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
    .transition()
      .delay(TRANSITION_DURATION)
      .duration(TRANSITION_DURATION)
      .attr("d", pathPathView)
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("opacity", OPACITY.LINK_DEFAULT);


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Legend part
    // var legend = svgPathView.select("#links").selectAll("path.link")
    //                     .data(biHiSankeyAppView.legendData, function (d) { return d.id; });;

    // var legendEnter = legend.enter().append("g")
    //                   .attr("class", "legend")
    //                   .attr("transform", function (d){var startX = d.x, startY = d.y; return "translate(" + startX + "," + startY + ")";})

    // var legendElementaryVariables = legend.filter(function (l) { return ( l.text == "Variable élémentaire" );});
    // var legendCalculatedVariables = legend.filter(function (l){ return ( l.text == "Variable calculée" );});
    // var legendAutomaticLink = legend.filter(function (l){ return l.text == "Vérification automatique";});
    // var legendSemiAutomaticLink = legend.filter(function (l){ return l.text == "Vérification semi-automatique";});
    // var legendManualLink = legend.filter(function (l){ return l.text == "Vérification manuelle"});
    // // var legendLinkAutomatic = legend.filter( function (l) { return l.type == "automaticlink"});
    // // var legendLinkSemiAutomatic = legend.filter( function (l) { return l.type == "semiautomatic"})
    // // 1 - Elementary variables
    // legendElementaryVariables.append("polygon") 
    //   .style("stroke", "black")  // colour the line
    //   .style("stroke-WIDTH", "2px")
    //   .style("fill", "#FFFFFF")
    //   .attr("points", function (l){  return computePolygonCoordonates(NODE_HEIGHT/4); } );  // x,y points 

    // legendElementaryVariables.append("text")
    //   .attr("x", function (d) {return "20px";})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });

    // // 2 - Calculated variables
    // legendCalculatedVariables.append("circle")
    //   .style("stroke", "black")
    //   .style("stroke-WIDTH", "2px")
    //   .attr("fill", " #FFFFFF")
    //   .attr("r", NODE_WIDTH/2)

    // legendCalculatedVariables.append("text")
    //   .attr("x", function (d) {return "20px";})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });

    // // 3 - Information systems
    // legendCollectInformationSystems.append("rect")
    //   .style("stroke", strokeColorScale(1))
    //   .style("stroke-WIDTH", "2px")
    //   .attr("fill", "#FFFFFF")
    //   .attr("x", function(d) {return "8px";})
    //   .attr("y", function(d) {return -NODE_WIDTH/2;})
    //   .attr("width", NODE_HEIGHT/2)
    //   .attr("height", NODE_WIDTH)

    // legendCollectInformationSystems.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });  


    // legendAgregationInformationSystems.append("rect")
    //   .style("stroke", strokeColorScale(2))
    //   .style("stroke-WIDTH", "2px")
    //   .attr("fill", "#FFFFFF")
    //   .attr("x", function(d) {return "8px";})
    //   .attr("y", function(d) {return -NODE_WIDTH/2;})
    //   .attr("width", NODE_HEIGHT/2)
    //   .attr("height", NODE_WIDTH)

    // legendAgregationInformationSystems.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });  

    // legendRestitutionInformationSystems.append("rect")
    //   .style("stroke", strokeColorScale(3))
    //   .style("stroke-WIDTH", "2px")
    //   .attr("fill", "#FFFFFF")
    //   .attr("x", function(d) {return "8px";})
    //   .attr("y", function(d) {return -NODE_WIDTH/2;})
    //   .attr("width", NODE_HEIGHT/2)
    //   .attr("height", NODE_WIDTH)

    // legendRestitutionInformationSystems.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 19;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });  

    // legendAutomaticLink.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });

    // legendAutomaticLink.append("polygon")
    //   .style("stroke", "#a6d854")  // colour the line
    //   .style("stroke-WIDTH", "2px")
    //   .style("fill", "#a6d854")
    //   .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 

    // legendSemiAutomaticLink.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });

    // legendSemiAutomaticLink.append("polygon")
    //   .style("stroke", "#fc8d62")  // colour the line
    //   .style("stroke-WIDTH", "2px")
    //   .style("fill", "#fc8d62")
    //   .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 

    // legendManualLink.append("text")
    //   .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
    //   .attr("y", function (d) {return 0;})
    //   .attr("dy", ".35em")
    //   .attr("text-anchor", "start")
    //   .attr("transform", null)
    //   .text(function (d) { return d.text; });

    // legendManualLink.append("polygon")
    //   .style("stroke", "#8da0cb")  // colour the line
    //   .style("stroke-WIDTH", "2px")
    //   .style("fill", "#8da0cb")
    //   .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/2); } )  // x,y points 
}

function launchDataVizModuleForPathView() {

  var vizData = {'nbMaximumNodes' : 1000, 'defaultWidth' : 85, 'defaultHeight' : 60};
  var NodesCharacteristicsForPathView = pathViewTransform(NodesAndLinksForPathView[0], NodesAndLinksForPathView[1], vizData);
  var IS_COLORS = [];
  var IS_NUMBERS = []; 
  //var legendData = NodesCharacteristics[2];
  for (var i = 0; i < vizData.informationSystems.length; i++){ IS_NUMBERS.push(i+1); IS_COLORS.push(IS_COLORS_STOCK[i]);}; 
  isColorScale = d3.scale.ordinal().domain(vizData.informationSystems).range(IS_COLORS);
  biHiSankeyPathView = d3.Sankey_PathView();
  // Set the biHiSankeyPathView diagram properties
  biHiSankeyPathView
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(10)
    .linkSpacing(4)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT]);

  pathPathView = biHiSankeyPathView.link().curvature(0.45);
  biHiSankeyPathView
    .nodes(NodesCharacteristicsForPathView[0])
    .links(NodesCharacteristicsForPathView[1])
    //.nodes([{"Application" : "Picasso", "name": "First node", "type" : "Elémentaire", "id" : "1", "originid" : "1"}, {"Application" : "Fermat", "name": "Second node", "type" : "Calculée", "id" : "2", "originid" : "2"}, {"Application" : "Fermat", "name": "Third node", "type": "Calculée", "id" : "3", "originid" : "3"}])
    //.links([{"source": "1", "target": "2", "value": "1", "type": "type1"}, {"source": "2", "target" : "3", "value" : "1", "type": "type2"}])
    .initializeNodes(function (node) {
      node.state = node.parent ? "contained" : "collapsed";
    }) // initializeNodes calling 6 functions, generating temporary variables used for display 
    .layout(LAYOUT_INTERATIONS); // layout calls 6 functions, including one which computing default x and y positions.
  disableUserInterractions(2 * TRANSITION_DURATION);
  updatePathView();
}