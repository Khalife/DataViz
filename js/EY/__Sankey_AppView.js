﻿// Forked from Neilos - 2015 (Github)
// A d3 javascript library/plugin for drawing bi-directional hierarchical sankey diagrams

d3.Sankey_AppView = function () {
  "use strict";

  var biHiSankey = {},
    nodes = [],
    nodeMap = {},
    parentNodes = [],
    leafNodes = [],
    links = [],
    informationSystems,
    legendData;

  function value(link) {
    return link.value;
  }

  function initializeNodeArrayProperties(node) {
    node.sourceLinks = [];
    node.rightLinks = [];
    node.targetLinks = [];
    node.leftLinks = [];
    node.connectedNodes = [];
    node.children = [];
    node.ancestors = [];
  }
  // generates the nodeMap {"1": <node1>, "2": <node2>}
  // and initializes the array properties of each node
  function initializeNodeMap() {
    nodes.forEach(function (node) {
      nodeMap[node.id] = node;
      initializeNodeArrayProperties(node);
    });
  }

  function computeLeafNodes() {
    leafNodes = nodes.filter(function (node) {
      return !node.children.length;
    });
  }

  function computeParentNodes() {
    parentNodes = nodes.filter(function (node) {
      return node.children.length;
    });
  }

  // generate hierarchical connections between parent and child nodes
  function computeNodeHierarchy() {
    var parent,
        rootNodes = [];

    nodes.filter(function(node) {return node.type == "informationsystem";}).forEach(function(rNode) {
      rootNodes.push(rNode);
      nodes.filter(function(node) {return ((node.type == "variable") && (node.informationsystem == rNode.name));}).forEach(function(node) {
        node.parent = rNode;
        rNode.children.push(node);
      });
    });

    computeLeafNodes();
    computeParentNodes();
  }

  // Populate the sourceLinks and targetLinks for each node.
  function computeNodeLinks() {
    var sourceNode, targetNode;
    links.forEach(function (link) {
      sourceNode = nodeMap[link.source] || link.source || "";
      targetNode = nodeMap[link.target] || link.target || "";
      link.id = (sourceNode.id || "") + '-' + (targetNode.id || "");
      link.source = sourceNode;
      link.target = targetNode;
      if (sourceNode.sourceLinks) {sourceNode.sourceLinks.push(link)};
      if (targetNode.targetLinks) {targetNode.targetLinks.push(link)};
    });
  }

  function visible(linkCollection) {
    return linkCollection.filter(function (link) {
      // return link.source.state === "collapsed" && link.target.state === "collapsed";
      return (link.source.visible && link.target.visible);
    });
  }

  // When child nodes are collapsed into their parents (or higher ancestors)
  // the links between the child nodes should be represented by links
  // between the containing ancestors. This function adds those extra links.
  function computeAncestorLinks() {
    // Leaf nodes are never parents of other nodes
    // Duplicate source and target links between a leaf node and another leaf node
    // and add to the leaf nodes' parents
    leafNodes.forEach(function (leafNode) {
      leafNode.sourceLinks.forEach(function (sourceLink) {
        var ancestorTargets,
        target = sourceLink.target;
        if (leafNodes.indexOf(target) >= 0) {
          ancestorTargets = target.ancestors.filter(function (tAncestor) {
            return leafNode.ancestors.indexOf(tAncestor) < 0;
          });
          ancestorTargets.forEach(function (ancestorTarget) {
            var ancestorLink = { source: leafNode,
                                target: ancestorTarget,
                                value: sourceLink.value,
                                id: leafNode.id + "-" + ancestorTarget.id };

            leafNode.sourceLinks.push(ancestorLink);
            ancestorTarget.targetLinks.push(ancestorLink);
            links.push(ancestorLink);
          });
        }
      });

      leafNode.targetLinks.forEach(function (targetLink) {
        var ancestorSources, source = targetLink.source;
        if (leafNodes.indexOf(source) >= 0) {
          ancestorSources = source.ancestors.filter(function (sAncestor) {
            return leafNode.ancestors.indexOf(sAncestor) < 0;
          });
          ancestorSources.forEach(function (ancestorSource) {
            var ancestorLink = { source: ancestorSource,
                                target: leafNode,
                                value: targetLink.value,
                                id: ancestorSource.id + "-" + leafNode.id };
            ancestorSource.sourceLinks.push(ancestorLink);
            leafNode.targetLinks.push(ancestorLink);
            links.push(ancestorLink);
          });
        }
      });
    });

    // Add links between parents (for when both parents are in collapsed state)
    parentNodes.forEach(function (parentNode) {
      parentNode.sourceLinks.forEach(function (sourceLink) {
        var ancestorTargets, target = sourceLink.target;
        if (leafNodes.indexOf(target) >= 0) {
          ancestorTargets = target.ancestors.filter(function (tAncestor) {
            return parentNode.ancestors.indexOf(tAncestor) < 0;
          });
          ancestorTargets.forEach(function (ancestorTarget) {
            var ancestorLink = { source: parentNode,
                                target: ancestorTarget,
                                value: sourceLink.value,
                                id: parentNode.id + "-" + ancestorTarget.id };

            parentNode.sourceLinks.push(ancestorLink);
            ancestorTarget.targetLinks.push(ancestorLink);
            links.push(ancestorLink);
          });
        }
      });
    });
  }

  // To reduce clutter in the diagram merge links that are from the
  // same source to the same target by creating a new link
  // with a value equal to the sum of the values of the merged links
  function mergeLinks() {
    var linkGroups = d3.nest()
      .key(function (link) { return link.source.id + "->" + link.target.id; })
      .entries(links)
      .map(function (object) { return object.values; });

    links = linkGroups.map(function (linkGroup) {
      return linkGroup.reduce(function (previousLink, currentLink) {
        return {
          "source": previousLink.source,
          "target": previousLink.target,
          "id": d3.min([previousLink.id, currentLink.id]),
          "value": previousLink.value + currentLink.value
        };
      });
    });
  }

  // Compute the value of each node by summing the associated links.
  // Compute the number of spaces between the links
  // Compute the number of source links for later decrementing
  function computeNodeValues() {
    nodes.forEach(function (node) {
      node.value = Math.max(
        d3.sum(node.leftLinks, value),
        d3.sum(node.rightLinks, value)
      );
      node.netFlow = d3.sum(visible(node.targetLinks), value) - d3.sum(visible(node.sourceLinks), value);
      node.linkSpaceCount = Math.max(Math.max(node.leftLinks.length, node.rightLinks.length) - 1, 0);
    });
  }

  function computeConnectedNodes() {
    var sourceNode, targetNode;
    links.forEach(function (link) {
      sourceNode = link.source;
      targetNode = link.target;
      if (sourceNode.connectedNodes.indexOf(targetNode) < 0) {
        sourceNode.connectedNodes.push(targetNode);
      }
      if (targetNode.connectedNodes.indexOf(sourceNode) < 0) {
        targetNode.connectedNodes.push(sourceNode);
      }
    });
  }

  function sourceAndTargetNodesWithSameX() {
    var nodeArray = [];
    links.filter(function (link) {
      return link.target.x === link.source.x;
    }).forEach(function (link) {
      if (nodeArray.indexOf(link.target) < 0) {
        nodeArray.push(link.target);
      }
    });
    return nodeArray;
  }

  function scaleNodeXPositions() {
    var minX = d3.min(nodes, function (node) { return node.x; }),
        maxX = d3.max(nodes, function (node) { return node.x; }) - minX;
    xScaleFactor = (size[0] - nodeWidth) / maxX;

    nodes.forEach(function (node) {
      node.x *= xScaleFactor;
    });
  }

  function compressInXDirection() {
    var connectedNodesXPositions,
        nodesByXPosition = d3.nest()
          .key(function (node) { return node.x; })
          .sortKeys(d3.ascending)
          .entries(nodes)
          .map(function (object) { return object.values; });

    nodesByXPosition.forEach(function (xnodes) {
      xnodes.forEach(function (node) {
        connectedNodesXPositions = node.connectedNodes.map(function (connectedNode) {
          return connectedNode.x;
        });
        // keep decrementing the x value of the node
        // unless it would have the same x value as one of its source or target nodes
        // or node.x is already 0
        while (node.x > 0 && connectedNodesXPositions.indexOf(node.x - 1) < 0) {
          node.x -= 1;
        }
      });
    });
  }

  var incrementalXindex = -1;
  function setIncrementalPosition(node, X){
    incrementalXindex = incrementalXindex + 1;
    node.x = X[incrementalXindex];
  }

  function addIS(node, list){
    list.push(node["name"]);
  }

  function computeAppViewNodeXPositions() {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 1 - Information system nodes
    var nbIsNodes = nodes.filter(function(d){ if (d.type  == "informationsystem") { return true; } }).length;
    var X_IS = [], incrementalX = WIDTH_APPVIEW / (nbIsNodes + 3);
    var incrementalXIndex = 1, i = 0;
    nodes.filter(function (d){ if (d.type  == "informationsystem") { return true; } }).forEach( function (d) { X_IS.push(incrementalXIndex*incrementalX - HORIZONTAL_OFFSET_APPVIEW); incrementalXIndex = incrementalXIndex + 1;} );
    var remainingNodes = nodes.filter(function (d){ if (d.type  == "informationsystem") { return true; } }),
        nextNodes,
        x = X_IS[0],
        addToNextNodes = function (link) {
          if ( nextNodes.indexOf(link.target) < 0 &&  link.target.type === "informationsystem" ) {
            nextNodes.push(link.target);
          }
        },
        setValues = function (node) {
          node.x = x;
          node.width = informationSystemNodeWidth;
          node.height = informationSystemNodeHeigth;
          node.sourceLinks.forEach(addToNextNodes, node);
        };
    while (remainingNodes.length) {
      nextNodes = [];
      remainingNodes.forEach(setValues);
      remainingNodes = nextNodes;
      // remainingNodes = sourceAndTargetNodesWithSameX();
      // console.log("End of information systems placement");
      i = i + 1;
      x = X_IS[i];
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 2 - Variable nodes  
    // List all information systems 
    var informationSystems = [];
    nodes.filter(function (d){ if (d.type  == "informationsystem") { return true; } }).forEach( function (d) { informationSystems.push(d.name);});
    var X_variable;
    // Make a loop on each IS dedicated variables
    for (var i = 0; i < informationSystems.length; i ++){
      var isConsidered = informationSystems[i];
      // define start from information system variables positions
      X_variable = [];
      var nbVariablesIS = nodes.filter(function (d){ if ( (d.type == "variable" ) && ( d.informationsystem == isConsidered ) ) { return true; } }).length,
      margin = incrementalX / 10, incrementalXIndex = 0, j = 0,
      start = nodes.filter( function (d){ return d.name === isConsidered;})[0].x - 0*margin,
      end = start + informationSystemNodeWidth + margin,
      incrementalXvariable = (end - start)/nbVariablesIS,
      incrementalVariableindex = 0;
      var remainingNodes = nodes.filter(function (d){ if ( ( d.type  == "variable" ) && ( d.informationsystem == isConsidered ) ) { return true; } });
      for (var n of remainingNodes){
        X_variable = start + incrementalVariableindex*incrementalXvariable; 
        n.x = X_variable;
        n.width = nodeWidth;
        n.height = nodeHeight;
        incrementalVariableindex = incrementalVariableindex + 1
      }
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }

  function computeLeftAndRightLinks() {
    var source, target;
    nodes.forEach(function (node) {
      node.rightLinks = [];
      node.leftLinks = [];
    });
    links.forEach(function (link) {
      source = link.source;
      target = link.target;
      if (source.x < target.x) {
        source.rightLinks.push(link);
        target.leftLinks.push(link);
        link.direction = 1;
      } else {
        if (source.leftLinks) {source.leftLinks.push(link)};
        if (target.rightLinks) {target.rightLinks.push(link)};
        link.direction = -1;
      }
    });
  }

  function adjustTop(adjustment) {
    nodes.forEach(function (node) {
      node.y -= adjustment;
    });
  }

  function computeAppViewNodeYPositions() {
    var minY,
        alpha,
        nodesByXPosition = d3.nest()
          .key(function (node) { return node.x; })
          .sortKeys(d3.ascending)
          .entries(nodes)
          .map(function (object) { return object.values; });

    function calculateYScaleFactor() {
      var linkSpacesCount, nodeValueSum, discretionaryY;
      yScaleFactor = d3.min(nodesByXPosition, function (nodes) {
        linkSpacesCount = d3.sum(nodes, function (node) {
          return node.linkSpaceCount;
        });
        nodeValueSum = d3.sum(nodes, function (node) {
          return node.value;
        });
        discretionaryY = (size[1]
                        - (nodes.length - 1) * nodeSpacing
                        - linkSpacesCount * linkSpacing);

        return  discretionaryY / nodeValueSum;
      });

      // Fat links are those with lengths less than about 4 times their heights
      // Fat links don't bend well
      // Test that yScaleFactor is not so big that it causes "fat" links; adjust yScaleFactor accordingly
      links.forEach(function (link) {
        var linkLength = Math.abs(link.source.x - link.target.x),
            linkHeight = link.value * yScaleFactor;
        if (linkLength / linkHeight < 4) {
          yScaleFactor = 0.25 * linkLength / link.value;
        }
      });
    }

    function initializeNodeYPosition() {
      nodes.filter(function (d){ if (d.type === "informationsystem" ) { return true;} }).forEach(function (node, i){
        node.y = VERTICAL_ISNODE_INCREMENT + VERTICAL_ISNODE_INCREMENT_FACTOR*i;
        if(node.isoutputnode) { node.y += NODE_INFORMATIONSYSTEM_HEIGHT/2 };
      });
      var nbVariablesIS;
      for (var i = 0; i < informationSystems.length; i++){
        var concernedVariables = nodes.filter(function (d){ if (  d.type === "variable"   ) { return true;} }).filter(function (d){ if (  d.informationsystem === informationSystems[i] ) { return true;} });
        nbVariablesIS = concernedVariables.length;
        concernedVariables.forEach(function (node, index){ node.y = VERTICAL_OFFSET_APPVIEW + nbVariablesIS*nodeWidth*(index/VERTICAL_NODE_INCREMENT_FACTOR);});
      }
    }

    function relaxLeftToRight(alpha) {
      function weightedSource(link) {
        return center(link.source) * link.value;
      }

      nodesByXPosition.forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.rightLinks.length) {
            var y = d3.sum(node.rightLinks, weightedSource) / d3.sum(node.rightLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });
    }

    function relaxRightToLeft(alpha) {
      function weightedTarget(link) {
        return center(link.target) * link.value;
      }

      nodesByXPosition.slice().reverse().forEach(function (nodes) {
        nodes.forEach(function (node) {
          if (node.leftLinks.length) {
            var y = d3.sum(node.leftLinks, weightedTarget) / d3.sum(node.leftLinks, value);
            node.y += (y - center(node)) * alpha;
          }
        });
      });
    }

    function resolveCollisions() {
      function ascendingYPosition(a, b) {
        return a.y - b.y;
      }

      nodesByXPosition.forEach(function (nodes) {
        var node,
            dy,
            y0 = 0,
            n = nodes.length,
            i;

        nodes.sort(ascendingYPosition);

        // Push any overlapping nodes down.
        for (i = 0; i < n; ++i) {
          node = nodes[i];
          dy = y0 - node.y;
          if (dy > 0) {
            node.y += dy;
          }
          y0 = node.y + node.heightAllowance + nodeSpacing;
        }

        // If the bottommost node goes outside the bounds, push it back up.
        dy = y0 - nodeSpacing - size[1];
        if (dy > 0) {
          node.y -= dy;
          y0 = node.y;

          // Push any overlapping nodes back up.
          for (i = n - 2; i >= 0; --i) {
            node = nodes[i];
            dy = node.y + node.heightAllowance + nodeSpacing - y0;
            if (dy > 0) {
              node.y -= dy;
            }
            y0 = node.y;
          }
        }
      });
    }

    initializeNodeYPosition();
    minY = d3.min(nodes, function (node) { return node.y; });
    adjustTop(minY);
  }

  function calculateLinkThickness() {
    links.forEach(function (link) {
      //link.thickness = link.value * yScaleFactor;
      if (link.source.type == "informationsystem" && link.controlnature == 1){
        link.thickness = 10;
      }
      else if (link.source.type == "variable") {
        link.thickness = 1;
      } else {
        link.thickness = 4;
      } ;

    });
  }

  function calculateLinkDash() {
    links.forEach(function (link) {
      //link.thickness = link.value * yScaleFactor;
      if (link.source.type == "informationsystem" && link.controlnature == 3){
        link.dash = "10,10";
      }
    });
  }

  function computeLinkYPositions() {

    function ascendingLeftNodeYPosition(a, b) {
      var aLeftNode = (a.direction > 0) ? a.source : a.target,
          bLeftNode = (b.direction > 0) ? b.source : b.target;
      return aLeftNode.y - bLeftNode.y;
    }

    function ascendingRightNodeYPosition(a, b) {
      var aRightNode = (a.direction > 0) ? a.target : a.source,
          bRightNode = (b.direction > 0) ? b.target : b.source;
      return aRightNode.y - bRightNode.y;
    }

    nodes.forEach(function (node) {
      node.rightLinks.sort(ascendingRightNodeYPosition);
      node.leftLinks.sort(ascendingLeftNodeYPosition);
    });

    nodes.forEach(function (node){
      var rightY = 0, leftY = 0;
      // Remark rightY and leftY can be used for x also.

      node.rightLinks.forEach(function (link) {
        if (link.direction > 0) {link.sourceY = rightY;} else {
          link.targetY = rightY;
          if(link.target.isoutputnode) { link.targetY -= NODE_INFORMATIONSYSTEM_HEIGHT/2 };
        }
      });

      node.leftLinks.forEach(function (link) {
        if (link.direction < 0) {link.sourceY = leftY;} else {
          link.targetY = leftY;
          if(link.target.isoutputnode) { link.targetY -= NODE_INFORMATIONSYSTEM_HEIGHT/2 };
        }
      });

    });
  }


  biHiSankey.arrowheadScaleFactor = function (_) {
    if (!arguments.length) { return arrowheadScaleFactor; }
    arrowheadScaleFactor = +_;
    return biHiSankey;
  };

  biHiSankey.collapsedNodes = function () {
    return nodes.filter(function (node) { return node.state === "collapsed"; });
  };

  biHiSankey.visibleNodes = function () {
    return nodes.filter(function (node) { return node.visible });
  };

  biHiSankey.connected = function (nodeA, nodeB) {
    return nodeA.connectedNodes.indexOf(nodeB) >= 0;
  };

  biHiSankey.expandedNodes = function () {
    return nodes.filter(function (node) { return node.state === "expanded"; });
  };

  biHiSankey.layout = function () {
    computeAppViewNodeXPositions();
    computeAppViewNodeYPositions();
    computeLeftAndRightLinks();
    computeNodeValues();
    computeLinkYPositions();
    calculateLinkThickness();
    calculateLinkDash();
    return biHiSankey;
  };

  biHiSankey.relayout = function () {
    computeLeftAndRightLinks();
    computeNodeValues();
    computeLinkYPositions();
    return biHiSankey;
  };

  biHiSankey.link = function () {
    var curvature = defaultLinkCurvature;

    function leftToRightLink(link) {
      // The link is necessarily a link between information systems
      // We suppose there is only one connection . 
      var arrowHeadLength = link.thickness * arrowheadScaleFactor,
          straightSectionLength = (3 * link.thickness / 4) - arrowHeadLength,
          // Version where links are connected to the side of the node
          x0 = link.source.x + link.source.width,
          x1 = x0 + arrowHeadLength / 2,
          x4 = link.target.x - straightSectionLength - arrowHeadLength,
          xi = d3.interpolateNumber(x0, x4),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          // y0 = link.source.y + link.sourceY + link.thickness / 2,
          y0 = link.source.y + link.source.height / 2,
          // y1 = link.target.y + link.targetY + link.thickness / 2;
          y1 = link.target.y + link.target.height / 2 - (link.target.isoutputnode ? NODE_INFORMATIONSYSTEM_HEIGHT/2 : 0);

      return "M" + x0 + "," + y0
           + "L" + x1 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x3 + "," + y1
           + " " + x4 + "," + y1
           + "L" + (x4 + straightSectionLength) + "," + y1;
    }

    function rightToLeftLink(link) {
      // The link is necessarily a link between information systems
      var arrowHeadLength = link.thickness * arrowheadScaleFactor,
          straightSectionLength = link.thickness / 4,
          x0 = link.source.x ,
          x1 = x0 - arrowHeadLength / 2,
          x4 = link.target.x + link.target.width + straightSectionLength + arrowHeadLength,
          xi = d3.interpolateNumber(x0, x4),
          x2 = xi(curvature),
          x3 = xi(1 - curvature),
          // y0 = link.source.y + link.sourceY + link.thickness / 2,
          y0 = link.source.y + link.source.height/ 2,
          y1 = link.target.y + link.target.height / 2;

      return "M" + x0 + "," + y0
           + "L" + x1 + "," + y0
           + "C" + x2 + "," + y0
           + " " + x3 + "," + y1
           + " " + x4 + "," + y1
           + "L" + (x4 - straightSectionLength) + "," + y1;
    }

    function bottomToTop(link){
      // The link is necessarily a link between variables and information systems
      // Version where links are connected to the bottom or above the node
      var arrowHeadLength = link.thickness * arrowheadScaleFactor,
          straightSectionLength = link.thickness / 4,

      y0 = link.source.y - link.source.width / 2,
      y1 = y0 - arrowHeadLength / 2,
      //y4 = link.target.y + straightSectionLength + arrowHeadLength,
      y4 = link.target.y  + link.target.height + arrowHeadLength,
      x0 = link.source.x ,
      // x1 = link.target.x + link.targetY + link.thickness / 2;
      x1 = Math.max(Math.min(link.source.x, link.target.x + link.target.width),link.target.x + link.targetY + link.thickness / 2);

      return "M" + x0 + "," + y0
           + "L" + x1  + "," + y4;
    }

    function topToBottom(link){
      // The link is necessarily a link between variables and information systems
      // Version where links are connected to the bottom or above the node
      var arrowHeadLength = link.thickness * arrowheadScaleFactor,
          straightSectionLength = link.thickness / 4,

      x0 = link.source.x + link.source.width / 2,
      y0 = link.source.y + link.source.height,
      x1 = x0 + 2,
      y1 = y0  + arrowHeadLength / 2,
      x4 = link.target.x + link.target.width / 2,
      xi = d3.interpolateNumber(x0, x4),
      x2 = xi(curvature),
      x3 = xi(1 - curvature),
      y2 = link.target.y - arrowHeadLength - straightSectionLength,
      x5 = x4;

      return "M" + x0 + "," + y0
           // + "L" + x1 + "," + y0
           // + "C" + x2 + "," + y0
           // + " " + x3 + "," + y1
           // + " " + x4 + "," + y1
           + "L" + x5  + "," + y2;
    }

    function link(d){
      // debugger;
      if ( d.view == "app"){
        if (d.type == 1){
          // then link from variable to app
          //if (d.source.y < d.target.y){
          //  return headToBottom(d);
          //}
        return bottomToTop(d);
        }

        else{
          if (d.source.x < d.target.x) {
            return leftToRightLink(d);
          }
            return rightToLeftLink(d);
        }
      }
    }

    link.curvature = function (_) {
      if (!arguments.length) { return curvature; }
      curvature = +_;
      return link;
    };

    return link;
  };

  biHiSankey.links = function (_) {
    if (!arguments.length) { return links; }
    links = _.filter(function (link) {
      return link.source !== link.target; // filter out links that go nowhere
    });
    return biHiSankey;
  };

  biHiSankey.linkSpacing = function (_) {
    if (!arguments.length) { return linkSpacing; }
    linkSpacing = +_;
    return biHiSankey;
  };

  biHiSankey.nodes = function (_) {
    if (!arguments.length) { return nodes; }
    nodes = _;
    return biHiSankey;
  };

  biHiSankey.nodeWidth = function (_) {
    if (!arguments.length) { return nodeWidth; }
    nodeWidth = +_;
    return biHiSankey;
  };

  biHiSankey.nodeSpacing = function (_) {
    if (!arguments.length) { return nodeSpacing; }
    nodeSpacing = +_;
    return biHiSankey;
  };

  biHiSankey.size = function (_) {
    if (!arguments.length) { return size; }
    size = _;
    return biHiSankey;
  };

  biHiSankey.visibleLinks = function () {
    return visible(links);
  };

  biHiSankey.initializeNodes = function (callback) {
    initializeNodeMap();
    computeNodeHierarchy();
    computeNodeLinks();
    mergeLinks();
    computeConnectedNodes();
    nodes.forEach(callback);
    return biHiSankey;
  };

  biHiSankey.informationSystems = function (_) {
    if (!arguments.length){ return informationSystems; }
    informationSystems = _;
    return biHiSankey;
  };

  biHiSankey.legendData = function (_){
    if (!arguments.length){ return legendData; }
    legendData = _;
    return biHiSankey;
  }

  return biHiSankey;
};