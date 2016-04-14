// File containing constants 
var NodesAndLinksForAppView,NodesAndLinksForPathView, dataNames = [];
// Limits of parsing (line numbers) :
var begin = 11, end = 58, LEGEND_X_ANCHOR = 1050, LEGEND_Y_ANCHOR = -20;

var OPACITY = {
    NODE_DEFAULT: 1,
    NODE_FADED: 0.05,
    NODE_HIGHLIGHT: 0.8,
    LINK_DEFAULT: 1,
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
    RIGHT: 0.5*OUTER_MARGIN,
    BOTTOM: 0.5*OUTER_MARGIN,
    LEFT: 0.5*OUTER_MARGIN
  },
  TOOLTIP_LEFT_SHIFT = 70,
  TRANSITION_DURATION = 200,
  TRANSITION_DELAY = 500,
  HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM,
  // WIDTH = 960 - MARGIN.LEFT - MARGIN.RIGHT,
  WIDTH = 1300 - MARGIN.LEFT - MARGIN.RIGHT,
  LAYOUT_INTERATIONS = 32,
  REFRESH_INTERVAL = 7000,
  nodeWidth = 24,
  nodeHeight = 40,
  nodeSpacing = 8,
  linkSpacing = 5,
  xScaleFactor = 1,
  yScaleFactor = 1,
  defaultLinkCurvature = 1,
  size = [1, 1],
  arrowheadScaleFactor = 0, // Specifies the proportion of a link's stroke width to be allowed for the marker at the end of the link. // default to one pixel by one pixel
  informationSystemNodeWidth = 80,
  informationSystemNodeHeigth = 40,
  VERTICAL_ISNODE_INCREMENT = -100,
  VERTICAL_ISNODE_INCREMENT_FACTOR = 20,
  VERTICAL_NODE_INCREMENT_FACTOR = 3.5,
  VERTICAL_OFFSET_APPVIEW = 70,
  HORIZONTAL_OFFSET_APPVIEW = 0,
  VERTICAL_OFFSET_PATHVIEW = -0,
  HORIZONTAL_OFFSET_PATHVIEW = 150,
  VERTICAL_INCREMENT_PATHVIEW = 40,
  VERTICAL_INCREMENT = 40,
  WIDTH_APPVIEW = 1300,
  WIDTH_PATHVIEW = 1300;

