// The projects each theme's Funded Projects page lists, as the group's own pages give them (the texts are kept as written there,
// with their spelling mistakes corrected). `code` is the project's acronym - a few projects are listed without one; `description` is its full
// `url` is the project's own website, where the link the group's old page gave still leads to the project (many of those
// sites have since gone, or been taken over by something else, and are left out); a card or list item with a `url` is a link.
// name - a few have none (ARROWHEAD's official name is just "Arrowhead"; its line is the objective as the ARTEMIS-JU / CORDIS record states it). The Industry 4.0 page lists no ended projects. `referTo` names the people to turn to about the theme's
// projects (the page's "Refer to" list; their roles are in peopleRoles.js). The counts in the page header come from these lists
// (projectStats.js).
const FUNDED_PROJECTS = {
  'vlsi-cad': {
    ongoing: [
      { code: 'R2POWER300', description: 'PREPARING R2 EXTENSIONS TO 300mm FOR BCD SMART POWER' },
      { code: 'ARROWHEAD', description: 'COOPERATIVE AUTOMATION BASED ON THE INTERNET OF THINGS AND SERVICE-ORIENTED ARCHITECTURES', url: 'https://arrowhead.eu/' },
      { code: 'Lab4MEMS II', description: 'MICRO-OPTICAL MEMS, MICRO-MIRRORS AND PICO-PROJECTORS' },
      { code: 'R3POWERUP', description: '300mm Pilot Line for Smart Power and Power Discretes', url: 'https://artemis-ia.eu/project/135-R3-PowerUP.html' },
    ],
    ended: [
      { code: 'CONTREX', description: 'DESIGN OF EMBEDDED MIXED-CRITICALITY CONTROL SYSTEMS UNDER CONSIDERATION OF EXTRA-FUNCTIONAL PROPERTIES' },
      { code: 'Lab4MEMS II', description: 'MICRO-OPTICAL MEMS, MICRO-MIRRORS AND PICO-PROJECTORS' },
      { code: 'THOR', description: "TORINO-PIEMONTE. TECNOLOGIE E SISTEMI AMBIENTALI PER LA MOBILITA' ELETTRICA" },
      { code: 'SMAC', description: 'SMART SYSTEMS CO-DESIGN' },
      { code: 'MOTORBRAIN', description: 'ELECTRIC VEHICLE INTEGRATED POWER TRAIN' },
      { code: 'DEMANES', description: 'DESIGN, MONITORING AND OPERATION OF ADAPTIVE NETWORKED' },
      { code: 'VeteSS', description: 'VERIFICATION AND TESTING TO SUPPORT FUNCTIONAL SAFETY STANDARDS' },
      { code: 'IDEAS', description: 'INTERACTIVE POWER DEVICES FOR EFFICIENCY IN AUTOMOTIVE WITH INCREASED RELIABILITY AND SAFETY' },
      { code: 'Lab4MEMS', description: 'LAB FAB FOR SMART SENSORS AND ACTUATORS MEMS' },
      { code: 'ERG', description: 'ENERGY FOR GREEN SOCIETY: FROM SUSTAINABLE HARVESTING TO SMART DISTRIBUTION' },
      { code: 'THERMINATOR', description: 'MODELLING, CONTROL AND MANAGEMENT OF THERMAL EFFECTS IN ELECTRICS' },
      { code: 'POLLUX', description: 'PROCESS ORIENTED ELECTRICAL CONTROL UNITS FOR ELECTRICAL VEHICLES DEVELOPED ON A MULTI-SYSTEM REAL-TIME EMBEDDED PLATFORM' },
      { code: 'MODERN', description: 'MODEL AND DESIGN OF RELIABLE PROCESS VARIATION-AWARE NANOELECTRONIC DEVICES, CIRCUITS AND SYSTEMS' },
      { code: 'SCALOPES', description: 'SCALABLE LOW POWER EMBEDDED PLATFORMS' },
      { code: 'END', description: 'MODELS, SOLUTIONS, METHODS AND TOOLS FOR ENERGY-AWARE DESIGN' },
      { code: 'SCORE', description: 'SUPERVISIONE, CONTROLLO E OTTIMIZZAZIONE DELLA PRODUZIONE DI ENERGIA RINNOVABILE' },
      { code: 'SMECY', description: 'SMART MULTICORE EMBEDDED SYSTEMS' },
      { code: 'TOUCHMORE', description: 'AUTOMATIC CUSTOMIZABLE TOOL CHAIN FOR HETEROGENEOUS MULTICORE SOFTWARE DEVELOPMENT' },
      { code: 'SIMEBUS', description: "SISTEMI MECCATRONICI PER L'EFFICIENZA ENERGETICA NEI BUS" },
      { code: 'COMPLEX', description: 'CODESIGN AND POWER MANAGEMENT IN PLATFORM-BASED DESIGN SPACE EXPLORATION' },
      { code: 'NANO-SLEEP', description: 'DESIGN METHODS AND TOOLS FOR LEAKAGE POWER REDUCTION IN NANOCMOS CIRCUITS' },
      { code: 'DAMASCO', description: 'DATA ACQUISITION AND MANAGEMENT IN A SENSING AND COMMUNICATING ENVIRONMENT' },
      { code: 'MAP2', description: 'MICRO-ARCHITECTURAL POWER MANAGEMENT: METHODS, ALGORITHMS AND PROTOTYPE TOOLS' },
      { description: 'METODI E STRUMENTI CAD PER LA PROGETTAZIONE DELLA GERARCHIA DI MEMORIA IN SISTEMI MULTIPROCESSORE REALIZZATI SU SINGOLO CHIP' },
      { code: 'CLEAN', description: 'CONTROLLING LEAKAGE POWER IN NANOCMOS SOCS' },
      { description: 'TECNICHE DI PROGETTO DI SINTESI INTEGRATI SU SINGOLO CHIP PER APPLICAZIONI MULTIMEDIALI SU RETI WIRELESS' },
      { description: 'ALGORITMI E ARCHITETTURE HARDWARE PER LA RIDUZIONE DEL CONSUMO ENERGETICO NEI SISTEMI EMBEDDED BASATI SULLA COMPRESSIONE DELLE INFORMAZIONI' },
      { code: 'INTRALED', description: 'INDUSTRY-DRIVEN TRAINING FOR LOW-POWER EUROPEAN DESIGNERS' },
      { code: 'MARLOW', description: 'A CENTRAL MARKET PLACE FOR DISSEMINATION OF LOW-POWER MICRO-ELECTRONICS DESIGN KNOWLEDGE' },
      { code: 'POET', description: 'POWER OPTIMISATION FOR EMBEDDED SYSTEMS' },
      { code: 'EASY', description: "ENERGY AWARE SYSTEM-ON-CHIP DESIGN OF THE 'HIPERLAN/2' STANDARD" },
    ],
    referTo: ['Alberto Macii', 'Andrea Calimera', 'Massimo Poncino', 'Sara Vinco'],
  },
  bioinformatics: {
    ongoing: [
      { code: 'HBP', description: 'HUMAN BRAIN PROJECT', url: 'https://www.humanbrainproject.eu/' },
      { description: 'PERSONALIZED DIAGNOSIS AND NOVEL THERAPEUTIC TARGETS FOR PEDIATRIC AND ADULT ACUTE LYMPHOBLASTIC LEUKEMIA' },
      { code: 'DeNeCor', description: 'DEVICES FOR NEUROCONTROL AND NEUROREHABILITATION' },
      { description: 'RICERCA CORRENTE 2012 (Ministero della Salute)' },
    ],
    ended: [
      { code: 'CSI', description: 'CENTRAL NERVOUS SYSTEM IMAGING' },
      { description: 'CLINICAL-MOLECULAR CORRELATION IN LUNG CANCER WITH ALTERATION OF THE EPIDERMAL GROWTH FACTOR' },
    ],
    referTo: ['Santa Di Cataldo'],
  },
  'smart-city': {
    ongoing: [
      { code: 'EEB', description: 'EDIFICI A ZERO CONSUMO ENERGETICO IN DISTRETTI URBANI INTELLIGENTI' },
      { code: 'ITS', description: 'INTELLIGENT TRANSPORTATION SYSTEM' },
      { code: 'S[m2]ART', description: "SMART METRO QUADRO: GUARDANDO LA CITTA' METRO PER METRO" },
    ],
    ended: [
      { code: 'FLEXMETER', description: 'FLEXIBLE SMART METERING FOR MULTIPLE ENERGY VECTORS WITH ACTIVE PROSUMERS' },
      { code: 'DIMMER', description: 'DISTRICT INFORMATION MODELING AND MANAGEMENT FOR ENERGY REDUCTION' },
      { code: 'TRIBUTE', description: 'TAKE THE ENERGY BILL BACK TO THE PROMISED BUILDING PERFORMANCE' },
      { code: 'READY4SMARTCITIES', description: 'ICT ROADMAP AND DATA INTEROPERABILITY FOR ENERGY SYSTEM IN SMART CITIES' },
      { code: 'EDEN', description: 'ENERGY DATA ENGAGEMENT' },
      { code: 'E2SG', description: 'ENERGY TO SMART GRID' },
      { code: 'SEEMPUBS', description: 'SMART ENERGY EFFICIENT MIDDLEWARE FOR PUBLIC SPACES' },
      { code: 'IOE', description: 'INTERNET OF ENERGY FOR ELECTRIC MOBILITY', url: 'https://www.artemis-ioe.eu/' },
    ],
    referTo: ['Alberto Macii', 'Edoardo Patti', 'Lorenzo Bottaccioli'],
  },
  'industry-4-0': {
    ongoing: [
      { code: 'STAMP', description: "Sviluppo Tecnologico dell'Additive Manufacturing in Piemonte" },
      { code: 'DISLOMAN', description: 'Dynamic Integrated ShopfLoor operation Management for Industry 4.0' },
      { code: 'MANUELA', description: 'Additive Manufacturing using Metal Pilot Line' },
      { code: 'SERENA', description: 'VerSatilE pREdictive mainteNAnce platform enabling remote diagnostics and factory monitoring', url: 'https://www.serena-project.eu/' },
      { code: 'AMABLE', description: 'AdditiveManufacturABLE', url: 'https://www.amable.eu/' },
      { code: 'FCA-POLITO', description: 'A virtual and learning plant model for energy efficiency assessment and interactive augmented visualization and prototyping' },
      { code: 'MADEin4', description: 'Metrology Advances for Digitized ECS Industry 4.0' },
    ],
    ended: [],
    referTo: ['Edoardo Patti', 'Lorenzo Bottaccioli', 'Massimo Poncino', 'Santa Di Cataldo'],
  },
}

export const fundedProjectsFor = (slug) => FUNDED_PROJECTS[slug] ?? FUNDED_PROJECTS['vlsi-cad']
