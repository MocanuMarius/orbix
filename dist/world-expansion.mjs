// Each location has an authored flight rhythm and matching scene identity.
export const EXTRA_LEVELS = [
 {id:'ruins-mill',terrain:'ruins',variant:3,name:'Drowned Mill',scene:'mill',materialScene:'aqueduct',signature:'Waterwheel ruins · low channels · rising spillway',motif:'spillway',ink:'#92b5ae'},
 {id:'ruins-cloister',terrain:'ruins',variant:4,name:'Moonlit Cloister',scene:'cloister',materialScene:'ossuary',signature:'Broken colonnades · roof gaps · courtyard steps',motif:'colonnade',ink:'#c2b092'},
 {id:'canopy-spores',terrain:'canopy',variant:3,name:'Sporelight Glade',scene:'spores',materialScene:'elder',signature:'Giant mushrooms · low caps · open glades',motif:'mushroom',ink:'#b4a1c5'},
 {id:'canopy-mangrove',terrain:'canopy',variant:4,name:'Drowned Mangrove',scene:'mangrove',materialScene:'fen',signature:'Stilt roots · sunken huts · weaving channels',motif:'stilt-root',ink:'#88b6a9'},
 {id:'storm-causeway',terrain:'storm',variant:3,name:'Cloudbreak Causeway',scene:'causeway',materialScene:'chasm',signature:'Broken bridges · open sky · high landings',motif:'bridge',ink:'#c2c6b6'},
 {id:'storm-basalt',terrain:'storm',variant:4,name:'Basalt Organ',scene:'basalt',materialScene:'ridge',signature:'Column cliffs · stepped shelves · echo chambers',motif:'column',ink:'#a5a2be'},
];
export const EXTRA_COURSES={
 'ruins-mill':{name:'The spillway climb',entry:[[.50,260,140,340,'floor','terrace'],[.56,280,160,350,'roof','underpass']],hard:[[.59,166,140,310,'both','underpass'],[.54,156,120,290,'both','shelf'],[.47,150,132,320,'both','terrace'],[.42,190,150,350,'floor','landing']],rest:[[.44,300,155,380,'floor','terrace'],[.50,320,125,360,'roof','shelf'],[.54,292,170,390,'floor','landing']]},
 'ruins-cloister':{name:'The broken colonnade',entry:[[.50,260,144,350,'floor','shelf'],[.45,288,128,360,'roof','vault']],hard:[[.44,164,120,300,'both','vault'],[.50,178,148,335,'floor','shelf'],[.56,156,125,305,'both','vault'],[.50,176,140,330,'roof','shelf']],rest:[[.48,304,130,370,'roof','shelf'],[.43,310,180,390,'floor','terrace'],[.49,320,125,360,'floor','shelf']]},
 'canopy-spores':{name:'The mushroom canopy',entry:[[.50,272,140,350,'floor','root'],[.55,300,175,380,'roof','hanging']],hard:[[.55,182,165,330,'roof','hanging'],[.49,156,120,300,'both','root'],[.43,196,140,335,'floor','hollow']],rest:[[.46,320,172,390,'floor','hollow'],[.53,310,160,390,'roof','hanging'],[.50,330,130,375,'floor','root']]},
 'canopy-mangrove':{name:'The stilt-root weave',entry:[[.50,264,142,340,'floor','root'],[.45,292,158,365,'both','root']],hard:[[.44,170,140,310,'both','root'],[.51,160,145,310,'both','hanging'],[.57,180,150,330,'floor','hollow'],[.51,162,135,320,'both','root']],rest:[[.52,318,175,390,'floor','hollow'],[.45,300,130,370,'roof','hanging'],[.49,322,150,380,'floor','root']]},
 'storm-causeway':{name:'The broken sky bridge',entry:[[.50,278,145,355,'floor','cliff'],[.44,310,130,395,'floor','shelf']],hard:[[.43,210,145,350,'floor','landing'],[.50,290,115,410,'roof','overhang'],[.56,174,160,325,'floor','landing'],[.49,158,130,330,'both','shelf']],rest:[[.46,330,170,410,'floor','cliff'],[.52,320,120,390,'floor','shelf'],[.48,310,145,390,'roof','overhang']]},
 'storm-basalt':{name:'The organ stair',entry:[[.50,264,140,340,'floor','shelf'],[.55,286,155,355,'both','vault']],hard:[[.57,176,130,300,'floor','shelf'],[.50,158,115,300,'both','shelf'],[.43,152,130,310,'both','vault']],rest:[[.44,312,145,380,'floor','shelf'],[.51,300,160,380,'both','vault'],[.56,326,140,390,'floor','terrace']]},
};
export const LOCATION_PALETTES={
 mill:{sky:['#0c181b','#16282b','#293d3c'],stone:'#344740',face:'#4d5b50',grain:'#687b65',rim:'#9cae91'},
 cloister:{sky:['#18161d','#29232f','#393341'],stone:'#49423d',face:'#63594a',grain:'#827361',rim:'#b8a58a'},
 spores:{sky:['#14121d','#252035','#353247'],stone:'#39333c',face:'#53475b',grain:'#78627b',rim:'#af93b2'},
 mangrove:{sky:['#0b1a1a','#16332e','#29453c'],stone:'#2c3e31',face:'#435f45',grain:'#628066',rim:'#95b28a'},
 causeway:{sky:['#121e2b','#263c4c','#44566a'],stone:'#45505b',face:'#626c72',grain:'#819397',rim:'#b5c3ba'},
 basalt:{sky:['#14151d','#242936','#3b4051'],stone:'#32323b',face:'#474758',grain:'#6b6479',rim:'#a8a0ba'},
};
export const LOCATION_CHALLENGE_NAMES={
 'ruins-mill':{'fuel-pocket':'Waterwheel Well','draft-crossing':'Spillway Crosswind','dark-cave':'Flooded Millrace'},
 'ruins-cloister':{'fuel-pocket':'Cloister Alcove','draft-crossing':'Open Courtyard','dark-cave':'Unlit Colonnade'},
 'canopy-spores':{'fuel-pocket':'Dewcap Hollow','draft-crossing':'Spore Glade Draft','dark-cave':'Mushroom Underpass'},
 'canopy-mangrove':{'fuel-pocket':'Stilt-root Pool','draft-crossing':'Marsh Channel','dark-cave':'Drowned Root Tunnel'},
 'storm-causeway':{'fuel-pocket':'Bridgekeeper Ledge','draft-crossing':'Broken Span','dark-cave':'Bridge Abutment'},
 'storm-basalt':{'fuel-pocket':'Column Shelf','draft-crossing':'Organ Wind Gap','dark-cave':'Echo Chamber'},
};
