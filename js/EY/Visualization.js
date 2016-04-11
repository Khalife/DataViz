'use strict';

var svgAppView, svgPathView, tooltipAppView, tooltipPathView, biHiSankeyAppView, biHiSankeyPathView,
    pathAppView, pathPathView, defs, colorScale_NODES, colorScale_OUTLINES, colorScale_LINKS, isTransitioning;

var NodesCharacteristicsForAppView, NodesCharacteristicsForPathView;

var tabsDOMElement = [].slice.call( document.querySelectorAll( '.tabs > nav > ul > li' ) );

var OPACITY = {
    NODE_DEFAULT: 0.9,
    NODE_FADED: 0.1,
    NODE_HIGHLIGHT: 0.8,
    LINK_DEFAULT: 0.6,
    LINK_FADED: 0.05,
    LINK_HIGHLIGHT: 0.9
  },

  NODES_TYPES = [/* fed in function createColorSets with information systems names coming from transform */],
  NODES_COLORS = ["#1C86EE", "#6C7B8B", "#CAAECE", "#A751D2", "#571E74", "#E2006A", "#e5c494"],
  OUTLINES_TYPES = ["Saisie / Collecte", "Agregation", "Restitution"], 
  OUTLINES_COLORS = ["#00688B", "#838B83", "#FF1493"], 
  LINKS_TYPES = ["Contrôle OK", "Contrôle KO", "Pas de contrôle", "Pas d'information", "Transformée à cette étape", "Non-transformée à cette étape"],
  LINKS_COLORS = ["green", "red", "pink", "grey", "orange", "purple"],

  LINK_DEFAULT_COLOR = "grey",

  NODE_WIDTH = 12,
  NODE_HEIGHT = 27,
  NODE_INFORMATIONSYSTEM_WIDTH = 80,
  NODE_INFORMATIONSYSTEM_HEIGHT = 40,
  NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH = "3px",

  NODE_SPACING = 10,
  LINK_SPACING = 4,

  LINK_CURVATURE = 0.45,

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
  REFRESH_INTERVAL = 7000;


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
},

hideAppLinkTooltip = function () {
  return tooltipAppView.transition()
    .duration(TRANSITION_DURATION)
    .style("opacity", 0);
},

showAppLinkTooltip = function (s, t) {
  return tooltipAppView
    .style("left", 0.5*(s.x + t.x) + "px")
    .style("top", 0.5*(s.y + t.y) + 15 + "px")
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 1);
},

hidePathTooltip = function () {
  return tooltipPathView.transition()
    .duration(TRANSITION_DURATION)
    .style("opacity", 0);
},

showPathTooltip = function () {
  return tooltipPathView
    .style("left", d3.event.pageX + "px")
    .style("top", d3.event.pageY + 15 + "px")
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 1);
},

hidePathLinkToolTip = function(){
  return tooltipPathView.transition()
  .duration(TRANSITION_DURATION)
  .style("opacity", 0);
},

showPathLinkTooltip = function (s, t) {
  return tooltipPathView
    .style("left", 0.5*(s.x + t.x) + "px")
    .style("top", 0.5*(s.y + t.y) + 15 + "px")
    .transition()
      .duration(TRANSITION_DURATION)
      .style("opacity", 1);
},

hideParents = function (node) {
  if(node.parent) {
    node.parent.visible = false;
    hideParents(node.parent);
    hideSiblings(node);
  }
},

hideSiblings = function (node) {
  if(node.parent.children) {
    node.parent.children.filter(function(n) {return n != node})
      .forEach(function(sibling) {
        sibling.visible = false;
        hideChildren(sibling);
      });
  }
},

hideChildren = function (node) {
  if(node.children) {
    node.children
      .forEach(function(child) {
        child.visible = false;
        hideChildren(child);
      });
  }
},

resetPathViewVisibility = function() {
  var nodesPathView = NodesCharacteristicsForPathView[0];
  nodesPathView.forEach(function(node) {
    node.visible = true;
    node.status = "open";
  });
  biHiSankeyPathView.relayout();
  updatePathView();
},

getListOfIdsOfChildren = function (node, initialList){
    node.children.forEach(function (child) {
      initialList.push(child.id);
      getListOfIdsOfChildren(child, initialList);
    });
},

getListOfIdsOfAncestors = function (node, initialList){
    node.ancestors.forEach(function (parent){
      initialList.push(parent.id);
      getListOfIdsOfAncestors(parent, initialList);
    });
};

// Define color sets

function createColorSets(informationSystems) {
  NODES_TYPES = informationSystems;
  colorScale_NODES = d3.scale.ordinal().domain(NODES_TYPES).range(NODES_COLORS);
  colorScale_OUTLINES = d3.scale.ordinal().domain(OUTLINES_TYPES).range(OUTLINES_COLORS);
  colorScale_LINKS = d3.scale.ordinal().domain(LINKS_TYPES).range(LINKS_COLORS);
}



// End color sets

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
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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

tooltipPathView.style("opacity", 0)
    .append("p")
      .attr("class", "value");

defs = svgPathView.append("defs");

defs.append("marker")
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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
  .style("fill", LINK_DEFAULT_COLOR)
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

d3.select("#chart-path").append("a").on("click", resetPathViewVisibility).text("|reset|");

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

  function open(node) {
    node.status = "open";
    node.children.forEach(function (child) {
      child.visible = true;
    });
  }

  function close(node) {
    node.status = "closed";
    node.children.forEach(function (child) {
      child.visible = false;
    });
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

  function computeLinkPolygonCoordonates(height, width){
    // Function used to compute polygon coordonates
    // Returns link local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";
    corners.push([ 0, - height/2]);
    corners.push([ 0.85*width, -height/2]);
    corners.push([ width, 0]);
    corners.push([ 0.85*width, height/2]);
    corners.push([ 0,  height/2]);
    
    for (var i = 0; i != 4; i++){
      cornersString =  cornersString + corners[i][0].toString() + "," + corners[i][1].toString() + ", "
    }
    cornersString = cornersString + corners[4][0].toString() + "," + corners[4][1].toString();
    return cornersString;
  }

  function eliminateStepStringError(etapeString){
    if (etapeString == "Agrégation"){
      return "Agregation";
    }
    return etapeString;
  }

  function showHideAppChildren(node) {
    disableUserInterractions(2 * TRANSITION_DURATION);
    hideAppTooltip();
    if (node.status === "open") { close(node) } else { open(node) };
    
    // if (node.state === "collapsed") { expand(node); }
    // else { collapse(node); }

    biHiSankeyAppView.relayout();
    updateAppView();
    link.attr("d", pathAppView);
    restoreLinksAndNodes();
  }

  function restoreLinksAndNodes() {
    link
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("stroke-dasharray", function (d){ return (d.dash || "");})
      .style("stroke", function (d){
        var color;
        if (d.linktype == "variable") {
          color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
        } else {
          color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
        }
        return color;
      })
      .style("marker-end", function (d) { if ( d.source == "variable"){ return 'url(#arrowVerticalHead)';} else { return 'url(#arrowHorizontalHead)';} }) //return 'url(#arrowHead)'; })
      .transition()
        .duration(TRANSITION_DURATION)
        .style("opacity", OPACITY.LINK_DEFAULT);

    node.filter(function (d){ if ( d.type === "variable" ){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale_NODES(d.informationsystem);
        return d.color;
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT);

    node.filter(function (d){ if (d.type === "informationsystem"){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale_NODES(d.name);
        return d.color;
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)
      .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT);
  }

  link = svgAppView.select("#links").selectAll("path.link").data(biHiSankeyAppView.visibleLinks(), function (d) { return d.id; });

  link.exit().remove();

  link.transition()
    .duration(TRANSITION_DURATION)
    .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
    .style("stroke-dasharray", function (d){ return (d.dash || "");})
    .style("stroke", function (d){
      var color;
      if (d.linktype == "variable") {
        color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
      } else {
        color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
      }
      return color;
    })
    .attr("d", pathAppView)
    .style("opacity", OPACITY.LINK_DEFAULT);

  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return "white"});

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
    .style("stroke", function (d){
      var color;
      if (d.linktype == "variable") {
        color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
      } else {
        color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
      }
      return color;
    })
    .style("opacity", 0)
    .transition()
      .delay(TRANSITION_DURATION)
      .duration(TRANSITION_DURATION)
      .attr("d", pathAppView)
      .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
      .style("stroke-dasharray", function (d){ return (d.dash || "");})
      .style("stroke", function (d){
        var color;
        if (d.linktype == "variable") {
          color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
        } else {
          color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
        }
        return color;
      })
      .style("opacity", OPACITY.LINK_DEFAULT);

  node = svgAppView.select("#nodes").selectAll(".node").data(biHiSankeyAppView.visibleNodes(), function (d) { return d.id; });

  node.transition()
    .duration(TRANSITION_DURATION)
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

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

  // Create App Nodes

  var nodeInformationSystem = node.filter(function (d){ if (d.type === "informationsystem"){return true;}});

  nodeInformationSystem
    .append("rect")
    .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)
    .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT)
    .style("fill", function (d) {
      d.color = colorScale_NODES(d.name);
      return d.color;
    })
    .style("fill-opacity", OPACITY.NODE_DEFAULT)
    .style("stroke", function (d) {
      var etape = eliminateStepStringError(d.etape);
      return d3.rgb(colorScale_OUTLINES(etape)); 
    })
    .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)

  nodeInformationSystem.select("text")
    .attr("x", function (d) {return d.width;})
    .attr("y", function (d) {return -10;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  // Create Variable Nodes

  var nodeVariableCalculated = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});

  nodeVariableCalculated
    .append("circle")
    .attr("r", NODE_HEIGHT / 2)
    .style("fill", function (d) {
      d.color = colorScale_NODES(d.informationsystem);
      return d.color;
    })
    .style("fill-opacity", OPACITY.NODE_DEFAULT);

  nodeVariableCalculated.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  var nodeVariableElementary = node.filter(function (d){ return ( ( d.type === "variable" ) && !( d.iscalculated ) ) ;});

  nodeVariableElementary
    .append("polygon")       // attach a polygon
    .attr("points", function (d){  return computePolygonCoordonates(NODE_HEIGHT/2); } )
    .style("fill", function (d) {
      d.color = colorScale_NODES(d.informationsystem);
      return d.color;
    })
    .style("fill-opacity", OPACITY.NODE_DEFAULT);

  nodeVariableElementary.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  // Create and attach tooltips

  var linkBetweenApps = link.filter(function (l){return l.linktype == "informationsystem";});

  linkBetweenApps.on('mouseenter', function (d) {
    if (!isTransitioning) {
      showAppLinkTooltip(d.source, d.target).select(".value")
        .text(function () {
         // showAppTooltip().select("value").text(function() {
          return "Flux: \n" + d.source.name + " → " + d.target.name + "\n \n " + "Table : \n " + d.table + "\n \n " + "Champs du flux : \n " + d.champs + "\n \n" + "Variables transformées :\n"+ d.transformedvariables;
        });
    }
  });

  linkBetweenApps.on('mouseleave', function () {
    if (!isTransitioning) {
      hideAppLinkTooltip();
    }
  });

  nodeVariableElementary.on("mouseenter", function (g) {
    if (!isTransitioning) {
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            var reverseControlQuality = g.controlqualitytext;
            var reverseControlNature = g.controlnaturetext; 
            return "Table : \n" + g.table + "\n \n" + "Champs : \n" + g.champs + "\n \n" + "Contrôle effectué : \n" + reverseControlQuality + "\n \n" +"Nature du contrôle : \n" + reverseControlNature; 
          });
    }
  });

  nodeVariableCalculated.on("mouseenter", function (g) {
    if (!isTransitioning) {
      tooltipAppView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            var reverseControlQuality = g.controlqualitytext;
            var reverseControlNature = g.controlnaturetext; 
            return "Table : \n" + g.table + "\n \n" + "Champs : \n" + g.champs + "\n \n" + "Contrôle effectué : \n" + reverseControlQuality + "\n \n" + "Nature du contrôle : \n" + reverseControlNature; 
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
            return "Equipe :\n" + g.equipe + "\n \n" + "Responsable : \n" + g.responsable ;
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

  node.filter(function (d) { return ( d.type == "variable" ) })
    .on("dblclick", function(e) {
      transferToPathView(e);
    });

  node.call(d3.behavior.drag()
    .origin(function (d) { return d; })
    .on("dragstart", function () { this.parentNode.appendChild(this); })
    .on("drag", dragmove));

  // Create and attach legend

  var legend = svgAppView.select("#legend").selectAll(".legend");
  
  if (legend[0].length == 0) {

    legend = legend.data(biHiSankeyAppView.legendData(), function (l) { return l.id; }); // intermediate

    var legendEnter = legend.enter()
                        .append("g")
                          .attr("class", "legend")
                          .attr("transform", function (d){var startX = d.x, startY = d.y; return "translate(" + startX + "," + startY + ")";});

    var legendElementaryVariables = legend.filter(function (l) { return ( l.text == "Variable élémentaire" );}),
        legendCalculatedVariables = legend.filter(function (l){ return ( l.text == "Variable calculée" );}),
        legendCollectInformationSystems = legend.filter(function (l){ return (l.text == "SI de collecte");}),
        legendAgregationInformationSystems = legend.filter(function (l){ return (l.text == "SI d'aggrégation");}),
        legendRestitutionInformationSystems = legend.filter(function (l){ return (l.text == "SI de restitution");}),
        legendAutomaticLink = legend.filter(function (l){ return l.text == "Vérification automatique";}),
        legendSemiAutomaticLink = legend.filter(function (l){ return l.text == "Vérification semi-automatique";}),
        legendManualLink = legend.filter(function (l){ return l.text == "Vérification manuelle"}),
        legendTransformedLink = legend.filter(function (l){ return l.text == "Transformée à cette étape"}),
        legendNonTransformedLink = legend.filter(function (l){ return l.text == "Non-transformée à cette étape"}),
        legendQualityOKLink = legend.filter(function (l){ return l.text == "Contrôle OK"}),
        legendQualityKOLink = legend.filter(function (l){ return l.text == "Contrôle KO"}),
        legendQualityNOLink = legend.filter(function (l){ return l.text == "Pas de contrôle"}),
        legendQualityNALink = legend.filter(function (l){ return l.text == "Pas d'information"});

      // 1 - Elementary / Calculated variables
    legendElementaryVariables.append("polygon")
      .attr("points", function (l){  return computePolygonCoordonates(NODE_HEIGHT/4); } )
      .style("stroke", "black")  // colour the line
      .style("stroke-width", "1px")
      .style("fill", "#FFFFFF");

    legendElementaryVariables.append("text")
      .attr("x", function (d) {return "20px";})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendCalculatedVariables.append("circle")
      .attr("fill", " #FFFFFF")
      .attr("r", NODE_WIDTH/2)
      .style("stroke", "black")
      .style("stroke-width", "1px");

    legendCalculatedVariables.append("text")
      .attr("x", function (d) {return "20px";})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

      // 2 - Information systems
    legendCollectInformationSystems.append("rect")
      .attr("fill", "#FFFFFF")
      .attr("x", function(d) {return 0;})
      .attr("y", function(d) {return -NODE_WIDTH/2;})
      .attr("width", NODE_HEIGHT)
      .attr("height", NODE_WIDTH)
      .style("stroke", colorScale_OUTLINES("Saisie / Collecte"))
      .style("stroke-width", "2px");

    legendCollectInformationSystems.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });  

    legendAgregationInformationSystems.append("rect")
      .attr("fill", "#FFFFFF")
      .attr("x", function(d) {return 0;})
      .attr("y", function(d) {return -NODE_WIDTH/2;})
      .attr("width", NODE_HEIGHT)
      .attr("height", NODE_WIDTH)
      .style("stroke", colorScale_OUTLINES("Aggregation"))
      .style("stroke-width", "2px");

    legendAgregationInformationSystems.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });  

    legendRestitutionInformationSystems.append("rect")
      .attr("fill", "#FFFFFF")
      .attr("x", function(d) {return 0;})
      .attr("y", function(d) {return -NODE_WIDTH/2;})
      .attr("width", NODE_HEIGHT)
      .attr("height", NODE_WIDTH)
      .style("stroke", colorScale_OUTLINES("Restitution"))
      .style("stroke-width", "2px")

    legendRestitutionInformationSystems.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });  

      // 3 - Links
    legendAutomaticLink.append("polygon")
      .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )
      .style("stroke", LINK_DEFAULT_COLOR)
      .style("stroke-width", "2px")
      .style("fill", LINK_DEFAULT_COLOR);

    legendAutomaticLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendSemiAutomaticLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", LINK_DEFAULT_COLOR)  // colour the line
      .style("stroke-width", "4px")
      .style("fill", LINK_DEFAULT_COLOR);

    legendSemiAutomaticLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendManualLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", LINK_DEFAULT_COLOR)  // colour the line
      .style("stroke-width", "4px")
      .style("stroke-dasharray", "5,5")
      .style("fill", LINK_DEFAULT_COLOR);

    legendManualLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendTransformedLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", d3.rgb(LINKS_COLORS[4]))  // colour the line
      .style("stroke-width", "1px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[4]));

    legendTransformedLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendNonTransformedLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", d3.rgb(LINKS_COLORS[5]))  // colour the line
      .style("stroke-width", "1px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[5]));

    legendNonTransformedLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityOKLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[0]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[0]));

    legendQualityOKLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityKOLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[1]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[1]));

    legendQualityKOLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityNOLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[2]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[2]));

    legendQualityNOLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityNALink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[3]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[3]));

    legendQualityNALink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

      // 4 - Interactivity
    
    var nonCalculatedVariables = node.filter(function (d){ return ( ( d.type === "variable" ) && !( d.iscalculated ) ) ;}),
        calculatedVariables = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});

    var linkBetweenApps = link.filter(function (l){return l.linktype == "informationsystem";}),
        linkBetweenVariablesAndApps = link.filter(function (l){return l.linktype == "variable";});

    var collectionInformationSystems = node.filter(function (d){ return ( ( d.type === "informationsystem" ) && ( eliminateStepStringError(d.etape) == "Saisie / Collecte" ) ) ;}),
        aggregationInformationSystems = node.filter(function (d){ return ( ( d.type === "informationsystem" ) && ( eliminateStepStringError(d.etape) == "Agregation" ) ) ;}),
        restitutionInformationSystems = node.filter(function (d){ return ( ( d.type === "informationsystem" ) && ( eliminateStepStringError(d.etape) == "Restitution" ) ) ;});

    var automaticLinks = linkBetweenApps.filter(function (d){ return (d.controlnature == 1);}),
        semiAutomaticLinks = linkBetweenApps.filter(function (d){ return (d.controlnature == 2);}),
        manualLinks = linkBetweenApps.filter(function (d){ return (d.controlnature == 3);}),
        transformedLinks = linkBetweenVariablesAndApps.filter(function (d){ return d.istransformed;}),
        nonTransformedLinks = linkBetweenVariablesAndApps.filter(function (d){ return !(d.istransformed);}),
        qualityOKLinks = linkBetweenApps.filter(function (d){ return (d.controlquality == 1);}),
        qualityKOLinks = linkBetweenApps.filter(function (d){ return (d.controlquality == 2);}),
        qualityNOLinks = linkBetweenApps.filter(function (d){ return (d.controlquality == 3);}),
        qualityNALinks = linkBetweenApps.filter(function (d){ return (d.controlquality == 4);});

    function restoreVariableNode(type){
      switch (type) {
        case "Variable élémentaire":
          nonCalculatedVariables
            .select("polygon")
            .style("stroke", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;})
            .style("fill", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;});
          break;
        case "Variable calculée":
          calculatedVariables
          .select("circle")
          .style("stroke", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;})
          .style("fill", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;});
          break;
      }
    }

    function restoreInformationSystemNode(type){
      switch (type) {
        case "SI de collecte":
          collectionInformationSystems
            .select("rect")
            .style("stroke", function (d){return d3.rgb(colorScale_OUTLINES(eliminateStepStringError(d.etape)));})
          break;
        case "SI d'aggrégation":
          aggregationInformationSystems
          .select("rect")
          .style("stroke", function (d){return d3.rgb(colorScale_OUTLINES(eliminateStepStringError(d.etape)));})
          break;
        case "SI de restitution":
          restitutionInformationSystems
          .select("rect")
          .style("stroke", function (d){return d3.rgb(colorScale_OUTLINES(eliminateStepStringError(d.etape)));})
          break;
      }
    }

    function restoreLink(type){
      var currentLinkCollection;
      switch (type) {
        case "Transformée à cette étape":
          currentLinkCollection = transformedLinks;
          break;
        case "Non-transformée à cette étape":
         currentLinkCollection =  nonTransformedLinks;
          break;
        case "Vérification automatique":
          currentLinkCollection = automaticLinks;
          break;
        case "Vérification semi-automatique":
          currentLinkCollection = semiAutomaticLinks;
          break;
        case "Vérification manuelle":
          currentLinkCollection = manualLinks;
          break;
        case "Contrôle OK":
          currentLinkCollection = qualityOKLinks;
          break;
        case "Contrôle KO":
          currentLinkCollection = qualityKOLinks;
          break;
        case "Pas de contrôle":
          currentLinkCollection = qualityNOLinks;
          break;
        case "Pas d'information":
          currentLinkCollection = qualityNALinks;
          break;
      }
      currentLinkCollection
          .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
          .style("stroke-dasharray", function (d){ return (d.dash || "");})
          .style("stroke", function (d){
            var color;
            if (d.linktype == "variable") {
              color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
            } else {
              color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
            }
            return color;
          });
    }

    legendElementaryVariables.on("mouseenter", function (){
      nodeVariableElementary.select("polygon")
        .attr("fill", "black")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendCalculatedVariables.on("mouseenter", function (){
      nodeVariableCalculated.select("circle")
        .attr("fill", "black")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendCollectInformationSystems.on("mouseenter", function (){
      collectionInformationSystems.select("rect")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendAgregationInformationSystems.on("mouseenter", function (){
      aggregationInformationSystems.select("rect")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendRestitutionInformationSystems.on("mouseenter", function (){
      restitutionInformationSystems.select("rect")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendAutomaticLink.on("mouseenter", function (){
      automaticLinks
        .style("stroke", "yellow")
    });

    legendSemiAutomaticLink.on("mouseenter", function (){
      semiAutomaticLinks
        .style("stroke", "yellow")
    });

    legendManualLink.on("mouseenter", function (){
      manualLinks
        .style("stroke", "yellow")
    });

    legendTransformedLink.on("mouseenter", function (){
      transformedLinks
        .style("stroke", "yellow")
    });

    legendNonTransformedLink.on("mouseenter", function (){
      nonTransformedLinks
        .style("stroke", "yellow")
    });

    legendQualityOKLink.on("mouseenter", function (){
      qualityOKLinks
        .style("stroke", "yellow")
    });

    legendQualityKOLink.on("mouseenter", function (){
      qualityKOLinks
        .style("stroke", "yellow")
    });

    legendQualityNOLink.on("mouseenter", function (){
      qualityNOLinks
        .style("stroke", "yellow")
    });

    legendQualityNALink.on("mouseenter", function (){
      qualityNALinks
        .style("stroke", "yellow")
    });

    legendElementaryVariables.on("mouseleave", function (l){restoreVariableNode("Variable élémentaire");});

    legendCalculatedVariables.on("mouseleave", function (l){restoreVariableNode("Variable calculée");});

    legendCollectInformationSystems.on("mouseleave", function (l){restoreInformationSystemNode("SI de collecte");});

    legendAgregationInformationSystems.on("mouseleave", function (l){restoreInformationSystemNode("SI d'aggrégation");});

    legendRestitutionInformationSystems.on("mouseleave", function (l){restoreInformationSystemNode("SI de restitution");});

    legendAutomaticLink.on("mouseleave", function (l){restoreLink("Vérification automatique");});

    legendSemiAutomaticLink.on("mouseleave", function (l){restoreLink("Vérification semi-automatique");});

    legendManualLink.on("mouseleave", function (l){restoreLink("Vérification manuelle");});

    legendTransformedLink.on("mouseleave", function (l){restoreLink("Transformée à cette étape");});

    legendNonTransformedLink.on("mouseleave", function (l){restoreLink("Non-transformée à cette étape");});

    legendQualityOKLink.on("mouseleave", function (l){restoreLink("Contrôle OK");});

    legendQualityKOLink.on("mouseleave", function (l){restoreLink("Contrôle KO");});

    legendQualityNOLink.on("mouseleave", function (l){restoreLink("Pas de contrôle");});

    legendQualityNALink.on("mouseleave", function (l){restoreLink("Pas d'information");});

  }

}

function launchDataVizModuleForAppView() {

  var vizData = {WIDTH : WIDTH, nbMaximumNodes: 1000};
  NodesCharacteristicsForAppView = applicativeViewTransform(NodesAndLinksForAppView[0], NodesAndLinksForAppView[1], vizData);
  var legendData = NodesCharacteristicsForAppView[2];
  var nodes = NodesCharacteristicsForAppView[0];
  var links = NodesCharacteristicsForAppView[1];

  createColorSets(vizData.informationSystems);

  biHiSankeyAppView = d3.Sankey_AppView();

  pathAppView = biHiSankeyAppView.link().curvature(LINK_CURVATURE);
  
  biHiSankeyAppView
    .legendData(legendData)
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(NODE_SPACING)
    .linkSpacing(LINK_SPACING)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT])
    .nodes(nodes)
    .links(links)
    .initializeNodes(function (node) {
      node.visible = true;
      node.status = "open";
    }) // initializeNodes calling 6 functions, generating temporary variables used for display 
    .layout(); // layout calls 6 functions, including one which computing default x and y positions.

  disableUserInterractions(2 * TRANSITION_DURATION);
  updateAppView();

}

function transferToPathView(node) {
  var nodesPathView = NodesCharacteristicsForPathView[0];
  var currentNodeInPathView = nodesPathView.filter(function(n) { return n.id == node.idFromSource })[0];
  hideParents(currentNodeInPathView);
  // hideSiblings(currentNodeInPathView);
  biHiSankeyPathView.relayout();
  updatePathView();
  tabsDOMElement[1].dispatchEvent(new Event('click'));
}

function updatePathView(){

  var link, linkEnter, node, nodeEnter, collapser, collapserEnter, legend;
  
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

  function open(node) {
    node.status = "open";
    node.children.forEach(function (child) {
      child.visible = true;
      open(child);
    });
  }

  function close(node) {
    node.status = "closed";
    node.children.forEach(function (child) {
      child.visible = false;
      close(child);
    });
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

  function computeLinkPolygonCoordonates(height, width){
    // Function used to compute polygon coordonates
    // Returns link local coordinates starting from top left corner, in string form to be used with SVG
    var corners = [], cornersString = "";
    corners.push([ 0, - height/2]);
    corners.push([ 0.85*width, -height/2]);
    corners.push([ width, 0]);
    corners.push([ 0.85*width, height/2]);
    corners.push([ 0,  height/2]);
    
    for (var i = 0; i != 4; i++){
      cornersString =  cornersString + corners[i][0].toString() + "," + corners[i][1].toString() + ", "
    }
    cornersString = cornersString + corners[4][0].toString() + "," + corners[4][1].toString();
    return cornersString;
  }

  function showHidePathChildren(node) {
    disableUserInterractions(2 * TRANSITION_DURATION);
    hidePathTooltip();
    if (node.status === "open") { close(node) } else { open(node) };
    
    // if (node.state === "collapsed") { expand(node); }
    // else { collapse(node); }

    biHiSankeyPathView.relayout();
    updatePathView();
    link.attr("d", pathPathView);
    restoreLinksAndNodes();
  }

  function restoreLinksAndNodes() {
    link
      .style("stroke-WIDTH", function (d) { return Math.max(1, d.thickness); })
      .style("stroke-dasharray", function (d){ return (d.dash || "");})
      .style("stroke", function (d){
        var color;
        if (d.linktype == "variable") {
          color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
        } else {
          color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
        }
        return color;
      })
      .style("marker-end", function (d) { if ( d.source == "variable"){ return 'url(#arrowVerticalHead)';} else { return 'url(#arrowHorizontalHead)';} }) //return 'url(#arrowHead)'; })
      .transition()
        .duration(TRANSITION_DURATION)
        .style("opacity", OPACITY.LINK_DEFAULT);

    node.filter(function (d){ if ( d.type === "variable" ){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale_NODES(d.informationsystem);
        return d.color;
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_WIDTH)
      .attr("height", NODE_HEIGHT);

    node.filter(function (d){ if (d.type === "informationsystem"){return true;}})
      .selectAll("rect")
      .style("fill", function (d) {
        d.color = colorScale_NODES(d.name);
        return d.color;
      })
      .style("fill-opacity", OPACITY.NODE_DEFAULT)
      .attr("width", NODE_INFORMATIONSYSTEM_WIDTH)
      .attr("height", NODE_INFORMATIONSYSTEM_HEIGHT);
  }

  link = svgPathView.select("#links").selectAll("path.link").data(biHiSankeyPathView.visibleLinks(), function (d) { return d.id; });

  link.exit().remove();

  link.transition()
    .duration(TRANSITION_DURATION)
    .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
    .style("stroke-dasharray", function (d){ return (d.dash || "");})
    .style("stroke", function (d){
      var color;
      color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
      return color;
    })
    .attr("d", pathPathView)
    .style("opacity", OPACITY.LINK_DEFAULT);


  linkEnter = link.enter().append("path")
    .attr("class", "link")
    .style("fill", function (d){return "white"});


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
    .style("stroke", function (d){
      var color;
      color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
      return color;
    })
    .style("opacity", 0)
    .transition()
      .delay(TRANSITION_DURATION)
      .duration(TRANSITION_DURATION)
      .attr("d", pathPathView)
      .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
      .style("stroke-dasharray", function (d){ return (d.dash || "");})
      .style("stroke", function (d){
        var color;
        color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
        return color;
      })
      .style("opacity", OPACITY.LINK_DEFAULT);

  node = svgPathView.select("#nodes").selectAll(".node").data(biHiSankeyPathView.visibleNodes(), function (d) { return d.id; });

  node.transition()
    .duration(TRANSITION_DURATION)
    .attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });

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

  // Create Variable Nodes

  var nodeVariableCalculated = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});

  nodeVariableCalculated
    .append("circle")
    .attr("r", NODE_HEIGHT / 2)
    .style("fill", function (d) {
      d.color = colorScale_NODES(d.informationsystem);
      return d.color;
    })
    .style("fill-opacity", OPACITY.NODE_DEFAULT);

  nodeVariableCalculated.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", "1.5em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  var nodeVariableElementary = node.filter(function (d){ return ( ( d.type === "variable" ) && !( d.iscalculated ) ) ;});

  nodeVariableElementary
    .append("polygon")       // attach a polygon
    .attr("points", function (d){  return computePolygonCoordonates(NODE_HEIGHT/2); } )
    .style("fill", function (d) {
      d.color = colorScale_NODES(d.informationsystem);
      return d.color;
    })
    .style("fill-opacity", OPACITY.NODE_DEFAULT);

  nodeVariableElementary.select("text")
    .attr("x", function (d) {return (5/2)*d.name.length;})
    .attr("y", function (d) {return d.height / 2 + 10 ;})
    .attr("dy", "1.5em")
    .attr("text-anchor", "end")
    .attr("transform", null)
    .text(function (d) { return d.name; });

  // Create and attach tooltips

  nodeVariableElementary.on("mouseenter", function (g) {
    if (!isTransitioning) {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////////////////////   Masquer les variables hors du chemin  //////////////////////////////////////////////////////
      var listOfAncestorsIds = [], listOfChildrenIds = [];
      getListOfIdsOfAncestors(g, listOfAncestorsIds);
      getListOfIdsOfChildren(g, listOfChildrenIds);
      var listOfIds =  listOfAncestorsIds.concat(listOfChildrenIds, [g.id]);
      var polygonOrRectangle;
      node.filter(function (d){ return ( listOfIds.indexOf(d.id) < 0 ) && ( d.iscalculated == true );}).select("circle").style("opacity", 0.1);
      // node.filter(function (d){ return ( listOfIds.indexOf(d.id) > -1 ) && ( d.iscalculated == true );}).select("circle")
      //   .attr("fill", "black")
      //   .style("stroke", "yellow")
      //   .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH);
      node.filter( function (d){ return ( listOfIds.indexOf(d.id) < 0 ) && ( d.iscalculated == false ); }).select("polygon").style("opacity",0.1);
      // node.filter(function (d){ return ( listOfIds.indexOf(d.id) > -1 ) && ( d.iscalculated == false );}).select("polygon")
      //   .attr("fill", "black")
      //   .style("stroke", "yellow")
      //   .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
      link.filter( function (l){  return ( listOfIds.indexOf(l.source.id) < 0 ) || ( listOfIds.indexOf(l.target.id) < 0 ) }).style("opacity", 0.1);
      // link.filter( function (l){  return ( listOfIds.indexOf(l.source.id) > -1 ) && ( listOfIds.indexOf(l.target.id) > -1 ) }).style("stroke", "yellow");
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      tooltipPathView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            var additionalInstructions = g.children.length ? "\n(Double click to expand)" : "";
            var reverseControlQuality = g.controlquality;
            var reverseControlNature = g.controlnature; 
            return "Equipe : \n" + g.equipe + "\n \n" + "Etape : \n" + g.etape+ "\n";
          });
    }
  });

  nodeVariableCalculated.on("mouseenter", function (g) {
    if (!isTransitioning) {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////////////////////   Masquer les variables hors du chemin  //////////////////////////////////////////////////////
      var listOfAncestorsIds = [], listOfChildrenIds = [];
      getListOfIdsOfAncestors(g, listOfAncestorsIds);
      getListOfIdsOfChildren(g, listOfChildrenIds);
      var listOfIds =  listOfAncestorsIds.concat(listOfChildrenIds, [g.id]);
      var polygonOrRectangle;
      node.filter(function (d){ return ( listOfIds.indexOf(d.id) < 0 ) && ( d.iscalculated == true );}).select("circle").style("opacity", 0.1)
      // node.filter(function (d){ return ( listOfIds.indexOf(d.id) > -1 ) && ( d.iscalculated == true );}).select("circle")
      //   .attr("fill", "black")
      //   .style("stroke", "yellow")
      //   .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
      //    .style("stroke-width", "2px");
      node.filter( function (d){ return ( listOfIds.indexOf(d.id) < 0 ) && ( d.iscalculated == false ); }).select("polygon").style("opacity",0.1)
      // node.filter(function (d){ return ( listOfIds.indexOf(d.id) > -1 ) && ( d.iscalculated == false );}).select("polygon")
      //   .attr("fill", "black")
      //   .style("stroke", "yellow")
      //   .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
      link.filter( function (l){  return ( listOfIds.indexOf(l.source.id) < 0 ) || ( listOfIds.indexOf(l.target.id) < 0 ) }).style("opacity", 0.1);
      // link.filter( function (l){  return ( listOfIds.indexOf(l.source.id) > -1 ) && ( listOfIds.indexOf(l.target.id) > -1 ) }).style("stroke", "yellow");
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      tooltipPathView
        .style("left", g.x + MARGIN.LEFT + "px")
        .style("top", g.y + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            return "Equipe : \n" + g.equipe + "\n \n" + "Etape : \n" + g.etape+ "\n";
          });
    }
  });

  node.on("mouseleave", function (g) {
    if (!isTransitioning) {
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      ///////////////////////////////////////////////   Rétablir les variables hors du chemin //////////////////////////////////////////////////////
      node.filter(function (d){ return ( d.iscalculated );}).select("circle")
        .style("fill", function (d) { d.color = colorScale_NODES(d.informationsystem); return d.color;})
        .style("opacity", OPACITY.NODE_DEFAULT)
        .style("stroke-width", "0px");

      node.filter(function (d){ return ( ! d.iscalculated );}).select("polygon")       
        .style("fill", function (d) { d.color = colorScale_NODES(d.informationsystem); return d.color; })
        .style("opacity", OPACITY.NODE_DEFAULT)
        .style("stroke-width", "0px");

      link.style("stroke", function (d){ var color; color = d3.rgb(LINKS_COLORS[d.controlquality-1]); return color; })
        .style("opacity", 0)
        .transition()
        .delay(TRANSITION_DURATION)
        .duration(TRANSITION_DURATION)
        .attr("d", pathPathView)
        .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
        .style("stroke-dasharray", function (d){ return (d.dash || "");})
        .style("stroke", function (d){ var color; color = d3.rgb(LINKS_COLORS[d.controlquality-1]); return color; })
        .style("opacity", OPACITY.LINK_DEFAULT);
      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      hidePathTooltip();
      // restoreLinksAndNodes();
    }
  });

  link.on("mouseenter", function (g){
    // if (!isTransitioning) {
    //   showPathLinkTooltip(g.source, g.target).select("value").text(function () {
    //         return "Flux : \n" + g.source.informationsystem  + "->" + g.target.informationsystem + "\n \n" + "Donnée dans le flux : \n" + g.source.name;
    //       });      
    // }
    if (!isTransitioning) {
      // highlightConnected(g);
      // restoreLinksAndNodes();
      tooltipPathView
        .style("left", 0.5*(g.source.x + g.target.x) + MARGIN.LEFT + "px")
        .style("top", 0.5*(g.source.y + g.target.y) + g.height + MARGIN.TOP + 15 + "px")
        .transition()
          .duration(TRANSITION_DURATION)
          .style("opacity", 1).select(".value")
          .text(function () {
            return "Flux : \n" + g.source.informationsystem  + "->" + g.target.informationsystem + "\n \n" + "Donnée dans le flux : \n" + g.source.name;
          });
    }
  });

  link.on("mouseleave", function (){
    if (!isTransitioning){
      hidePathLinkToolTip();
      restoreLinksAndNodes();
    }
  });

  node.filter(function (d) { return d.children.length; })
    .on("dblclick", showHidePathChildren);

  node.call(d3.behavior.drag()
    .origin(function (d) { return d; })
    .on("dragstart", function () { this.parentNode.appendChild(this); })
    .on("drag", dragmove));

  // Create and attach legend

  var legend = svgPathView.select("#legend").selectAll(".legend");

  if (legend[0].length == 0) {

    legend = legend.data(biHiSankeyPathView.legendData(), function (l) { return l.id; }); // intermediate

    var legendEnter = legend.enter().append("g")
                        .attr("class", "legend")
                        .attr("transform", function (d){var startX = d.x, startY = d.y; return "translate(" + startX + "," + startY + ")";})

    var legendElementaryVariables = legend.filter(function (l) { return ( l.text == "Variable élémentaire" );}),
        legendCalculatedVariables = legend.filter(function (l){ return ( l.text == "Variable calculée" );}),
        legendAutomaticLink = legend.filter(function (l){ return l.text == "Vérification automatique";}),
        legendSemiAutomaticLink = legend.filter(function (l){ return l.text == "Vérification semi-automatique";}),
        legendManualLink = legend.filter(function (l){ return l.text == "Vérification manuelle"}),
        legendQualityOKLink = legend.filter(function (l){ return l.text == "Contrôle OK"}),
        legendQualityKOLink = legend.filter(function (l){ return l.text == "Contrôle KO"}),
        legendQualityNOLink = legend.filter(function (l){ return l.text == "Pas de contrôle"}),
        legendQualityNALink = legend.filter(function (l){ return l.text == "Pas d'information"});

      // 1 - Elementary / Calculated variables
    legendElementaryVariables.append("polygon")
      .attr("points", function (l){  return computePolygonCoordonates(NODE_HEIGHT/4); } )
      .style("stroke", "black")  // colour the line
      .style("stroke-width", "1px")
      .style("fill", "#FFFFFF");

    legendElementaryVariables.append("text")
      .attr("x", function (d) {return "20px";})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendCalculatedVariables.append("circle")
      .attr("fill", " #FFFFFF")
      .attr("r", NODE_WIDTH/2)
      .style("stroke", "black")
      .style("stroke-width", "1px");

    legendCalculatedVariables.append("text")
      .attr("x", function (d) {return "20px";})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

      // 3 - Links
    legendAutomaticLink.append("polygon")
      .attr("points", function (l){  return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )
      .style("stroke", LINK_DEFAULT_COLOR)
      .style("stroke-width", "2px")
      .style("fill", LINK_DEFAULT_COLOR);

    legendAutomaticLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendSemiAutomaticLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", LINK_DEFAULT_COLOR)  // colour the line
      .style("stroke-width", "4px")
      .style("fill", LINK_DEFAULT_COLOR);

    legendSemiAutomaticLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendManualLink.append("line")
      .attr("x1", function(d) {return 0;})
      .attr("y1", function(d) {return 0;})
      .attr("x2", function(d) {return NODE_WIDTH*2.3;})
      .attr("y2", function(d) {return 0;})
      .style("stroke", LINK_DEFAULT_COLOR)  // colour the line
      .style("stroke-width", "4px")
      .style("stroke-dasharray", "5,5")
      .style("fill", LINK_DEFAULT_COLOR);

    legendManualLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityOKLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[0]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[0]));

    legendQualityOKLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityKOLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[1]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[1]));

    legendQualityKOLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityNOLink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[2]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[2]));

    legendQualityNOLink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

    legendQualityNALink.append("polygon")
      .attr("points", function (l){ return computeLinkPolygonCoordonates(NODE_HEIGHT/3, NODE_WIDTH*2.5); } )  // x,y points 
      .style("stroke", d3.rgb(LINKS_COLORS[3]))
      .style("stroke-width", "2px")
      .style("opacity", 0.6)
      .style("fill", d3.rgb(LINKS_COLORS[3]));

    legendQualityNALink.append("text")
      .attr("x", function (d) {return NODE_HEIGHT/2 + 20;})
      .attr("y", function (d) {return 0;})
      .attr("dy", ".35em")
      .attr("text-anchor", "start")
      .attr("transform", null)
      .text(function (d) { return d.text; });

      // 4 - Interactivity
    
    var nonCalculatedVariables = node.filter(function (d){ return ( ( d.type === "variable" ) && !( d.iscalculated ) ) ;}),
        calculatedVariables = node.filter(function (d){ return ( ( d.type === "variable" ) && ( d.iscalculated ) ) ;});

    var automaticLinks = link.filter(function (d){ return (d.controlnature == 1);}),
        semiAutomaticLinks = link.filter(function (d){ return (d.controlnature == 2);}),
        manualLinks = link.filter(function (d){ return (d.controlnature == 3);}),
        qualityOKLinks = link.filter(function (d){ return (d.controlquality == 1);}),
        qualityKOLinks = link.filter(function (d){ return (d.controlquality == 2);}),
        qualityNOLinks = link.filter(function (d){ return (d.controlquality == 3);}),
        qualityNALinks = link.filter(function (d){ return (d.controlquality == 4);});

    function restoreVariableNode(type){
      switch (type) {
        case "Variable élémentaire":
          nonCalculatedVariables
            .select("polygon")
            .style("stroke", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;})
            .style("fill", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;});
          break;
        case "Variable calculée":
          calculatedVariables
          .select("circle")
          .style("stroke", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;})
          .style("fill", function (d){d.color = colorScale_NODES(d.informationsystem); return d.color;});
          break;
      }
    }

    function restoreLink(type){
      var currentLinkCollection;
      switch (type) {
        case "Vérification automatique":
          currentLinkCollection = automaticLinks;
          break;
        case "Vérification semi-automatique":
          currentLinkCollection = semiAutomaticLinks;
          break;
        case "Vérification manuelle":
          currentLinkCollection = manualLinks;
          break;
        case "Contrôle OK":
          currentLinkCollection = qualityOKLinks;
          break;
        case "Contrôle KO":
          currentLinkCollection = qualityKOLinks;
          break;
        case "Pas de contrôle":
          currentLinkCollection = qualityNOLinks;
          break;
        case "Pas d'information":
          currentLinkCollection = qualityNALinks;
          break;
      }
      currentLinkCollection
          .style("stroke-width", function (d) { return Math.max(1, d.thickness); })
          .style("stroke-dasharray", function (d){ return (d.dash || "");})
          .style("stroke", function (d){
            var color;
            if (d.linktype == "variable") {
              color = d3.rgb(LINKS_COLORS[d.istransformed ? 4:5]);
            } else {
              color = d3.rgb(LINKS_COLORS[d.controlquality-1]);
            }
            return color;
          });
    }

    legendElementaryVariables.on("mouseenter", function (){
      nodeVariableElementary.select("polygon")
        .attr("fill", "black")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendCalculatedVariables.on("mouseenter", function (){
      nodeVariableCalculated.select("circle")
        .attr("fill", "black")
        .style("stroke", "yellow")
        .style("stroke-width", NODE_INFORMATIONSYSTEM_OUTLINE_WIDTH)
    });

    legendAutomaticLink.on("mouseenter", function (){
      automaticLinks
        .style("stroke", "yellow")
    });

    legendSemiAutomaticLink.on("mouseenter", function (){
      semiAutomaticLinks
        .style("stroke", "yellow")
    });

    legendManualLink.on("mouseenter", function (){
      manualLinks
        .style("stroke", "yellow")
    });

    legendQualityOKLink.on("mouseenter", function (){
      qualityOKLinks
        .style("stroke", "yellow")
    });

    legendQualityKOLink.on("mouseenter", function (){
      qualityKOLinks
        .style("stroke", "yellow")
    });

    legendQualityNOLink.on("mouseenter", function (){
      qualityNOLinks
        .style("stroke", "yellow")
    });

    legendQualityNALink.on("mouseenter", function (){
      qualityNALinks
        .style("stroke", "yellow")
    });

    legendElementaryVariables.on("mouseleave", function (l){restoreVariableNode("Variable élémentaire");});

    legendCalculatedVariables.on("mouseleave", function (l){restoreVariableNode("Variable calculée");});

    legendAutomaticLink.on("mouseleave", function (l){restoreLink("Vérification automatique");});

    legendSemiAutomaticLink.on("mouseleave", function (l){restoreLink("Vérification semi-automatique");});

    legendManualLink.on("mouseleave", function (l){restoreLink("Vérification manuelle");});

    legendQualityOKLink.on("mouseleave", function (l){restoreLink("Contrôle OK");});

    legendQualityKOLink.on("mouseleave", function (l){restoreLink("Contrôle KO");});

    legendQualityNOLink.on("mouseleave", function (l){restoreLink("Pas de contrôle");});

    legendQualityNALink.on("mouseleave", function (l){restoreLink("Pas d'information");});

  }

}

function launchDataVizModuleForPathView() {

  var vizData = {WIDTH : WIDTH, nbMaximumNodes: 1000};
  NodesCharacteristicsForPathView = pathViewTransform(NodesAndLinksForPathView[0], NodesAndLinksForPathView[1], vizData);
  var legendData = NodesCharacteristicsForPathView[2];
  var nodes = NodesCharacteristicsForPathView[0];
  var links = NodesCharacteristicsForPathView[1];

  createColorSets(vizData.informationSystems);

  biHiSankeyPathView = d3.Sankey_PathView();

  pathPathView = biHiSankeyPathView.link().curvature(LINK_CURVATURE);
  
  biHiSankeyPathView
    .legendData(legendData)
    .informationSystems(vizData.informationSystems)
    .nodeWidth(NODE_WIDTH)
    .nodeSpacing(NODE_SPACING)
    .linkSpacing(LINK_SPACING)
    .arrowheadScaleFactor(0.5) // Specifies that 0.5 of the link's stroke WIDTH should be allowed for the marker at the end of the link.
    .size([WIDTH, HEIGHT])
    .nodes(nodes)
    .links(links)
    .initializeNodes(function (node) {
      node.visible = true;
      node.status = "open";
    }) // initializeNodes calling 6 functions, generating temporary variables used for display 
    .layout(); // layout calls 6 functions, including one which computing default x and y positions.
  disableUserInterractions(2 * TRANSITION_DURATION);
  updatePathView();

}

